import {
  ActionPanel,
  Action,
  Clipboard,
  Color,
  getApplications,
  Icon,
  Keyboard,
  List,
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
import { displayDoc, readDocFile, setKnownProjectTitles, stripFrontmatter } from "@/core/docs/docs";
import { docPlaceholder, openDoc } from "@/core/docs/doc-actions";
import { archiveDeletedProject, assertDeletionWritable, restorePutBackProjects } from "@/core/fs/deleted-projects";
import { showFailure } from "@/core/ui/toast";
import { syncFinderChanges } from "@/core/fs/finder-sync";
import { removedProjectIds } from "@/core/fs/removed-projects";
import { CollectionList } from "@/core/ui/collections-view";
import { CleanUpRemovedProjects } from "@/core/ui/clean-up-removed-projects";
import { EditInfo } from "@/core/ui/components/project/edit-info";
import { EditNote } from "@/core/ui/components/project/edit-note";
import { DuplicateProject } from "@/core/ui/components/project/duplicate-project";
import { Sets } from "@/core/ui/components/project/sets";
import { ManageExternalBounces } from "@/core/ui/components/project/manage-external-bounces";
import type { Project } from "@/core/projects/types";
import { loadProjects } from "@/core/projects/load-projects";
import { countProjectBounces, findLatestProjectBounce } from "@/core/projects/bounces";
import { viewPrefs } from "@/core/ui/view-prefs";
import { daw } from "@/daws";

const settings = getSettings();
const t = getTranslations(settings.language);
const PROJECTS_ROOT = settings.projectsFolder;
const SORT_STORAGE_KEY = "project-sort-option";
const GROUP_STORAGE_KEY = "project-group-option";
const VIEW_MODE_STORAGE_KEY = "view-mode:projects";
const DETAIL_DOC_STORAGE_KEY = "detail-doc:projects";
const PLAYER_PATH = ensureAudioPlayerBinary();
const SEEK_STEP_SECONDS = 5;
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
  const [sortBy, setSortBy] = useSortOption(SORT_STORAGE_KEY, PROJECT_SORT_OPTIONS, "created-desc");
  const [groupBy, setGroupBy] = useGroupOption(GROUP_STORAGE_KEY, "created");
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [orphanIds, setOrphanIds] = useState<string[]>([]);
  // 默认 Detail；只有记过 Overview 才进 Overview。
  const [showDetail, setShowDetail] = useState(() => viewPrefs.get(VIEW_MODE_STORAGE_KEY) !== "overview");
  const [detailDoc, setDetailDoc] = useState<"notes" | "lyrics">(() =>
    viewPrefs.get(DETAIL_DOC_STORAGE_KEY) === "lyrics" ? "lyrics" : "notes",
  );
  const [abletonApp, setAbletonApp] = useState<Application | null>(null);
  const baseProjectsRef = useRef<Project[]>([]);
  // 残留数据提示每次打开只弹一次（fs.watch 触发的重载不再重复提示）。
  const leftoverToastShownRef = useRef(false);

  // 外部编辑器改了笔记 / 歌词：只重读那一份，详情面板马上跟着变。
  useDocWatcher(PROJECTS_ROOT, (file) => setProjects((prev) => refreshDocFile(prev, file)));

  const { playbackStatus, playingId, positionSeconds, durationSeconds, play, pause, resume, stop, seek, restart } =
    useAudioPlayer({
      playerPath: PLAYER_PATH,
    });

  // 解析 Ableton Live，用于 New Live Set（取其图标 + 启动）。
  useEffect(() => {
    void getApplications().then((apps) => {
      setAbletonApp(apps.find((app) => app.name.toLowerCase().includes(daw.appNameMatch)) ?? null);
    });
  }, []);

  // 常驻 Toast：播放时 title=Playing Latest Bounce / 暂停时 title=Paused，message=曲名（次级灰）。
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

  const applyMetadata = useCallback(async () => {
    const metadataStore = await getAllProjectMetadata();
    const updatedProjects = baseProjectsRef.current.map((project) => {
      const metadata = metadataStore[project.id];
      // 笔记和歌词都总是读：applyMetadata 只在挂载时创建一次，按 showDetail 判断会锁死首帧的值，切到 Detail 时内容为空。
      const notes = stripFrontmatter(readDocFile(project, "notes"));
      const lyrics = stripFrontmatter(readDocFile(project, "lyrics"));
      const externalBounceFolders = metadata?.externalBounceFolders ?? [];
      const externalBounceFiles = metadata?.externalBounceFiles ?? [];
      // 无外部来源时复用 loadProjects 已算好的默认文件夹计数，省去重复扫描；
      // 有外部来源才走聚合器（默认文件夹 + 外部来源，去重、排除不可用）。
      const hasExternal = externalBounceFolders.length > 0 || externalBounceFiles.length > 0;
      const bouncesCount = hasExternal
        ? countProjectBounces({ folderPath: project.folderPath, externalBounceFolders, externalBounceFiles })
        : project.bouncesCount;
      return {
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
    });
    setProjects(updatedProjects);
  }, []);

  const runReload = useCallback(async (): Promise<string[]> => {
    try {
      baseProjectsRef.current = loadProjects(PROJECTS_ROOT);
      // 预先算好哪些项目会共用同一个笔记/歌词文件，读写时据此拦截。
      setKnownProjectTitles(baseProjectsRef.current.map((p) => p.title));
      // 先补做在 Finder 里做的改名/删除，再处理放回、套用元数据。
      const { guardTripped, ambiguous, trashUnavailable, docRenameIssues } = await syncFinderChanges(
        baseProjectsRef.current,
        PROJECTS_ROOT,
        trashingIds,
      );
      if (guardTripped) {
        // 标题只说结论；原因和下一步放进 message，按 ⌘T 展开操作。
        await showToast({
          style: Toast.Style.Failure,
          title: t.manyProjectsMissing,
          message: t.manyProjectsMissingHint,
          primaryAction: { title: t.openPreferences, onAction: () => void openExtensionPreferences() },
          secondaryAction: { title: t.openProjectsFolder, onAction: () => void open(PROJECTS_ROOT) },
        });
      } else if (ambiguous > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: t.ambiguousFinderChanges,
          message: t.ambiguousFinderChangesHint,
        });
      } else if (trashUnavailable) {
        await showToast({
          style: Toast.Style.Failure,
          title: t.trashNoAccess,
          message: t.trashNoAccessHint,
          primaryAction: {
            title: t.openFullDiskAccess,
            onAction: () => {
              void open("x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles");
            },
          },
        });
      } else if (docRenameIssues.length > 0) {
        // 与扩展内改名一致：笔记 / 歌词没跟着迁移时如实告知。
        await showToast({ style: Toast.Style.Failure, title: t.docRenameSkipped, message: docRenameIssues.join(", ") });
      }
      // 先还原从废纸篓放回的项目（标签/轨号/角色/文档），再套用元数据。
      const { restored, docConflicts } = await restorePutBackProjects(baseProjectsRef.current);
      await applyMetadata();
      if (docConflicts.length > 0) {
        await showToast({ style: Toast.Style.Failure, title: t.restoreDocConflict, message: docConflicts.join(", ") });
      } else if (restored.length > 0) {
        await showToast({ style: Toast.Style.Success, title: t.projectsRestored, message: restored.join(", ") });
      }
      // 扫描「孤儿」数据：metadata 还在、但项目文件夹已不在根目录（根目录读不到时为 null，按无残留处理）。
      const orphans = removedProjectIds(PROJECTS_ROOT, Object.keys(await getAllProjectMetadata())) ?? [];
      setOrphanIds(orphans);
      return orphans;
    } catch (error) {
      console.error("[Ableton Project Manager] Failed to load projects:", error);
      setProjects([]);
      setOrphanIds([]);
      await showFailure(t.loadProjectsFailed, error, { message: t.loadProjectsFailedHint });
    }
    return [] as string[];
  }, [applyMetadata]);

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

  useEffect(() => {
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
    }
    void load();
  }, [reloadProjects, push]);

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
      const title = t.playingLatestBounce;
      const time = durationSeconds > 0 ? `${formatTime(positionSeconds)} / ${formatTime(durationSeconds)}` : "";
      const message = time ? `${name} ${time}` : name;
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

  const filteredProjects = (() => {
    if (selectedFilter === "all") return projects;
    const separator = selectedFilter.indexOf(":");
    const dimension = selectedFilter.slice(0, separator);
    const id = selectedFilter.slice(separator + 1);
    if (dimension === "stage") return projects.filter((project) => project.stageId === id);
    if (dimension === "genre") return projects.filter((project) => project.genreIds.includes(id));
    return projects;
  })();

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

  const renderProject = (item: Project) => {
    const stage = stageOptions.find((option) => option.id === item.stageId);
    const genreNames = namesFor(item.genreIds, genreOptions);
    const collectionNames = namesFor(item.collectionIds, collectionOptions);
    const stagePill = stage ? [{ tag: { value: stage.name, color: stage.color ?? Color.SecondaryText } }] : [];
    const detailBody = !showDetail ? "" : detailDoc === "notes" ? item.notes : item.lyrics;
    const detailPlaceholder = docPlaceholder(detailDoc, item.title);

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
        icon="icon.png"
        title={item.title}
        accessories={
          showDetail
            ? []
            : [
                ...stagePill,
                { text: String(item.setsCount), tooltip: `${item.setsCount} Sets` },
                { icon: Icon.Document, tooltip: `${item.setsCount} Sets` },
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
                  <List.Item.Detail.Metadata.Label title="Sets" text={String(item.setsCount)} />
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
              <Action.Push title={t.viewSets} icon={Icon.Document} target={<Sets project={item} />} />
              {item.bouncesCount > 0 && (
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
              )}
              <Action
                title={t.browseBounces}
                icon={Icon.Waveform}
                shortcut={{ modifiers: ["opt"], key: "return" }}
                onAction={async () => {
                  if (item.bouncesCount === 0) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: t.noBounces,
                    });
                    return;
                  }
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
              <Action.Open
                title={t.openInFinder}
                icon={Icon.Finder}
                shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
                target={item.folderPath}
              />
              <Action
                title={t.newLiveSet}
                icon={Icon.NewDocument}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={async () => {
                  if (!abletonApp) {
                    await showToast({ style: Toast.Style.Failure, title: t.newLiveSetFailed });
                    return;
                  }
                  try {
                    await open(abletonApp.path);
                  } catch (error) {
                    await showFailure(t.newLiveSetFailed, error);
                  }
                }}
              />
              <Action.Push
                title={t.duplicateProject}
                icon={Icon.Duplicate}
                shortcut={Keyboard.Shortcut.Common.Duplicate}
                target={<DuplicateProject project={item} onDuplicated={reloadProjects} />}
              />
              <Action.Push
                title={t.manageExternalBounce}
                icon={Icon.Link}
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
                onAction={toggleDetail}
              />
              {showDetail && (
                <Action
                  title={detailDoc === "notes" ? t.showLyrics : t.showNotes}
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
          </ActionPanel>
        }
      />
    );
  };

  const currentSortTitle = sortOptionTitle(sortBy);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      searchBarPlaceholder={t.searchProjects}
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
                keywords={["stage", "stages", t.stage]}
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
                keywords={["genre", "genres", t.genre]}
                icon={option.color ? { source: Icon.Circle, tintColor: option.color } : Icon.Tag}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!isLoading && projects.length === 0 && (
        <List.EmptyView
          icon="icon.png"
          title={t.noProjectsFound}
          description={t.noProjectsFoundHint.replace("{folder}", PROJECTS_ROOT)}
          actions={
            <ActionPanel>
              <Action title={t.openPreferences} icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action.Open title={t.openProjectsFolder} icon={Icon.Finder} target={PROJECTS_ROOT} />
            </ActionPanel>
          }
        />
      )}
      {pinnedProjects.length > 0 && <List.Section title={t.pinned}>{pinnedProjects.map(renderProject)}</List.Section>}
      {groupItems(
        unpinnedProjects,
        groupBy,
        (p) => ({ created: p.createdAt, modified: p.modifiedAt }),
        currentSortTitle,
      ).map((group) => (
        <List.Section key={group.key} title={group.title} subtitle={group.subtitle}>
          {group.items.map(renderProject)}
        </List.Section>
      ))}
    </List>
  );
}
