import {
  ActionPanel,
  Action,
  Clipboard,
  closeMainWindow,
  Color,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  environment,
  open,
  showToast,
  Toast,
  trash,
  useNavigation,
  Alert,
  confirmAlert,
  openExtensionPreferences,
  type Application,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import fs from "node:fs";
import { useAudioPlayer } from "@/core/ui/hooks/use-audio-player";
import { refreshDocFile, useDocWatcher } from "@/core/ui/hooks/use-doc-watcher";
import { ensureAudioPlayerBinary } from "@/core/audio/audio-player-path";
import { getSettings } from "./settings";
import {
  deleteProjectMetadata,
  getAllProjectMetadata,
  movePinnedProject,
  setProjectPinned,
} from "@/core/metadata/project-metadata";
import { removeProjectFromAllOrders } from "@/core/metadata/collection-order";
import { removeProjectFromAllRoles } from "@/core/metadata/collection-roles";
import { getTranslations } from "./i18n";
import { SortBySubmenu, sortItems, sortOptionTitle, useSortOption } from "@/core/ui/sorting";
import type { SortOption } from "@/core/ui/sorting";
import { GroupBySubmenu, groupItems, useGroupOption } from "@/core/ui/grouping";
import { Bounces } from "@/core/ui/bounces";
import { stageTaxonomy, genreTaxonomy, collectionTaxonomy } from "@/core/metadata/taxonomies";
import type { TaxonomyOption } from "@/core/metadata/taxonomy";
import { displayDoc, missingDocFolder } from "@/core/docs/docs";
import { docPlaceholder, openDoc } from "@/core/docs/doc-actions";
import { archiveDeletedProject, assertDeletionWritable } from "@/core/fs/deleted-projects";
import { showFailure } from "@/core/ui/toast";
import { CollectionList } from "@/core/ui/collections-view";
import { CleanUpRemovedProjects } from "@/core/ui/clean-up-removed-projects";
import { EditInfo } from "@/core/ui/components/project/edit-info";
import { EditNote } from "@/core/ui/components/project/edit-note";
import { DuplicateProject } from "@/core/ui/components/project/duplicate-project";
import { ManageExternalBounces } from "@/core/ui/components/project/manage-external-bounces";
import type { Project } from "@/core/projects/types";
import {
  readProjectListCache,
  sameFsFields,
  serializeProjectList,
  writeProjectListCache,
} from "@/core/projects/list-cache";
import { applyProjectMetadata, reloadProjectData } from "@/core/ui/reload-projects";
import { findLatestProjectBounce, resolveSharedBouncesFolder, unmatchedSharedBounces } from "@/core/projects/bounces";
import { UnmatchedBounces } from "@/core/ui/unmatched-bounces";
import { viewPrefs } from "@/core/ui/view-prefs";
import { daw, type DawSet, type ProjectFileMetadata } from "@/daws";
import {
  cachedSetMetadata,
  loadPersistentProjectFileCache,
  parseSetMetadata,
} from "@/core/projects/project-file-cache";
import { SetsView } from "@/daws/ui";
import { getDawLabels } from "@/daws/labels";
import { projectIcon } from "@/daws/icons";
import { openWithDaw, resolveDawApp } from "@/core/daw-app";
import { LOG_PREFIX } from "@/core/log";
import {
  bpmMatches,
  dateKeywords,
  matchesSearch,
  nameKeywords,
  optionKeywords,
  timeSignatureMatches,
} from "@/core/ui/search-keywords";
import { findLatestSet } from "@/core/projects/latest-set";
import { keyKeywords, keyToken } from "@/core/projects/musical-key";

const settings = getSettings();
const t = getTranslations(settings.language);
const labels = getDawLabels(settings.language);
const PROJECTS_ROOT = settings.projectsFolder;
const SORT_STORAGE_KEY = "project-sort-option";
const GROUP_STORAGE_KEY = "project-group-option";
const VIEW_MODE_STORAGE_KEY = "view-mode:projects";
// 首次使用引导：问过共享文件夹没有；上次弹「未匹配」提示时用的共享文件夹路径。
const ONBOARDING_ASKED_KEY = "onboarding:shared-bounces-asked";
const ONBOARDING_UNMATCHED_KEY = "onboarding:unmatched-shown-for";
const DETAIL_DOC_STORAGE_KEY = "detail-doc:projects";
const PLAYER_PATH = ensureAudioPlayerBinary();
const SEEK_STEP_SECONDS = 5;
// 同时解析的 Set 数，和 View Sets 一样。
const METADATA_CONCURRENCY = 3;
// 要读的 Set 少于这个数时不弹进度提示（如在 DAW 里刚存了一个 Set），免得一闪而过。
const SET_PROGRESS_MIN = 5;

const INITIAL_ITEM_COUNT = 15;
const FILL_DELAY_MS = 0;

// 每个项目的最新 Set 和它的元数据；还没读完时 metadata 为 null。
type LatestSetInfo = { set: DawSet; metadata: ProjectFileMetadata | null };
// 正在由扩展执行 Move to Trash 的项目：已归档，目录监听触发的重载不要再当成 Finder 删除处理。
const trashingIds = new Set<string>();

const PROJECT_SORT_OPTIONS: SortOption[] = [
  "modified-desc",
  "modified-asc",
  "created-desc",
  "created-asc",
  "name-asc",
  "name-desc",
];

function namesFor(ids: string[], options: TaxonomyOption[]): string[] {
  return ids
    .map((id) => options.find((option) => option.id === id)?.name)
    .filter((name): name is string => name !== undefined);
}

function formatDate(ms: number): string {
  const date = new Date(ms);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function Command() {
  const { push } = useNavigation();
  const [stageOptions, setStageOptions] = useState<TaxonomyOption[]>([]);
  const [genreOptions, setGenreOptions] = useState<TaxonomyOption[]>([]);
  const [collectionOptions, setCollectionOptions] = useState<TaxonomyOption[]>([]);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  // 先渲染前 INITIAL_ITEM_COUNT 项，首帧之后补全；一打字也立刻补全。
  const [showAll, setShowAll] = useState(false);
  const [sortBy, setSortBy] = useSortOption(SORT_STORAGE_KEY, PROJECT_SORT_OPTIONS, "created-desc");
  const [groupBy, setGroupBy] = useGroupOption(GROUP_STORAGE_KEY, "created");
  // 冷启动先显示上次读到的列表，扫描完再替换。
  const [initialCache] = useState(() => readProjectListCache(PROJECTS_ROOT));
  const [projects, setProjects] = useState<Project[]>(() => initialCache ?? []);
  // 读到缓存时先不显示加载：扫描完发现没变化就什么都不做。
  const [isLoading, setIsLoading] = useState(initialCache === undefined);
  // 静默启动刷新：只在读到缓存的那一次刷新里为 true，结束后复位。
  const silentStartupRef = useRef(initialCache !== undefined);
  // 上次写进缓存的列表：打开时刚读出来的那份不重复写。
  const lastWrittenRef = useRef(initialCache);
  const [orphanIds, setOrphanIds] = useState<string[]>([]);
  // 默认 Detail；只有记过 Overview 才进 Overview。
  const [showDetail, setShowDetail] = useState(() => viewPrefs.get(VIEW_MODE_STORAGE_KEY) !== "overview");
  const [detailDoc, setDetailDoc] = useState<"notes" | "lyrics">(() =>
    viewPrefs.get(DETAIL_DOC_STORAGE_KEY) === "lyrics" ? "lyrics" : "notes",
  );
  const [dawApp, setDawApp] = useState<Application | null>(null);
  const [latestSets, setLatestSets] = useState<Record<string, LatestSetInfo>>({});
  const [readingSets, setReadingSets] = useState(false);
  // 每次读取编号：新一轮开始后，旧一轮的结果不再写入。
  const latestSetsRunRef = useRef(0);
  const baseProjectsRef = useRef<Project[]>([]);
  // 每次渲染都更新：load() 的闭包里拿不到最新的 projects state。
  const projectsRef = useRef<Project[]>(projects);
  projectsRef.current = projects;
  // 残留数据提示每次打开只弹一次（fs.watch 触发的重载不再重复提示）。
  const leftoverToastShownRef = useRef(false);
  // 首次使用引导每次打开最多弹一个。
  const onboardingShownRef = useRef(false);

  // 外部编辑器改了笔记 / 歌词：只重读那一份，详情面板马上跟着变。
  useDocWatcher(PROJECTS_ROOT, (file) => setProjects((prev) => refreshDocFile(prev, file)));

  const { playbackStatus, playingId, positionSeconds, durationSeconds, play, pause, resume, stop, seek, restart } =
    useAudioPlayer({
      playerPath: PLAYER_PATH,
    });

  // 找到 DAW 应用，用于新建项目（启动它）和图标：偏好设置里选了版本就用那个版本。
  useEffect(() => {
    void resolveDawApp().then(setDawApp);
  }, []);

  // 常驻 Toast：只在播放时显示，title=曲名，message=进度；暂停或停止时隐藏。
  const toastRef = useRef<Toast | null>(null);
  const toastBusyRef = useRef(false);
  const toastActiveRef = useRef(false);

  useEffect(() => {
    void stageTaxonomy.get().then(setStageOptions);
    void genreTaxonomy.get().then(setGenreOptions);
    void collectionTaxonomy.get().then(setCollectionOptions);
  }, []);

  const toggleDetail = useCallback(() => {
    setShowDetail((prev) => {
      const next = !prev;
      viewPrefs.set(VIEW_MODE_STORAGE_KEY, next ? "detail" : "overview");
      return next;
    });
  }, []);

  const toggleDetailDoc = useCallback(() => {
    setDetailDoc((prev) => {
      const next = prev === "notes" ? "lyrics" : "notes";
      viewPrefs.set(DETAIL_DOC_STORAGE_KEY, next);
      return next;
    });
  }, []);

  // 静默启动刷新：内容没变就保留原引用，不触发重渲染，也不重写缓存。
  const commitProjects = useCallback((updated: Project[]) => {
    setProjects((prev) =>
      silentStartupRef.current && serializeProjectList(updated) === serializeProjectList(prev) ? prev : updated,
    );
  }, []);

  const applyMetadata = useCallback(async () => {
    const updated = await applyProjectMetadata(baseProjectsRef.current);
    commitProjects(updated);
  }, [commitProjects]);

  // 读出每个项目最新 Set 的元数据：有缓存的立刻显示，其余在后台解析，读完一个显示一个。
  const refreshLatestSets = useCallback(async (list: Project[]) => {
    const run = ++latestSetsRunRef.current;
    await loadPersistentProjectFileCache();
    if (run !== latestSetsRunRef.current) return;

    const initial: Record<string, LatestSetInfo> = {};
    const missing: [string, DawSet][] = [];
    for (const project of list) {
      const set = findLatestSet(daw.listSets(project));
      if (!set) continue;
      const cached = cachedSetMetadata(set);
      initial[project.id] = { set, metadata: cached };
      if (!cached) missing.push([project.id, set]);
    }
    setLatestSets(initial);
    setReadingSets(missing.length > 0);
    if (missing.length === 0) return;

    // 正在播放时不弹，免得盖住播放提示。
    const toast =
      missing.length >= SET_PROGRESS_MIN && !toastActiveRef.current
        ? await showToast({ style: Toast.Style.Animated, title: labels.readingSets, message: `0 / ${missing.length}` })
        : null;

    let done = 0;
    let nextIndex = 0;
    async function worker() {
      while (run === latestSetsRunRef.current) {
        const index = nextIndex++;
        if (index >= missing.length) return;
        const [id, set] = missing[index];
        try {
          const metadata = await parseSetMetadata(set);
          if (run !== latestSetsRunRef.current) return;
          // 期间项目的最新 Set 换了（又存了一个）就不写，等下一轮。
          setLatestSets((prev) => (prev[id]?.set.path === set.path ? { ...prev, [id]: { set, metadata } } : prev));
        } catch (error) {
          console.error(`${LOG_PREFIX} Failed to load set metadata: ${set.path}`, error);
        }
        done++;
        if (toast) toast.message = `${done} / ${missing.length}`;
      }
    }
    await Promise.all(Array.from({ length: Math.min(METADATA_CONCURRENCY, missing.length) }, () => worker()));

    void toast?.hide();
    if (run === latestSetsRunRef.current) setReadingSets(false);
  }, []);

  const runReload = useCallback(async (): Promise<string[]> => {
    try {
      const { orphans } = await reloadProjectData(PROJECTS_ROOT, trashingIds, {
        onScanned: (base) => {
          baseProjectsRef.current = base;
          // 静默启动刷新：磁盘上的项目有变化才显示加载。
          if (silentStartupRef.current && !sameFsFields(base, projectsRef.current)) setIsLoading(true);
        },
        onApplied: (updated, base) => {
          commitProjects(updated);
          // 不等它读完：列表先出来，Key / BPM 读到一个填一个。
          void refreshLatestSets(base);
        },
      });
      setOrphanIds(orphans);
      return orphans;
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to load projects:`, error);
      setProjects([]);
      setOrphanIds([]);
      await showFailure(t.loadProjectsFailed, error, { message: t.loadProjectsFailedHint });
    } finally {
      // 静默启动刷新只做一次，成功失败都复位。
      silentStartupRef.current = false;
    }
    return [] as string[];
  }, [commitProjects, refreshLatestSets]);

  // 同一时刻只跑一次：执行中再被触发（目录监听、返回刷新、保存回调）只记一笔，结束后补跑一次。
  // 避免两次 Finder 同步交错——后一次可能拿已被前一次清掉的空数据去覆盖删除记录。
  const reloadInFlightRef = useRef<Promise<string[]> | null>(null);
  const reloadPendingRef = useRef(false);

  const reloadProjects = useCallback((): Promise<string[]> => {
    if (reloadInFlightRef.current) {
      reloadPendingRef.current = true;
      return reloadInFlightRef.current;
    }
    const run = async (): Promise<string[]> => {
      let orphans = await runReload();
      while (reloadPendingRef.current) {
        reloadPendingRef.current = false;
        orphans = await runReload();
      }
      return orphans;
    };
    const promise = run().finally(() => {
      reloadInFlightRef.current = null;
    });
    reloadInFlightRef.current = promise;
    return promise;
  }, [runReload]);

  // 首次使用引导：没设共享文件夹时问一次；换了共享文件夹时，有未匹配的 bounce 就提示一次。
  const runOnboarding = useCallback(async () => {
    if (onboardingShownRef.current) return;
    const folder = resolveSharedBouncesFolder();
    if (folder === null) {
      if ((await LocalStorage.getItem(ONBOARDING_ASKED_KEY)) === "true") return;
      onboardingShownRef.current = true;
      await confirmAlert({
        title: t.onboardingSharedTitle,
        message: t.onboardingSharedMessage,
        primaryAction: { title: t.openPreferences, onAction: () => void openExtensionPreferences() },
        dismissAction: { title: t.skip },
      });
      await LocalStorage.setItem(ONBOARDING_ASKED_KEY, "true");
      return;
    }

    if ((await LocalStorage.getItem(ONBOARDING_UNMATCHED_KEY)) === folder) return;
    // 先记下这个文件夹：没有未匹配的也算判断过，换文件夹前不再重复检查。
    await LocalStorage.setItem(ONBOARDING_UNMATCHED_KEY, folder);
    const metadataStore = await getAllProjectMetadata();
    const claimed = Object.values(metadataStore).flatMap((metadata) => metadata.externalBounceFiles);
    const count = unmatchedSharedBounces(claimed).length;
    if (count === 0) return;
    onboardingShownRef.current = true;
    await confirmAlert({
      title: t.onboardingUnmatchedTitle.replace("{count}", String(count)),
      message: t.onboardingUnmatchedMessage,
      primaryAction: {
        title: t.review,
        onAction: () =>
          push(<UnmatchedBounces projects={projectsRef.current} onChanged={() => void reloadProjects()} />),
      },
      dismissAction: { title: t.skip },
    });
  }, [push, reloadProjects]);

  // 启动只加载一遍：依赖里的 push 每次渲染都是新函数，会让这个 effect 重跑。
  const startupDoneRef = useRef(false);

  useEffect(() => {
    if (startupDoneRef.current) return;
    startupDoneRef.current = true;
    async function load() {
      const orphans = await reloadProjects();
      setIsLoading(false);
      if (orphans.length > 0 && !leftoverToastShownRef.current) {
        leftoverToastShownRef.current = true;
        await showToast({
          style: Toast.Style.Success,
          title: t.leftoversFound,
          message: t.leftoversFoundMessage.replace("{count}", String(orphans.length)),
          primaryAction: {
            title: t.cleanUpLeftovers,
            onAction: () => push(<CleanUpRemovedProjects />, () => void reloadProjects()),
          },
        });
      }
      await runOnboarding();
    }
    void load();
  }, [reloadProjects, push, runOnboarding]);

  // 列表刷新完就更新缓存：下次冷启动先显示这一份。
  useEffect(() => {
    if (isLoading) return;
    if (projects === lastWrittenRef.current) return;
    writeProjectListCache(PROJECTS_ROOT, projects);
    lastWrittenRef.current = projects;
  }, [isLoading, projects]);

  // 首帧只渲染前 INITIAL_ITEM_COUNT 项，这里补全其余部分。
  // 依赖里带 showAll：StrictMode 模拟卸载后重新挂载时会重新设置计时器，不会被清掉后再也不设。
  useEffect(() => {
    if (showAll || projects.length === 0) return;
    const timer = setTimeout(() => setShowAll(true), FILL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [showAll, projects.length]);

  // 监听项目根目录（fs.watch 为 Node 内置，底层走 FSEvents）：Finder 里新建、删除、改名或从废纸篓放回项目时自动重载。
  // 去抖 0.5 秒，合并 Finder 连续触发的多次事件。
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let watcher: fs.FSWatcher | null = null;
    try {
      watcher = fs.watch(PROJECTS_ROOT, () => {
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
  }, [reloadProjects]);

  // 根据播放状态维护常驻 Toast。
  useEffect(() => {
    const playingProject = projects.find((p) => p.id === playingId);
    const name = playingProject?.title ?? "";
    const isActive = playingId !== null && (playbackStatus === "Starting" || playbackStatus === "Playing");
    toastActiveRef.current = isActive;

    if (isActive) {
      // 标题放歌名（主文字色），说明放进度（次要文字色）；动作名已经写了 Play Latest Bounce，这里不重复。
      // 还不知道歌名时（如刚从后台恢复、列表未载入）退回 "Playing Latest Bounce"。
      const title = name || t.playingLatestBounce;
      const message = durationSeconds > 0 ? `${formatTime(positionSeconds)} / ${formatTime(durationSeconds)}` : "";
      if (toastRef.current) {
        toastRef.current.title = title;
        toastRef.current.message = message;
      } else if (!toastBusyRef.current) {
        toastBusyRef.current = true;
        void showToast({ style: Toast.Style.Animated, title, message }).then((toast) => {
          toastBusyRef.current = false;
          if (!toastActiveRef.current) {
            void toast.hide();
            return;
          }
          toastRef.current = toast;
        });
      }
    } else if (toastRef.current) {
      void toastRef.current.hide();
      toastRef.current = null;
    }
  }, [playbackStatus, playingId, projects, positionSeconds, durationSeconds]);

  const playProjectBounce = useCallback(
    (project: Project) => {
      const latestBouncePath = findLatestProjectBounce(project);
      if (!latestBouncePath) {
        void showToast({ style: Toast.Style.Failure, title: t.noBounces });
        return;
      }
      play(project.id, latestBouncePath, {
        onError: (message) => {
          void showFailure(t.playbackFailed, message);
        },
      });
    },
    [play],
  );
  const copyLatestBounce = useCallback(async (project: Project) => {
    const latestBouncePath = findLatestProjectBounce(project);
    if (!latestBouncePath) {
      await showToast({ style: Toast.Style.Failure, title: t.noBounces });
      return;
    }
    await Clipboard.copy({ file: latestBouncePath });
    await showToast({
      style: Toast.Style.Success,
      title: t.bounceCopied,
      message: latestBouncePath.split("/").pop() ?? "",
    });
  }, []);

  // 和打开 Set 的其他入口一样：打开后关掉 Raycast 窗口。
  const openLatestSet = useCallback(async (project: Project) => {
    const sets = daw.listSets(project);
    const set = findLatestSet(sets);
    if (sets.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: labels.noSets });
      return;
    }
    try {
      // 找不到当前版本时（工程被手动改坏），打开任意一个，交给 DAW 自己决定打开哪个。只有记录了当前版本的 DAW 会走到这里。
      await openWithDaw((set ?? sets[0]).path);
      await closeMainWindow();
    } catch (error) {
      await showFailure(labels.openSetFailed, error);
    }
  }, []);

  const handlePinToggle = async (project: Project) => {
    await setProjectPinned(project.id, !project.pinned);
    await applyMetadata();
    await showToast({
      style: Toast.Style.Success,
      title: project.pinned ? t.projectUnpinned : t.projectPinned,
    });
  };

  const handleMovePinnedProject = async (project: Project, direction: "up" | "down") => {
    await movePinnedProject(project.id, direction);
    await applyMetadata();
  };

  const handleTrashProject = async (project: Project) => {
    const confirmed = await confirmAlert({
      title: t.moveToTrash,
      icon: Icon.Trash,
      message: `${t.trashProjectHint}\n${project.title}`,
      primaryAction: { title: t.moveToTrash, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    trashingIds.add(project.id);
    try {
      // 删除流程要写的存储先全部预检：有一份损坏就在动文件夹之前停下，什么都不改。
      await assertDeletionWritable();
      await trash(project.folderPath);
      // 先存档（标签/轨号/角色，并把自定义文件夹里的文档移进 Deleted Projects/），再清理残留数据。
      // 30 天内从废纸篓放回，下次加载会按「同名 + 同创建时间」识别并还原；同名新项目不受影响。
      await archiveDeletedProject(project);
      await deleteProjectMetadata(project.id);
      await removeProjectFromAllOrders(project.id);
      await removeProjectFromAllRoles(project.id);
      await reloadProjects();
      await showToast({ style: Toast.Style.Success, title: t.movedToTrash, message: project.title });
    } catch (error) {
      await showFailure(t.trashFailed, error);
    } finally {
      trashingIds.delete(project.id);
    }
  };

  // 每个项目可被搜到的内容：标题、Stage、Genre、合集名的各种写法，加上创建年月。
  const searchTerms = (project: Project) => {
    const stage = stageOptions.find((option) => option.id === project.stageId);
    const genres = genreOptions.filter((option) => project.genreIds.includes(option.id));
    const collections = collectionOptions.filter((option) => project.collectionIds.includes(option.id));
    return [
      ...nameKeywords(project.title),
      ...(stage ? optionKeywords(stage) : []),
      ...genres.flatMap(optionKeywords),
      ...collections.flatMap(optionKeywords),
      ...dateKeywords(project.createdAt),
    ];
  };

  const filteredByDropdown = (() => {
    if (selectedFilter === "all") return projects;
    const separator = selectedFilter.indexOf(":");
    const dimension = selectedFilter.slice(0, separator);
    const id = selectedFilter.slice(separator + 1);
    if (dimension === "stage") return projects.filter((project) => project.stageId === id);
    if (dimension === "genre") return projects.filter((project) => project.genreIds.includes(id));
    if (dimension === "created")
      return projects.filter((project) => new Date(project.createdAt).getFullYear() === Number(id));
    return projects;
  })();

  // 最新 Set 的 Key 的各种写法。不放进 searchTerms：组合搜索里 Key 要整词对上，
  // 否则 cm（C 小调）会被当成 cmaj（C 大调）的一部分搜到。
  const keyWordsOf = (project: Project) => {
    const key = latestSets[project.id]?.metadata?.key;
    return key ? [key, ...keyKeywords(key)] : [];
  };

  const matchProject = (project: Project, query: string) => {
    const keyTokens = new Set(keyWordsOf(project).map(keyToken));
    const bpm = latestSets[project.id]?.metadata?.bpm ?? null;
    const timeSignature = latestSets[project.id]?.metadata?.timeSignature ?? null;
    return matchesSearch(
      searchTerms(project),
      query,
      (word) =>
        bpmMatches(bpm, word) ??
        timeSignatureMatches(timeSignature, word) ??
        (keyTokens.has(keyToken(word)) ? true : undefined),
    );
  };

  // 以 # 开头时用组合搜索（每个词都要命中）；否则交给 Raycast 的模糊搜索。
  const isTagSearch = searchText.trimStart().startsWith("#");
  const isEmptyTagSearch = isTagSearch && searchText.trimStart().slice(1).trim() === "";
  const filteredProjects = isTagSearch
    ? filteredByDropdown.filter((project) => matchProject(project, searchText.trimStart().slice(1)))
    : filteredByDropdown;

  const pinnedProjects = filteredProjects
    .filter((project) => project.pinned)
    .sort((a, b) => (a.pinOrder ?? Number.MAX_SAFE_INTEGER) - (b.pinOrder ?? Number.MAX_SAFE_INTEGER));

  const unpinnedProjects = sortItems(
    filteredProjects.filter((project) => !project.pinned),
    sortBy,
    (project) => ({
      created: project.createdAt,
      modified: project.modifiedAt,
      name: project.title,
    }),
  );

  // 每次渲染只查一次：笔记 / 歌词文件夹是否存在。占位文字按这个结果生成，不再逐项 existsSync。
  const missingDocFolders: Record<"notes" | "lyrics", string | null> = {
    notes: missingDocFolder("notes"),
    lyrics: missingDocFolder("lyrics"),
  };

  const renderProject = (item: Project) => {
    const stage = stageOptions.find((option) => option.id === item.stageId);
    const genreNames = namesFor(item.genreIds, genreOptions);
    const collectionNames = namesFor(item.collectionIds, collectionOptions);
    const latest = latestSets[item.id];
    const latestBpm = latest?.metadata?.bpm ?? null;
    const stagePill = stage ? [{ tag: { value: stage.name, color: stage.color ?? Color.SecondaryText } }] : [];
    const detailBody = !showDetail ? "" : detailDoc === "notes" ? item.notes : item.lyrics;
    const detailPlaceholder = docPlaceholder(detailDoc, item.title, missingDocFolders[detailDoc]);

    const isThisPlaying = playingId === item.id;
    const isAnythingPlaying = playingId !== null;
    // 主操作：未播→播；播放中→暂停；暂停→续播。
    const toggleIsPause = isThisPlaying && (playbackStatus === "Playing" || playbackStatus === "Starting");
    const toggleTitle = isThisPlaying
      ? playbackStatus === "Paused"
        ? t.resumePlayback
        : playbackStatus === "Stopping"
          ? t.stoppingPlayback
          : t.pausePlayback
      : t.playLatestBounce;

    const toggleIcon = isThisPlaying ? (toggleIsPause ? Icon.PauseFilled : Icon.PlayFilled) : Icon.Play;

    return (
      <List.Item
        key={item.id}
        icon={projectIcon(item.kind)}
        title={item.title}
        keywords={[...searchTerms(item), ...keyWordsOf(item)]}
        accessories={
          showDetail
            ? []
            : [
                ...stagePill,
                { text: String(item.setsCount), tooltip: `${item.setsCount} ${labels.sets}` },
                { icon: Icon.Document, tooltip: `${item.setsCount} ${labels.sets}` },
                { text: String(item.bouncesCount), tooltip: `${item.bouncesCount} Bounces` },
                { icon: Icon.Waveform, tooltip: `${item.bouncesCount} Bounces` },
              ]
        }
        detail={
          showDetail ? (
            <List.Item.Detail
              markdown={detailBody.trim() ? displayDoc(detailBody) : detailPlaceholder}
              metadata={
                <List.Item.Detail.Metadata>
                  {stage ? (
                    <List.Item.Detail.Metadata.TagList title="Stage">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={stage.name}
                        color={stage.color ?? Color.SecondaryText}
                      />
                    </List.Item.Detail.Metadata.TagList>
                  ) : (
                    <List.Item.Detail.Metadata.Label title="Stage" text="" />
                  )}
                  {genreNames.length > 0 ? (
                    <List.Item.Detail.Metadata.TagList title="Genre">
                      {genreNames.map((genreName) => (
                        <List.Item.Detail.Metadata.TagList.Item key={genreName} text={genreName} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  ) : (
                    <List.Item.Detail.Metadata.Label title="Genre" text="" />
                  )}
                  {collectionNames.length > 0 ? (
                    <List.Item.Detail.Metadata.TagList title="Collection">
                      {collectionNames.map((collectionName) => (
                        <List.Item.Detail.Metadata.TagList.Item key={collectionName} text={collectionName} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  ) : (
                    <List.Item.Detail.Metadata.Label title="Collection" text="" />
                  )}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Bounces" text={String(item.bouncesCount)} />
                  <List.Item.Detail.Metadata.Label title={labels.sets} text={String(item.setsCount)} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title={labels.latestSet} text={latest?.set.name ?? ""} />
                  <List.Item.Detail.Metadata.Label title="Key" text={latest?.metadata?.key ?? ""} />
                  <List.Item.Detail.Metadata.Label title="BPM" text={latestBpm === null ? "" : String(latestBpm)} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Created" text={formatDate(item.createdAt)} />
                  <List.Item.Detail.Metadata.Label title="Modified" text={formatDate(item.modifiedAt)} />
                </List.Item.Detail.Metadata>
              }
            />
          ) : undefined
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Push
                title={labels.viewSets}
                icon={Icon.Document}
                target={<SetsView project={item} />}
                onPop={() => void reloadProjects()}
              />
              <Action
                title={toggleTitle}
                icon={toggleIcon}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={() => {
                  if (isThisPlaying) {
                    if (playbackStatus === "Stopping") {
                      return;
                    }
                    if (playbackStatus === "Paused") {
                      resume();
                    } else {
                      pause();
                    }
                    return;
                  }
                  playProjectBounce(item);
                }}
              />
              <Action
                title={t.browseBounces}
                icon={Icon.Waveform}
                shortcut={{ modifiers: ["opt"], key: "return" }}
                onAction={() => {
                  push(
                    <Bounces
                      projectId={item.id}
                      projectName={item.title}
                      projectPath={item.folderPath}
                      externalFolders={item.externalBounceFolders}
                      externalFiles={item.externalBounceFiles}
                      onChanged={reloadProjects}
                    />,
                    () => void reloadProjects(),
                  );
                }}
              />
              <Action.Push
                title={t.browseCollections}
                icon={Icon.Tray}
                shortcut={{ modifiers: ["ctrl"], key: "return" }}
                target={
                  <CollectionList
                    projects={projects}
                    collections={collectionOptions}
                    stages={stageOptions}
                    genres={genreOptions}
                  />
                }
                onPop={() => {
                  // 在合集里改过的名字、标签、成员，以及新建/改名的合集，返回时一并刷新。
                  void reloadProjects();
                  void collectionTaxonomy.get().then(setCollectionOptions);
                }}
              />
              <Action
                title={labels.openLatestSet}
                icon={dawApp ? { fileIcon: dawApp.path } : Icon.Document}
                shortcut={Keyboard.Shortcut.Common.Open}
                onAction={() => openLatestSet(item)}
              />
            </ActionPanel.Section>
            {isAnythingPlaying && (
              <ActionPanel.Section title={t.sectionPlayback}>
                <Action
                  title={t.stopPlayback}
                  icon={Icon.StopFilled}
                  shortcut={{ modifiers: ["cmd"], key: "-" }}
                  onAction={stop}
                />
                <Action
                  title={t.seekBackward}
                  icon={Icon.RewindFilled}
                  shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
                  onAction={() => seek(-SEEK_STEP_SECONDS)}
                />
                <Action
                  title={t.seekForward}
                  icon={Icon.ForwardFilled}
                  shortcut={{ modifiers: ["opt"], key: "arrowRight" }}
                  onAction={() => seek(SEEK_STEP_SECONDS)}
                />
                <Action
                  title={t.restartTrack}
                  icon={Icon.ArrowCounterClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                  onAction={() => {
                    restart();
                    if (playbackStatus === "Paused") {
                      resume();
                    }
                  }}
                />
              </ActionPanel.Section>
            )}
            <ActionPanel.Section title={t.sectionDetails}>
              <Action.Push
                title={t.editInfo}
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={<EditInfo project={item} onSaved={reloadProjects} />}
              />
              <Action.Push
                title={t.editNote}
                icon={Icon.Highlight}
                shortcut={{ modifiers: ["cmd", "opt"], key: "n" }}
                target={<EditNote project={item} onSaved={reloadProjects} />}
              />
              <Action.Push
                title={t.editLyrics}
                icon={Icon.Highlight}
                shortcut={{ modifiers: ["cmd", "opt"], key: "l" }}
                target={<EditNote project={item} kind="lyrics" onSaved={reloadProjects} />}
              />
              <Action
                title={t.openNote}
                icon={Icon.Book}
                shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                onAction={async () => {
                  await openDoc(item, "notes");
                }}
              />
              <Action
                title={t.openLyrics}
                icon={Icon.Book}
                shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                onAction={async () => {
                  await openDoc(item, "lyrics");
                }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title={t.sectionFile}>
              {/* 包用「打开」会交给 DAW，所以改成在 Finder 里选中它；普通文件夹照旧在 Finder 里打开。 */}
              {item.kind === "package" ? (
                <Action.ShowInFinder
                  path={item.folderPath}
                  title={t.showInFinder}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
                />
              ) : (
                <Action.Open
                  title={t.openInFinder}
                  icon={Icon.Finder}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
                  target={item.folderPath}
                />
              )}
              <Action
                title={labels.newProjectFile}
                icon={Icon.NewDocument}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={async () => {
                  if (!dawApp) {
                    await showToast({ style: Toast.Style.Failure, title: labels.newProjectFileFailed });
                    return;
                  }
                  try {
                    await open(dawApp.path);
                  } catch (error) {
                    await showFailure(labels.newProjectFileFailed, error);
                  }
                }}
              />
              {daw.extraNewAction && (
                <Action.Push
                  title={daw.extraNewAction.title}
                  icon={daw.extraNewAction.icon}
                  shortcut={daw.extraNewAction.shortcut}
                  target={<daw.extraNewAction.component />}
                />
              )}
              <Action.Push
                title={t.duplicateProject}
                icon={Icon.Duplicate}
                shortcut={Keyboard.Shortcut.Common.Duplicate}
                target={<DuplicateProject project={item} onDuplicated={reloadProjects} />}
              />
              <Action.Push
                title={t.manageExternalBounce}
                icon={Icon.Link}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
                target={
                  <ManageExternalBounces
                    projectId={item.id}
                    projectTitle={item.title}
                    externalFolders={item.externalBounceFolders}
                    externalFiles={item.externalBounceFiles}
                    onSaved={reloadProjects}
                  />
                }
              />
              {resolveSharedBouncesFolder() !== null && (
                <Action.Push
                  title={t.unmatchedBounces}
                  icon={Icon.QuestionMarkCircle}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                  target={<UnmatchedBounces projects={projects} onChanged={() => void reloadProjects()} />}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section title={t.sectionCopy}>
              {item.bouncesCount > 0 && (
                <Action
                  title={t.copyLatestBounce}
                  icon={Icon.CopyClipboard}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                  onAction={() => copyLatestBounce(item)}
                />
              )}
              <Action.CopyToClipboard
                content={item.title}
                title={t.copyProjectName}
                icon={Icon.CopyClipboard}
                shortcut={Keyboard.Shortcut.Common.CopyName}
              />
              <Action.CopyToClipboard
                content={item.folderPath}
                title={t.copyProjectPath}
                icon={Icon.CopyClipboard}
                shortcut={Keyboard.Shortcut.Common.CopyPath}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title={t.sectionPin}>
              <Action
                title={item.pinned ? t.unpinProject : t.pinProject}
                icon={item.pinned ? Icon.TackDisabled : Icon.Tack}
                shortcut={Keyboard.Shortcut.Common.Pin}
                onAction={() => handlePinToggle(item)}
              />
              {item.pinned && (
                <>
                  <Action
                    title={t.moveUp}
                    icon={Icon.ArrowUp}
                    shortcut={Keyboard.Shortcut.Common.MoveUp}
                    onAction={() => handleMovePinnedProject(item, "up")}
                  />
                  <Action
                    title={t.moveDown}
                    icon={Icon.ArrowDown}
                    shortcut={Keyboard.Shortcut.Common.MoveDown}
                    onAction={() => handleMovePinnedProject(item, "down")}
                  />
                </>
              )}
            </ActionPanel.Section>
            <ActionPanel.Section title={t.sectionView}>
              <Action
                title={showDetail ? t.showOverview : t.showDetail}
                icon={Icon.AppWindowSidebarRight}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                onAction={toggleDetail}
              />
              {showDetail && (
                <Action
                  title={detailDoc === "notes" ? t.showLyrics : t.showNotes}
                  shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "t" }}
                  icon={Icon.Paragraph}
                  onAction={toggleDetailDoc}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section title={t.sectionArrange}>
              <GroupBySubmenu allowed={["modified", "created"]} value={groupBy} onChange={setGroupBy} />
              <SortBySubmenu allowed={PROJECT_SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
            </ActionPanel.Section>
            <ActionPanel.Section title={t.sectionDangerZone}>
              {orphanIds.length > 0 && (
                <Action.Push
                  title={t.cleanUpLeftovers}
                  icon={Icon.Eraser}
                  target={<CleanUpRemovedProjects />}
                  onPop={() => void reloadProjects()}
                />
              )}
              <Action
                title={t.moveToTrash}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => handleTrashProject(item)}
              />
            </ActionPanel.Section>
            {environment.isDevelopment && (
              <ActionPanel.Section>
                <Action
                  title="Reset Onboarding (Dev)"
                  icon={Icon.ArrowCounterClockwise}
                  onAction={async () => {
                    await LocalStorage.removeItem(ONBOARDING_ASKED_KEY);
                    await LocalStorage.removeItem(ONBOARDING_UNMATCHED_KEY);
                    await showToast({ style: Toast.Style.Success, title: "Onboarding Reset" });
                  }}
                />
              </ActionPanel.Section>
            )}
          </ActionPanel>
        }
      />
    );
  };

  const currentSortTitle = sortOptionTitle(sortBy);
  // Filter 的 Created 分组只列出有项目的年份，新的在前。
  const createdYears = [...new Set(projects.map((p) => new Date(p.createdAt).getFullYear()))].sort((a, b) => b - a);

  const groups = groupItems(
    unpinnedProjects,
    groupBy,
    (p) => ({ created: p.createdAt, modified: p.modifiedAt }),
    currentSortTitle,
  );
  // 先渲染前 INITIAL_ITEM_COUNT 项，首帧之后补全。分组和排序已完成，只截掉最后渲染的部分。
  const itemLimit = showAll ? Number.POSITIVE_INFINITY : INITIAL_ITEM_COUNT;
  const renderPinned = pinnedProjects.slice(0, itemLimit);
  let itemBudget = itemLimit - renderPinned.length;
  const renderGroups = groups
    .map((group) => {
      const items = group.items.slice(0, Math.max(0, itemBudget));
      itemBudget -= items.length;
      return { ...group, items };
    })
    .filter((group) => group.items.length > 0);

  return (
    <List
      isLoading={isLoading || readingSets}
      isShowingDetail={showDetail}
      filtering={!isTagSearch}
      onSearchTextChange={(text) => {
        setSearchText(text);
        // 一打字就补全，不等计时器。
        if (text) setShowAll(true);
      }}
      searchBarPlaceholder={t.searchProjectsPlaceholder}
      searchBarAccessory={
        <List.Dropdown tooltip={t.filter} value={selectedFilter} onChange={setSelectedFilter}>
          <List.Dropdown.Section title="">
            <List.Dropdown.Item title={t.all} value="all" icon={Icon.CircleProgress100} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title={t.stage}>
            {stageOptions.map((option) => (
              <List.Dropdown.Item
                key={`stage:${option.id}`}
                title={option.name}
                value={`stage:${option.id}`}
                keywords={["stage", "stages", t.stage, ...optionKeywords(option)]}
                icon={option.color ? { source: Icon.Circle, tintColor: option.color } : Icon.Circle}
              />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title={t.genre}>
            {genreOptions.map((option) => (
              <List.Dropdown.Item
                key={`genre:${option.id}`}
                title={option.name}
                value={`genre:${option.id}`}
                keywords={["genre", "genres", t.genre, ...optionKeywords(option)]}
                icon={option.color ? { source: Icon.Circle, tintColor: option.color } : Icon.Tag}
              />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title={t.created}>
            {createdYears.map((year) => (
              <List.Dropdown.Item
                key={`created:${year}`}
                title={String(year)}
                value={`created:${year}`}
                keywords={["created", "year", t.created]}
                icon={Icon.Calendar}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!isLoading && projects.length === 0 && (
        <List.EmptyView
          icon="icon.png"
          title={labels.noProjectsFound}
          description={labels.noProjectsFoundHint.replace("{folder}", PROJECTS_ROOT)}
          actions={
            <ActionPanel>
              <Action title={t.openPreferences} icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action.Open title={t.openProjectsFolder} icon={Icon.Finder} target={PROJECTS_ROOT} />
            </ActionPanel>
          }
        />
      )}
      {isEmptyTagSearch && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={t.advancedSearch}
          description={t.advancedSearchHint}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title={t.openReadme} icon={Icon.Book} url={daw.readmeUrl} />
            </ActionPanel>
          }
        />
      )}
      {!isEmptyTagSearch && renderPinned.length > 0 && (
        <List.Section title={t.pinned}>{renderPinned.map(renderProject)}</List.Section>
      )}
      {!isEmptyTagSearch &&
        renderGroups.map((group) => (
          <List.Section key={group.key} title={group.title} subtitle={group.subtitle}>
            {group.items.map(renderProject)}
          </List.Section>
        ))}
    </List>
  );
}
