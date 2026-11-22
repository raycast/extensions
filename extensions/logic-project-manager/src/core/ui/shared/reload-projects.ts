import { Toast, open, openExtensionPreferences, showToast } from "@raycast/api";
import { strings } from "@/strings";
import { readDocFile, setKnownProjectTitles, stripFrontmatter } from "@/core/docs/docs";
import { restorePutBackProjects } from "@/core/fs/deleted-projects";
import { syncFinderChanges } from "@/core/fs/finder-sync";
import { removedProjectIds } from "@/core/fs/removed-projects";
import {
  getAllProjectMetadata,
  replaceExternalBounceFiles,
  setExternalBounces,
} from "@/core/metadata/project-metadata";
import { findMovedBounceFiles } from "@/core/projects/external-bounce-repair";
import {
  countProjectBounces,
  resolveSharedBouncesFolder,
  setSharedBounceAliases,
  setSharedBounceExclusions,
  setSharedBouncePreviousNames,
  type PreviousBounceName,
} from "@/core/projects/bounces";
import { loadProjects } from "@/core/projects/load-projects";
import { runBatched } from "@/core/projects/run-batched";
import type { Project } from "@/core/projects/types";

// 同时读几个项目：每个项目都要读笔记、歌词和 bounce 数，曲库大时不能一口气读完。
const PROJECT_READ_CONCURRENCY = 3;

export async function applyProjectMetadata(
  base: Project[],
  isCancelled: () => boolean = () => false,
): Promise<Project[]> {
  let metadataStore = await getAllProjectMetadata();
  // 手动登记的外部文件在 Finder 里改名或移动后，登记路径会失效：按大小和修改时间找回，再往下算。
  const sharedFolder = resolveSharedBouncesFolder();
  let repaired = false;
  for (const project of base) {
    const metadata = metadataStore[project.id];
    if (!metadata || metadata.externalBounceFiles.length === 0) continue;
    const moves = findMovedBounceFiles(
      metadata.externalBounceFiles,
      metadata.externalBounceFingerprints ?? {},
      sharedFolder,
    );
    if (moves.size === 0) continue;
    await replaceExternalBounceFiles(project.id, moves);
    repaired = true;
  }
  if (repaired) metadataStore = await getAllProjectMetadata();
  // 这个提交之前登记的文件还没有指纹：补记一次，下次改名才找得回来。一个项目只写一次。
  for (const project of base) {
    const metadata = metadataStore[project.id];
    if (!metadata || metadata.externalBounceFiles.length === 0) continue;
    const fingerprints = metadata.externalBounceFingerprints ?? {};
    if (metadata.externalBounceFiles.every((file) => file in fingerprints)) continue;
    await setExternalBounces(project.id, metadata.externalBounceFolders, metadata.externalBounceFiles);
    metadataStore = await getAllProjectMetadata();
  }
  // 别名、改名前的名字、排除的文件都存在元数据里：先登记给共享文件夹的分配，再算各项目的 bounce 数。
  const bounceAliases: Record<string, string[]> = {};
  const previousNames: Record<string, PreviousBounceName[]> = {};
  const exclusions: Record<string, string[]> = {};
  for (const project of base) {
    const metadata = metadataStore[project.id];
    const aliases = metadata?.bounceAliases ?? [];
    if (aliases.length > 0) bounceAliases[project.title] = aliases;
    const previous = metadata?.previousBounceNames ?? [];
    if (previous.length > 0) previousNames[project.title] = previous;
    const excluded = metadata?.excludedSharedBounces ?? [];
    if (excluded.length > 0) exclusions[project.title] = excluded;
  }
  setSharedBounceAliases(bounceAliases);
  setSharedBouncePreviousNames(previousNames);
  setSharedBounceExclusions(exclusions);
  const hasShared = resolveSharedBouncesFolder() !== null;
  // 每个项目都要读磁盘，所以分批读；结果按原顺序放回，列表顺序不变。
  const updatedProjects: (Project | null)[] = base.map(() => null);
  await runBatched(
    base.map((project, index) => ({ project, index })),
    async ({ project, index }) => {
      const metadata = metadataStore[project.id];
      // 笔记和歌词都总是读：applyMetadata 只在挂载时创建一次，按 showDetail 判断会锁死首帧的值，切到 Detail 时内容为空。
      const notes = stripFrontmatter(readDocFile(project, "notes"));
      const lyrics = stripFrontmatter(readDocFile(project, "lyrics"));
      const externalBounceFolders = metadata?.externalBounceFolders ?? [];
      const externalBounceFiles = metadata?.externalBounceFiles ?? [];
      // 无外部来源时复用 loadProjects 已算好的默认文件夹计数，省去重复扫描；
      // 有外部来源才走聚合器（默认文件夹 + 外部来源，去重、排除不可用）。
      const hasExternal = externalBounceFolders.length > 0 || externalBounceFiles.length > 0;
      const bouncesCount =
        hasExternal || hasShared
          ? countProjectBounces({
              title: project.title,
              folderPath: project.folderPath,
              externalBounceFolders,
              externalBounceFiles,
            })
          : project.bouncesCount;
      updatedProjects[index] = {
        ...project,
        stageId: metadata?.stageId ?? null,
        genreIds: metadata?.genreIds ?? [],
        collectionIds: metadata?.collectionIds ?? [],
        notes,
        lyrics,
        pinned: metadata?.pinned ?? false,
        pinOrder: metadata?.pinOrder ?? null,
        externalBounceFolders,
        externalBounceFiles,
        bouncesCount,
      };
    },
    { concurrency: PROJECT_READ_CONCURRENCY, isCancelled },
  );
  // 取消时没读到的项目保持原样，不丢列表。
  return base.map((project, index) => updatedProjects[index] ?? project);
}

