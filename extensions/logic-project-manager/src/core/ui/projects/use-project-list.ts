import { useCallback, useEffect, useRef, useState } from "react";
import fs from "node:fs";
import type { Project } from "@/core/projects/types";
import { readProjectListCache, writeProjectListCache } from "@/core/projects/list-cache";
import { applyProjectMetadata, reloadProjectData } from "@/core/ui/shared/reload-projects";
import { refreshDocFile } from "@/core/ui/hooks/use-doc-watcher";
import { showFailure } from "@/core/ui/shared/toast";
import { strings } from "@/strings";
import { LOG_PREFIX } from "@/core/log";
import { shouldCommitProjects, shouldShowLoadingOnScan, shouldWriteListCache } from "./project-list-state";
import { createReloadQueue } from "./reload-queue";

/** 项目列表：冷启动缓存、扫描、Finder 同步、目录监听、写回缓存。
 *  两个回调用 ref 传：它们依赖的 hook 要等这里返回 projects 才能调用，直接传会绕成环。 */
export function useProjectList(input: {
  root: string;
  trashingIds: Set<string>;
  /** 扫描并套好元数据之后调用，参数是扫描出的原始列表。 */
  onAppliedRef: { current: (base: Project[]) => void };
  /** 首次加载完、加载状态关掉之后调用，参数是残留数据的 id。 */
  onStartupLoadedRef: { current: (orphans: string[]) => void | Promise<void> };
}): {
  projects: Project[];
  isLoading: boolean;
  orphanIds: string[];
  reloadProjects: () => Promise<string[]>;
  applyMetadata: () => Promise<void>;
  refreshDoc: (file: string) => void;
  getProjects: () => Project[];
} {
  const { root, trashingIds, onAppliedRef, onStartupLoadedRef } = input;

  // 冷启动先显示上次读到的列表，扫描完再替换。
  const [initialCache] = useState(() => readProjectListCache(root));
  const [projects, setProjects] = useState<Project[]>(() => initialCache ?? []);
  // 读到缓存时先不显示加载：扫描完发现没变化就什么都不做。
  const [isLoading, setIsLoading] = useState(initialCache === undefined);
  // 静默启动刷新：只在读到缓存的那一次刷新里为 true，结束后复位。
  const silentStartupRef = useRef(initialCache !== undefined);
  // 上次写进缓存的列表：打开时刚读出来的那份不重复写。
  const lastWrittenRef = useRef(initialCache);
  const [orphanIds, setOrphanIds] = useState<string[]>([]);
  const baseProjectsRef = useRef<Project[]>([]);
  // 每次渲染都更新：runReload 的闭包里拿不到最新的 projects state。
  const projectsRef = useRef<Project[]>(projects);
  projectsRef.current = projects;

  // 每次刷新算一轮：新一轮开始后，旧一轮不再读剩下的项目，结果也不再写回。
  const runRef = useRef(0);
  // 卸载后也算作废：不再读磁盘。
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const cancelledFor = useCallback((run: number) => () => run !== runRef.current || !mountedRef.current, []);

  // 静默启动刷新：内容没变就保留原引用，不触发重渲染，也不重写缓存。
  const commitProjects = useCallback((updated: Project[]) => {
    setProjects((prev) => (shouldCommitProjects(silentStartupRef.current, updated, prev) ? updated : prev));
  }, []);

  const applyMetadata = useCallback(async () => {
    // 不开启新一轮：套用元数据不该打断正在进行的刷新，只跟着当前这一轮作废。
    const isCancelled = cancelledFor(runRef.current);
    const updated = await applyProjectMetadata(baseProjectsRef.current, isCancelled);
    if (isCancelled()) return;
    commitProjects(updated);
  }, [commitProjects, cancelledFor]);

  const runReload = useCallback(async (): Promise<string[]> => {
    const run = ++runRef.current;
    const isCancelled = () => run !== runRef.current || !mountedRef.current;
    try {
      const { orphans } = await reloadProjectData(
        root,
        trashingIds,
        {
          onScanned: (base) => {
            if (isCancelled()) return;
            baseProjectsRef.current = base;
            // 静默启动刷新：磁盘上的项目有变化才显示加载。
            if (shouldShowLoadingOnScan(silentStartupRef.current, base, projectsRef.current)) setIsLoading(true);
          },
          onApplied: (updated, base) => {
            if (isCancelled()) return;
            commitProjects(updated);
            // 不等它读完：列表先出来，Key / BPM 读到一个填一个。
            onAppliedRef.current(base);
          },
        },
        isCancelled,
      );
      if (isCancelled()) return [];
      setOrphanIds(orphans);
      return orphans;
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to load projects:`, error);
      setProjects([]);
      setOrphanIds([]);
      await showFailure(strings.loadProjectsFailed, error, { message: strings.loadProjectsFailedHint });
    } finally {
      // 静默启动刷新只做一次，成功失败都复位。
      silentStartupRef.current = false;
    }
    return [] as string[];
  }, [commitProjects, onAppliedRef, root, trashingIds]);

  // 同一时刻只跑一轮：执行中再被触发（目录监听、返回刷新、保存回调）只记一笔，结束后补跑一次。
  const queueRef = useRef<ReturnType<typeof createReloadQueue> | null>(null);
  if (!queueRef.current) queueRef.current = createReloadQueue();
  const queue = queueRef.current;

  const reloadProjects = useCallback((): Promise<string[]> => queue.reload(runReload), [queue, runReload]);

  // 启动只加载一遍：依赖里的回调每次渲染都是新函数，会让这个 effect 重跑。
  const startupDoneRef = useRef(false);

  useEffect(() => {
    if (startupDoneRef.current) return;
    startupDoneRef.current = true;
    async function load() {
      const orphans = await reloadProjects();
      setIsLoading(false);
      await onStartupLoadedRef.current(orphans);
    }
    void load();
  }, [reloadProjects, onStartupLoadedRef]);

  // 列表刷新完就更新缓存：下次冷启动先显示这一份。
  useEffect(() => {
    if (!shouldWriteListCache(isLoading, projects, lastWrittenRef.current)) return;
    writeProjectListCache(root, projects);
    lastWrittenRef.current = projects;
  }, [isLoading, projects, root]);

  // 监听项目根目录（fs.watch 为 Node 内置，底层走 FSEvents）：Finder 里新建、删除、改名或从废纸篓放回项目时自动重载。
  // 去抖 0.5 秒，合并 Finder 连续触发的多次事件。
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let watcher: fs.FSWatcher | null = null;
    try {
      watcher = fs.watch(root, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => void reloadProjects(), 500);
      });
      watcher.on("error", () => watcher?.close());
    } catch {
      // 根目录不存在等：不监听，照常在打开时加载。
    }
    return () => {
      if (timer) clearTimeout(timer);
      watcher?.close();
    };
  }, [reloadProjects, root]);

  const refreshDoc = useCallback((file: string) => {
    setProjects((prev) => refreshDocFile(prev, file));
  }, []);

  const getProjects = useCallback(() => projectsRef.current, []);

  return { projects, isLoading, orphanIds, reloadProjects, applyMetadata, refreshDoc, getProjects };
}