export async function reloadProjectData(
  root: string,
  trashingIds: Set<string>,
  hooks: {
    onScanned?: (base: Project[]) => void;
    onApplied?: (projects: Project[], base: Project[]) => void;
  },
  isCancelled: () => boolean = () => false,
): Promise<{ base: Project[]; projects: Project[]; orphans: string[] }> {
  const base = loadProjects(root);
  hooks.onScanned?.(base);
  // 预先算好哪些项目会共用同一个笔记/歌词文件，读写时据此拦截。
  setKnownProjectTitles(base.map((p) => p.title));
  // 先补做在 Finder 里做的改名/删除，再处理放回、套用元数据。
  const { guardTripped, ambiguous, trashUnavailable, docRenameIssues } = await syncFinderChanges(
    base,
    root,
    trashingIds,
  );
  if (guardTripped) {
    // 标题只说结论；原因和下一步放进 message，按 ⌘T 展开操作。
    await showToast({
      style: Toast.Style.Failure,
      title: strings.manyProjectsMissing,
      message: strings.manyProjectsMissingHint,
      primaryAction: { title: strings.openPreferences, onAction: () => void openExtensionPreferences() },
      secondaryAction: { title: strings.openProjectsFolder, onAction: () => void open(root) },
    });
  } else if (ambiguous > 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: strings.ambiguousFinderChanges,
      message: strings.ambiguousFinderChangesHint,
    });
  } else if (trashUnavailable) {
    await showToast({
      style: Toast.Style.Failure,
      title: strings.trashNoAccess,
      message: strings.trashNoAccessHint,
      primaryAction: {
        title: strings.openFullDiskAccess,
        onAction: () => {
          void open("x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles");
        },
      },
    });
  } else if (docRenameIssues.length > 0) {
    // 与扩展内改名一致：笔记 / 歌词没跟着迁移时如实告知。
    await showToast({
      style: Toast.Style.Failure,
      title: strings.docRenameSkipped,
      message: docRenameIssues.join(", "),
    });
  }
  // 先还原从废纸篓放回的项目（标签/轨号/角色/文档），再套用元数据。
  const { restored, docConflicts } = await restorePutBackProjects(base);
  const projects = await applyProjectMetadata(base, isCancelled);
  hooks.onApplied?.(projects, base);
  if (docConflicts.length > 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: strings.restoreDocConflict,
      message: docConflicts.join(", "),
    });
  } else if (restored.length > 0) {
    await showToast({ style: Toast.Style.Success, title: strings.projectsRestored, message: restored.join(", ") });
  }
  // 扫描「孤儿」数据：metadata 还在、但项目文件夹已不在根目录（根目录读不到时为 null，按无残留处理）。
  const orphans = removedProjectIds(root, Object.keys(await getAllProjectMetadata())) ?? [];
  return { base, projects, orphans };
}
