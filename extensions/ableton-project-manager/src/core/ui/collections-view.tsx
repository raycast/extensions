import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  environment,
  open,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "node:fs";
import path from "node:path";
import { getTranslations } from "@/i18n";
import { getSettings } from "@/settings";
import type { Project } from "@/core/projects/types";
import { slugify, type TaxonomyOption } from "@/core/metadata/taxonomy";
import { viewPrefs } from "@/core/ui/view-prefs";
import {
  TrackMap,
  assignNumber,
  getTrackMap,
  nextNumber,
  removeNumber,
  removeTrackMap,
  setTrackMap,
  swapNumbers,
} from "@/core/metadata/collection-order";
import {
  RoleMap,
  assignRole,
  clearRole,
  getRoleMap,
  removeRoleMap,
  setRoleMap,
} from "@/core/metadata/collection-roles";
import {
  ENERGY_ENABLED,
  TrackInfo,
  energyLevelFromScore,
  energyScore,
  loadTrackInfos,
} from "@/core/projects/track-info";
import { useAudioPlayer } from "@/core/ui/hooks/use-audio-player";
import { refreshDocFile, useDocWatcher } from "@/core/ui/hooks/use-doc-watcher";
import { ensureAudioPlayerBinary } from "@/core/audio/audio-player-path";
import { findLatestProjectBounce } from "@/core/projects/bounces";
import { displayDoc, readDocFile, stripFrontmatter } from "@/core/docs/docs";
import { docPlaceholder, openDoc } from "@/core/docs/doc-actions";
import {
  getPinnedCollections,
  movePinnedCollection,
  removePinnedCollection,
  togglePinnedCollection,
} from "@/core/metadata/collection-pins";
import { collectionTaxonomy } from "@/core/metadata/taxonomies";
import {
  addProjectsToCollection,
  removeCollectionEverywhere,
  getAllProjectMetadata,
  saveProjectMetadata,
} from "@/core/metadata/project-metadata";
import { showFailure } from "@/core/ui/toast";
import { EditInfo, type ProjectRename } from "@/core/ui/components/project/edit-info";
import { EditNote } from "@/core/ui/components/project/edit-note";

const t = getTranslations(getSettings().language);

type Collection = { id: string; name: string };

const VIEW_MODE_STORAGE_KEY = "view-mode:collections";
const DETAIL_DOC_STORAGE_KEY = "detail-doc:collections";
const PLAYER_PATH = ensureAudioPlayerBinary();
const SEEK_STEP_SECONDS = 5;

// 固定的冷→暖位置色模板：每个圆点槽位颜色固定，所有 Project 一致。
// 槽位 1→5：最冷 → 次冷 → 中性 → 次暖 → 最暖。
const ENERGY_SLOT_COLORS: Color[] = [Color.Blue, Color.Green, Color.Yellow, Color.Orange, Color.Red];

function formatDuration(totalSeconds: number, minuteDigits = 1): string {
  const s = Math.round(totalSeconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(minuteDigits, "0")}:${String(seconds).padStart(2, "0")}`;
}

// 返回 5 个圆点 accessory：槽位 i < level 的点亮（显示该槽位的冷→暖色），其余留空（无色）。
// level 为 null（无数据 / 分析中 / 本专辑暂无可定尺的曲目）→ 全部空点占位，保持右侧列对齐。
function energyAccessories(level: number | null): List.Item.Accessory[] {
  return ENERGY_SLOT_COLORS.map((color, i) => {
    const filled = level !== null && i < level;
    return filled ? { text: { value: "●", color } } : { text: { value: "○", color: Color.SecondaryText } };
  });
}

// 合集名比较：忽略首尾空格与大小写。
function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function CollectionNameForm(props: {
  title: string;
  currentName?: string;
  onSubmit: (name: string) => Promise<boolean>;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");

  return (
    <Form
      navigationTitle={props.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t.save}
            onSubmit={async () => {
              const trimmed = name.trim();
              if (trimmed === "") {
                // 留空：重命名时视为不改动直接返回；新建时提示名称无效。
                if (props.currentName !== undefined) {
                  pop();
                  return;
                }
                await showToast({ style: Toast.Style.Failure, title: t.invalidName });
                return;
              }
              // 返回 false（如重名）时留在表单里，方便直接改。
              if (await props.onSubmit(trimmed)) pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={t.name} placeholder={props.currentName} value={name} onChange={setName} />
    </Form>
  );
}

export function CollectionList({
  projects: initialProjects,
  collections: initialCollections,
  stages,
  genres,
}: {
  projects: Project[];
  collections: Collection[];
  stages: TaxonomyOption[];
  genres: TaxonomyOption[];
}) {
  const { pop } = useNavigation();
  const [collections, setCollections] = useState<Collection[]>(initialCollections);
  // 推入时拿到的是快照；合集面板里的改动会通过 onProjectsChanged 回传到这里。
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  useEffect(() => {
    void getPinnedCollections().then(setPinnedIds);
  }, []);

  async function reloadCollections() {
    setCollections(await collectionTaxonomy.get());
  }

  async function togglePin(id: string) {
    setPinnedIds(await togglePinnedCollection(id));
  }

  async function movePin(id: string, direction: "up" | "down") {
    setPinnedIds(await movePinnedCollection(id, direction));
  }

  // 按显示名判重（不区分大小写）。id 仍由 slug 生成；slug 撞了就加 -2、-3…，避免 Demo! 与 Demo 被误判重名。
  async function createCollection(name: string): Promise<boolean> {
    const current = await collectionTaxonomy.get();
    if (current.some((o) => sameName(o.name, name))) {
      await showToast({ style: Toast.Style.Failure, title: t.collectionNameExists });
      return false;
    }
    const base = slugify(name);
    let id = base;
    for (let n = 2; current.some((o) => o.id === id); n++) {
      id = `${base}-${n}`;
    }
    const option: TaxonomyOption = { id, name };
    await collectionTaxonomy.save([...current, option]);
    await reloadCollections();
    await showToast({ style: Toast.Style.Success, title: t.created });
    return true;
  }

  async function renameCollection(id: string, name: string): Promise<boolean> {
    const current = await collectionTaxonomy.get();
    if (current.some((o) => o.id !== id && sameName(o.name, name))) {
      await showToast({ style: Toast.Style.Failure, title: t.collectionNameExists });
      return false;
    }
    await collectionTaxonomy.save(current.map((o) => (o.id === id ? { ...o, name } : o)));
    await reloadCollections();
    await showToast({ style: Toast.Style.Success, title: t.renamed });
    return true;
  }

  async function deleteCollection(c: Collection) {
    const confirmed = await confirmAlert({
      icon: { source: Icon.Trash, tintColor: Color.Red },
      title: `${t.delete} “${c.name}”?`,
      message: t.deleteCollectionHint,
      primaryAction: { title: t.delete, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const current = await collectionTaxonomy.get();
    await collectionTaxonomy.save(current.filter((o) => o.id !== c.id));

    // 清理与该合集 id 关联的残留数据，避免重建同名合集（slug 得出同 id）时旧状态复活。
    await removeCollectionEverywhere(c.id);
    await removeTrackMap(c.id);
    await removeRoleMap(c.id);
    setPinnedIds(await removePinnedCollection(c.id));

    await reloadCollections();
    await showToast({ style: Toast.Style.Success, title: t.deleted });
  }

  const createAction = (
    <Action.Push
      title={t.create}
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<CollectionNameForm title={t.create} onSubmit={createCollection} />}
    />
  );

  const pinnedCollections = pinnedIds
    .map((id) => collections.find((c) => c.id === id))
    .filter((c): c is Collection => c !== undefined);
  const unpinnedCollections = collections.filter((c) => !pinnedIds.includes(c.id));

  const renderItem = (c: Collection, options: { isPinned: boolean; index: number; total: number }) => {
    const count = projects.filter((p) => p.collectionIds.includes(c.id)).length;
    return (
      <List.Item
        key={c.id}
        icon="collection.png"
        title={c.name}
        accessories={[{ text: count === 1 ? "1 Track(s)" : `${count} Track(s)` }]}
        actions={
          <ActionPanel>
            <Action.Push
              title={t.open}
              icon={Icon.Tray}
              target={
                <CollectionPanel
                  collection={c}
                  projects={projects}
                  stages={stages}
                  genres={genres}
                  onProjectsChanged={setProjects}
                />
              }
            />
            {createAction}
            <Action.Push
              title={t.rename}
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={
                <CollectionNameForm
                  title={t.rename}
                  currentName={c.name}
                  onSubmit={(name) => renameCollection(c.id, name)}
                />
              }
            />
            <ActionPanel.Section title={t.sectionPin}>
              <Action
                title={options.isPinned ? t.unpinProject : t.pinProject}
                icon={options.isPinned ? Icon.TackDisabled : Icon.Tack}
                shortcut={Keyboard.Shortcut.Common.Pin}
                onAction={() => togglePin(c.id)}
              />
              {options.isPinned && options.index > 0 && (
                <Action
                  title={t.moveUp}
                  icon={Icon.ArrowUp}
                  shortcut={Keyboard.Shortcut.Common.MoveUp}
                  onAction={() => movePin(c.id, "up")}
                />
              )}
              {options.isPinned && options.index < options.total - 1 && (
                <Action
                  title={t.moveDown}
                  icon={Icon.ArrowDown}
                  shortcut={Keyboard.Shortcut.Common.MoveDown}
                  onAction={() => movePin(c.id, "down")}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section title={t.sectionNavigate}>
              <Action
                title={t.backToProjects}
                icon={Icon.Compass}
                shortcut={{ modifiers: ["ctrl"], key: "return" }}
                onAction={pop}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title={t.sectionDangerZone}>
              <Action
                title={t.delete}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => deleteCollection(c)}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List navigationTitle={t.browseCollections} searchBarPlaceholder={t.searchCollections}>
      {collections.length === 0 ? (
        <List.EmptyView title={t.noCategories} actions={<ActionPanel>{createAction}</ActionPanel>} />
      ) : (
        <>
          {pinnedCollections.length > 0 && (
            <List.Section title={t.pinned}>
              {pinnedCollections.map((c, index) =>
                renderItem(c, { isPinned: true, index, total: pinnedCollections.length }),
              )}
            </List.Section>
          )}
          <List.Section title={t.collections}>
            {unpinnedCollections.map((c) =>
              renderItem(c, { isPinned: false, index: 0, total: unpinnedCollections.length }),
            )}
          </List.Section>
        </>
      )}
    </List>
  );
}

function CollectionPanel({
  collection,
  projects,
  stages,
  genres,
  onProjectsChanged,
}: {
  collection: Collection;
  projects: Project[];
  stages: TaxonomyOption[];
  genres: TaxonomyOption[];
  onProjectsChanged?: (projects: Project[]) => void;
}) {
  const { pop } = useNavigation();
  const [projectList, setProjectList] = useState<Project[]>(projects);

  // 外部编辑器改了笔记 / 歌词：只重读那一份。面板拿到的是推入时的快照，父视图的更新传不进来，所以自己监听。
  useDocWatcher(getSettings().projectsFolder, (file) => setProjectList((prev) => refreshDocFile(prev, file)));

  // 面板里的改动（改名、标签、成员增减、笔记）回传给 Browse Collections，再次打开合集时不会用到旧快照。
  useEffect(() => {
    onProjectsChanged?.(projectList);
  }, [projectList, onProjectsChanged]);
  const members = projectList.filter((p) => p.collectionIds.includes(collection.id));
  const [map, setMap] = useState<TrackMap>({});
  const [roles, setRoles] = useState<RoleMap>({});
  const [infos, setInfos] = useState<Record<string, TrackInfo>>({});
  const [loading, setLoading] = useState(true);
  // 默认 Overview；只有记过 Detail 才进 Detail。
  const [showDetail, setShowDetail] = useState(() => viewPrefs.get(VIEW_MODE_STORAGE_KEY) === "detail");
  const [detailDoc, setDetailDoc] = useState<"notes" | "lyrics">(() =>
    viewPrefs.get(DETAIL_DOC_STORAGE_KEY) === "lyrics" ? "lyrics" : "notes",
  );
  const [selectedFilter, setSelectedFilter] = useState("all");
  const { playbackStatus, playingId, play, pause, resume, stop, seek, restart } = useAudioPlayer({
    playerPath: PLAYER_PATH,
  });
  function playProjectBounce(project: Project) {
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
  }

  // 主操作：未播→播；本行正在播→暂停/续播。放每个 item 的第二个 Action（拿 ⌘Enter）。
  async function copyLatestBounce(project: Project) {
    const latestBouncePath = findLatestProjectBounce(project);
    if (!latestBouncePath) {
      void showToast({ style: Toast.Style.Failure, title: t.noBounces });
      return;
    }
    await Clipboard.copy({ file: latestBouncePath });
    void showToast({
      style: Toast.Style.Success,
      title: t.bounceCopied,
      message: latestBouncePath.split("/").pop() ?? "",
    });
  }
  const renderPlayToggle = (p: Project) => {
    const isThisPlaying = playingId === p.id;
    const toggleIsPause = isThisPlaying && (playbackStatus === "Playing" || playbackStatus === "Starting");
    const title = isThisPlaying
      ? playbackStatus === "Paused"
        ? t.resumePlayback
        : playbackStatus === "Stopping"
          ? t.stoppingPlayback
          : t.pausePlayback
      : t.playLatestBounce;
    return (
      <Action
        title={title}
        icon={isThisPlaying ? (toggleIsPause ? Icon.PauseFilled : Icon.PlayFilled) : Icon.Play}
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
          playProjectBounce(p);
        }}
      />
    );
  };

  // 播放时才出现的停止、seek / restart 控制，作用于全局播放器。
  const renderPlaybackControls = () =>
    playingId !== null ? (
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
    ) : null;

  useEffect(() => {
    let cancelled = false;
    const memberList = projects.filter((p) => p.collectionIds.includes(collection.id));
    async function load() {
      const [trackMap, roleMap] = await Promise.all([getTrackMap(collection.id), getRoleMap(collection.id)]);
      if (cancelled) return;
      setMap(trackMap);
      setRoles(roleMap);
      setLoading(false);
      await loadTrackInfos(
        memberList,
        (projectId, info) => {
          if (cancelled) return;
          setInfos((prev) => ({ ...prev, [projectId]: info }));
        },
        () => cancelled,
      );
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [collection.id, projects]);

  function toggleDetail() {
    setShowDetail((prev) => {
      const next = !prev;
      viewPrefs.set(VIEW_MODE_STORAGE_KEY, next ? "detail" : "overview");
      return next;
    });
  }

  function toggleDetailDoc() {
    setDetailDoc((prev) => {
      const next = prev === "notes" ? "lyrics" : "notes";
      viewPrefs.set(DETAIL_DOC_STORAGE_KEY, next);
      return next;
    });
  }

  async function apply(next: TrackMap) {
    setMap(next);
    await setTrackMap(collection.id, next);
  }

  async function applyRoles(next: RoleMap) {
    setRoles(next);
    await setRoleMap(collection.id, next);
  }

  // Edit Info 存盘后：从 LocalStorage 重读成员的 Stage/Genre/Collection（含成员增减）。
  async function reloadMetadata(rename?: ProjectRename) {
    const store = await getAllProjectMetadata();
    // Edit Info 可能改了名（轨号/角色迁到新 id），或把本曲移出了合集（轨号/角色被清掉）：
    // 一律从存储重读，避免内存里的旧表在下次 apply() 时把这些改动覆盖回去。
    const [trackMap, roleMap] = await Promise.all([getTrackMap(collection.id), getRoleMap(collection.id)]);
    setMap(trackMap);
    setRoles(roleMap);
    if (rename) {
      setInfos((prev) => (rename.oldId in prev ? { ...prev, [rename.newId]: prev[rename.oldId] } : prev));
    }
    setProjectList((prev) =>
      prev.map((item) => {
        const p =
          rename && item.id === rename.oldId
            ? { ...item, id: rename.newId, title: rename.newId, folderPath: rename.folderPath }
            : item;
        const meta = store[p.id];
        return meta
          ? {
              ...p,
              stageId: meta.stageId ?? null,
              genreIds: meta.genreIds ?? [],
              collectionIds: meta.collectionIds ?? [],
            }
          : p;
      }),
    );
  }

  // Edit Note 存盘后：重读该曲目的 Note 正文，让详情面板即时回显。
  function reloadNote(project: Project) {
    const notes = stripFrontmatter(readDocFile(project, "notes"));
    setProjectList((prev) => prev.map((p) => (p.id === project.id ? { ...p, notes } : p)));
  }

  // 从 tracklist 移出时，连带清掉该曲目在本 collection 的角色。
  async function removeFromTracklist(id: string) {
    await apply(removeNumber(map, id));
    await applyRoles(clearRole(roles, id));
  }

  // 置顶：本曲排 1，其余已排序曲目按原顺序依次后移（顺带把撞号 / 断号压回 1..n）。
  async function moveToTop(id: string) {
    const ids = [id, ...tracked.filter((x) => x.id !== id).map((x) => x.id)];
    const next: TrackMap = { ...map };
    ids.forEach((trackId, idx) => {
      next[trackId] = idx + 1;
    });
    await apply(next);
  }

  // 把该项目整个移出本 collection：清掉成员关系 + 本合集轨号 + Role（项目本身与文件不受影响）。
  async function removeFromCollection(p: Project) {
    const confirmed = await confirmAlert({
      title: t.removeFromCollection,
      icon: { source: Icon.Trash, tintColor: Color.Red },
      message: t.removeFromCollectionHint,
      primaryAction: { title: t.removeFromCollection, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await removeFromTracklist(p.id);
    const store = await getAllProjectMetadata();
    const meta = store[p.id];
    if (meta) {
      await saveProjectMetadata(p.id, {
        ...meta,
        collectionIds: (meta.collectionIds ?? []).filter((id) => id !== collection.id),
      });
    }
    await reloadMetadata();
  }

  // 批量加入本合集：新成员进 Unsorted（不分配轨号）。
  async function addProjects(ids: string[]) {
    if (ids.length === 0) return;
    try {
      await addProjectsToCollection(ids, collection.id);
    } catch (error) {
      await showFailure(t.saveFailed, error);
      return;
    }
    await reloadMetadata();
    // 曲目信息只在打开面板时按快照加载一次；新成员单独补一次，否则时长等一直空着。
    const added = projectList.filter((p) => ids.includes(p.id));
    void loadTrackInfos(
      added,
      (projectId, info) => setInfos((prev) => ({ ...prev, [projectId]: info })),
      () => false,
    );
    await showToast({ style: Toast.Style.Success, title: t.projectsAdded, message: String(ids.length) });
  }

  // 按 Track Number 顺序（tracked 在前，unsorted 在后）把成员的 latest bounce 写成 .m3u，
  // 交系统默认 App 打开。不支持无播放列表的播放器（如 QuickTime Player）——见 README。
  async function queueCollection() {
    const entries: { title: string; path: string; duration: number }[] = [];
    for (const p of [...tracked, ...unsorted]) {
      const bounce = findLatestProjectBounce(p);
      if (bounce) {
        entries.push({ title: p.title, path: bounce, duration: infos[p.id]?.duration ?? -1 });
      }
    }

    if (entries.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: t.noBounces });
      return;
    }

    const lines = ["#EXTM3U"];
    for (const e of entries) {
      lines.push(`#EXTINF:${Math.round(e.duration)},${e.title}`);
      lines.push(e.path);
    }

    const safeName = collection.name.replace(/[/:]/g, "-") || collection.id;
    const playlistPath = path.join(environment.supportPath, `${safeName}.m3u`);

    try {
      fs.writeFileSync(playlistPath, lines.join("\n") + "\n");
    } catch (error) {
      await showFailure(t.queueFailed, error);
      return;
    }

    await open(playlistPath);

    const skipped = tracked.length + unsorted.length - entries.length;
    await showToast({
      style: Toast.Style.Success,
      title: t.collectionQueued,
      message:
        skipped > 0
          ? `${entries.length} ${t.tracksWord} · ${skipped} ${t.skippedNoBounce}`
          : `${entries.length} ${t.tracksWord}`,
    });
  }

  const renderQueueCollection = () => (
    <Action
      title={t.queueCollection}
      icon={Icon.AppWindow}
      shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
      onAction={queueCollection}
    />
  );

  // 角色 pill（设了才显示，放在 accessories 最左）。
  const rolePill = (p: Project): List.Item.Accessory[] => {
    const role = roles[p.id];
    return role ? [{ tag: { value: role, color: Color.SecondaryText } }] : [];
  };

  // 打开 Note / Lyrics 的外部编辑动作。Note 文件存在才出现；Lyrics 打开即建（可套模板）。
  const renderDocActions = (p: Project) => (
    <>
      <Action.Push
        title={t.editNote}
        icon={Icon.Highlight}
        shortcut={{ modifiers: ["cmd", "opt"], key: "n" }}
        target={<EditNote project={p} onSaved={() => reloadNote(p)} />}
      />
      <Action
        title={t.openNote}
        icon={Icon.Book}
        shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        onAction={async () => {
          await openDoc(p, "notes");
        }}
      />
      <Action
        title={t.openLyrics}
        icon={Icon.Book}
        shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        onAction={async () => {
          await openDoc(p, "lyrics");
        }}
      />
    </>
  );

  // 视图切换 Action（Detail / Overview，本视图独立记忆）。
  const renderViewToggle = () => (
    <ActionPanel.Section>
      <Action
        title={showDetail ? t.showOverview : t.showDetail}
        icon={Icon.AppWindowSidebarRight}
        onAction={toggleDetail}
      />
      {showDetail && (
        <Action
          title={detailDoc === "notes" ? t.showLyrics : t.showNotes}
          icon={Icon.Text}
          onAction={toggleDetailDoc}
        />
      )}
    </ActionPanel.Section>
  );

  // 返回 Search Projects（跨层直接回根视图）。
  const renderBackToProjects = () => (
    <ActionPanel.Section title={t.sectionNavigate}>
      <Action
        title={t.backToProjects}
        icon={Icon.Compass}
        shortcut={{ modifiers: ["ctrl"], key: "return" }}
        onAction={() => {
          pop();
          setTimeout(() => pop(), 0);
        }}
      />
    </ActionPanel.Section>
  );

  const renderOpenInFinder = (p: Project) => (
    <Action.Open
      title={t.openInFinder}
      icon={Icon.Finder}
      shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
      target={p.folderPath}
    />
  );

  const renderCopySection = (p: Project) => (
    <ActionPanel.Section title={t.sectionCopy}>
      {p.bouncesCount > 0 && (
        <Action
          title={t.copyLatestBounce}
          icon={Icon.CopyClipboard}
          shortcut={Keyboard.Shortcut.Common.Copy}
          onAction={() => copyLatestBounce(p)}
        />
      )}
      <Action.CopyToClipboard
        content={p.title}
        title={t.copyProjectName}
        icon={Icon.CopyClipboard}
        shortcut={Keyboard.Shortcut.Common.CopyName}
      />
      <Action.CopyToClipboard
        content={p.folderPath}
        title={t.copyProjectPath}
        icon={Icon.CopyClipboard}
        shortcut={Keyboard.Shortcut.Common.CopyPath}
      />
    </ActionPanel.Section>
  );

  const tracked = members
    .filter((p) => map[p.id] !== undefined)
    .sort((a, b) => map[a.id] - map[b.id] || a.title.localeCompare(b.title));
  const unsorted = members.filter((p) => map[p.id] === undefined).sort((a, b) => a.title.localeCompare(b.title));

  // 统计每个号被几首占用(用于撞号高亮)
  const counts = new Map<number, number>();
  for (const p of tracked) counts.set(map[p.id], (counts.get(map[p.id]) ?? 0) + 1);

  // 能量定档的尺：对已排序曲目的各特征分别取 min/max。
  const crests = tracked.map((p) => infos[p.id]?.crest).filter((v): v is number => typeof v === "number");
  const crestRange = { min: crests.length ? Math.min(...crests) : 0, max: crests.length ? Math.max(...crests) : 0 };
  const brightnesses = tracked.map((p) => infos[p.id]?.brightness).filter((v): v is number => typeof v === "number");
  const brightnessRange = {
    min: brightnesses.length ? Math.min(...brightnesses) : 0,
    max: brightnesses.length ? Math.max(...brightnesses) : 0,
  };
  const activities = tracked.map((p) => infos[p.id]?.activity).filter((v): v is number => typeof v === "number");
  const activityRange = {
    min: activities.length ? Math.min(...activities) : 0,
    max: activities.length ? Math.max(...activities) : 0,
  };

  // 总时长：所有已排序曲目（不分 Stage）。
  const totalSeconds = tracked.reduce((sum, p) => sum + (infos[p.id]?.duration ?? 0), 0);
  const tracklistTitle = totalSeconds > 0 ? `${t.tracklistDuration} ${formatDuration(totalSeconds)}` : t.tracklist;

  // 还在分析的曲目（时长、能量）：顶部显示加载条，第一个分区的副标题显示进度，分析完自动消失。
  // 不用 Toast：播放中的常驻 Toast 会被盖掉。
  const analyzedCount = members.filter((p) => p.id in infos).length;
  const analyzing = !loading && analyzedCount < members.length;
  const analyzingSubtitle = analyzing ? `${t.analyzing} ${analyzedCount}/${members.length}` : undefined;

  // 分钟位宽：本合集任一曲目 ≥ 10 分钟则补两位，保证时长列对齐。
  const longestTrackSeconds = members.reduce((max, p) => Math.max(max, infos[p.id]?.duration ?? 0), 0);
  const durationMinuteDigits = longestTrackSeconds >= 600 ? 2 : 1;
  const durationPlaceholder = durationMinuteDigits === 2 ? "--:--" : "-:--";

  const matchesFilter = (p: Project) => {
    if (selectedFilter === "all") return true;
    const separator = selectedFilter.indexOf(":");
    const dimension = selectedFilter.slice(0, separator);
    const id = selectedFilter.slice(separator + 1);
    if (dimension === "stage") return p.stageId === id;
    if (dimension === "genre") return p.genreIds.includes(id);
    return true;
  };

  // 已排序曲目的能量档位（以本合集已排序曲目为尺）；未排序或无数据 → null。
  const energyLevelOf = (p: Project): number | null => {
    const info = infos[p.id];
    if (map[p.id] === undefined || !info) return null;
    const score = energyScore(info, crestRange, brightnessRange, activityRange);
    return score === null ? null : energyLevelFromScore(score);
  };

  // 单首曲目的 Detail 面板：Note 作 markdown 主体，其余作 metadata。缺数据的字段留标题、值空白。
  const renderDetail = (p: Project) => {
    const info = infos[p.id];
    const role = roles[p.id];
    const stage = stages.find((s) => s.id === p.stageId);
    const level = energyLevelOf(p);
    const detailBody = detailDoc === "notes" ? (p.notes ?? "") : (p.lyrics ?? "");
    const detailPlaceholder = docPlaceholder(detailDoc, p.title);

    return (
      <List.Item.Detail
        markdown={detailBody.trim() ? displayDoc(detailBody) : detailPlaceholder}
        metadata={
          <List.Item.Detail.Metadata>
            {stage ? (
              <List.Item.Detail.Metadata.TagList title="Stage">
                <List.Item.Detail.Metadata.TagList.Item text={stage.name} color={stage.color ?? Color.SecondaryText} />
              </List.Item.Detail.Metadata.TagList>
            ) : (
              <List.Item.Detail.Metadata.Label title="Stage" text="" />
            )}
            <List.Item.Detail.Metadata.Label
              title="Duration"
              text={info?.duration != null ? formatDuration(info.duration, durationMinuteDigits) : ""}
            />
            <List.Item.Detail.Metadata.Label title="Role" text={role ?? ""} />
            <List.Item.Detail.Metadata.Label title="BPM" text={info?.bpm != null ? String(info.bpm) : ""} />
            <List.Item.Detail.Metadata.Label title="Key" text={info?.key ?? ""} />
            <List.Item.Detail.Metadata.Label title="Time Signature" text={info?.timeSignature ?? ""} />
            {ENERGY_ENABLED && level !== null && (
              <List.Item.Detail.Metadata.TagList title="Energy">
                {ENERGY_SLOT_COLORS.map((color, i) => (
                  <List.Item.Detail.Metadata.TagList.Item
                    key={i}
                    text="●"
                    color={i < level ? color : Color.SecondaryText}
                  />
                ))}
              </List.Item.Detail.Metadata.TagList>
            )}
          </List.Item.Detail.Metadata>
        }
      />
    );
  };

  // Tracklist 分区：未排序只有 Add to Tracklist；已排序有移出 / 交换 / 置顶 / 置底。
  const renderTracklistSection = (p: Project) => {
    const i = tracked.indexOf(p);
    if (i === -1) {
      return (
        <ActionPanel.Section title={t.sectionTracklist}>
          <Action
            title={t.addToTracklist}
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.Pin}
            onAction={() => apply(assignNumber(map, p.id, nextNumber(map)))}
          />
        </ActionPanel.Section>
      );
    }
    return (
      <ActionPanel.Section title={t.sectionTracklist}>
        <Action
          title={t.removeFromTracklist}
          icon={Icon.Minus}
          shortcut={Keyboard.Shortcut.Common.Pin}
          onAction={() => removeFromTracklist(p.id)}
        />
        {i > 0 && (
          <Action
            title={t.swapUp}
            icon={Icon.ArrowUp}
            shortcut={Keyboard.Shortcut.Common.MoveUp}
            onAction={() => apply(swapNumbers(map, p.id, tracked[i - 1].id))}
          />
        )}
        {i < tracked.length - 1 && (
          <Action
            title={t.swapDown}
            icon={Icon.ArrowDown}
            shortcut={Keyboard.Shortcut.Common.MoveDown}
            onAction={() => apply(swapNumbers(map, p.id, tracked[i + 1].id))}
          />
        )}
        {i > 0 && (
          <Action
            title={t.moveToTop}
            icon={Icon.ArrowUpCircle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
            onAction={() => moveToTop(p.id)}
          />
        )}
        {i < tracked.length - 1 && (
          <Action
            title={t.moveToBottom}
            icon={Icon.ArrowDownCircle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
            onAction={() => apply(assignNumber(map, p.id, nextNumber(map)))}
          />
        )}
      </ActionPanel.Section>
    );
  };

  // 批量加入：候选只列还不在本合集的项目。空合集的 EmptyView 也挂这个入口。
  const renderAddProjects = () => (
    <Action.Push
      title={t.addProjects}
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={
        <AddProjectsForm
          candidates={projectList
            .filter((p) => !p.collectionIds.includes(collection.id))
            .sort((a, b) => a.title.localeCompare(b.title))}
          onSubmit={addProjects}
        />
      }
    />
  );

  const renderItemActions = (p: Project) => (
    <ActionPanel>
      <Action.Push
        title={t.setTrackNumber}
        icon={Icon.Hashtag}
        target={
          <SetTrackNumberForm
            current={map[p.id] ?? nextNumber(map)}
            onSubmit={(n) => (n === null ? removeFromTracklist(p.id) : apply(assignNumber(map, p.id, n)))}
          />
        }
      />
      {renderPlayToggle(p)}
      {renderQueueCollection()}
      {renderAddProjects()}
      {renderOpenInFinder(p)}
      {renderPlaybackControls()}
      {renderTracklistSection(p)}
      <ActionPanel.Section title={t.sectionDetails}>
        <Action.Push
          title={t.editInfo}
          icon={Icon.Pencil}
          shortcut={Keyboard.Shortcut.Common.Edit}
          target={
            <EditInfo
              project={p}
              onSaved={reloadMetadata}
              collectionId={collection.id}
              currentRole={roles[p.id]}
              onRoleChanged={async (nextRole, projectId) => {
                // 读存储里的最新表（同一次保存可能刚做过改名迁移），按 EditInfo 给的 id 写入。
                const fresh = await getRoleMap(collection.id);
                await applyRoles(nextRole ? assignRole(fresh, projectId, nextRole) : clearRole(fresh, projectId));
              }}
            />
          }
        />
        {renderDocActions(p)}
      </ActionPanel.Section>
      {renderCopySection(p)}
      {renderViewToggle()}
      {renderBackToProjects()}
      <ActionPanel.Section title={t.sectionDangerZone}>
        <Action
          title={t.removeFromCollection}
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={() => removeFromCollection(p)}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  // 已排序曲目的 accessories：角色 → 撞号警告 → 轨号 → 时长 → 能量。未排序不显示任何 accessory。
  const trackAccessories = (p: Project): List.Item.Accessory[] => {
    const num = map[p.id];
    if (num === undefined) return [];
    const info = infos[p.id];
    const dup = (counts.get(num) ?? 0) > 1;
    return [
      ...rolePill(p),
      ...(dup
        ? [
            {
              icon: { source: Icon.Warning, tintColor: Color.Yellow },
              tooltip: t.duplicateTrack,
            } as List.Item.Accessory,
          ]
        : []),
      { text: `Track ${String(num).padStart(2, "0")}` },
      { text: info?.duration != null ? formatDuration(info.duration, durationMinuteDigits) : durationPlaceholder },
      ...(ENERGY_ENABLED ? energyAccessories(energyLevelOf(p)) : []),
    ];
  };

  // Tracklist 与 Unsorted 共用同一种行：差别只在 accessories 和 Tracklist 分区的动作。
  const renderMember = (p: Project) =>
    matchesFilter(p) ? (
      <List.Item
        key={p.id}
        icon="icon.png"
        title={p.title}
        accessories={showDetail ? [] : trackAccessories(p)}
        detail={showDetail ? renderDetail(p) : undefined}
        actions={renderItemActions(p)}
      />
    ) : null;

  return (
    <List
      navigationTitle={collection.name}
      searchBarPlaceholder={t.searchTracks}
      isLoading={loading || analyzing}
      isShowingDetail={showDetail}
      searchBarAccessory={
        <List.Dropdown tooltip={t.filter} value={selectedFilter} onChange={setSelectedFilter}>
          <List.Dropdown.Section title="">
            <List.Dropdown.Item title={t.all} value="all" icon={Icon.CircleProgress100} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title={t.stage}>
            {stages.map((option) => (
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
            {genres.map((option) => (
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
      {tracked.length === 0 && unsorted.length === 0 ? (
        <List.EmptyView
          title={t.noCategories}
          actions={
            <ActionPanel>
              {renderAddProjects()}
              {renderBackToProjects()}
            </ActionPanel>
          }
        />
      ) : (
        <>
          {tracked.length > 0 && (
            <List.Section title={tracklistTitle} subtitle={analyzingSubtitle}>
              {tracked.map((p) => renderMember(p))}
            </List.Section>
          )}
          {unsorted.length > 0 && (
            <List.Section title={t.unsorted} subtitle={tracked.length === 0 ? analyzingSubtitle : undefined}>
              {unsorted.map((p) => renderMember(p))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

function AddProjectsForm({
  candidates,
  onSubmit,
}: {
  candidates: Project[];
  onSubmit: (ids: string[]) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [ids, setIds] = useState<string[]>([]);
  return (
    <Form
      navigationTitle={t.addProjects}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t.add}
            icon={Icon.Plus}
            onSubmit={async () => {
              await onSubmit(ids);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      {candidates.length === 0 ? (
        <Form.Description text={t.allProjectsInCollection} />
      ) : (
        <Form.TagPicker id="projects" title={t.projects} value={ids} onChange={setIds}>
          {candidates.map((p) => (
            <Form.TagPicker.Item key={p.id} value={p.id} title={p.title} icon="icon.png" />
          ))}
        </Form.TagPicker>
      )}
    </Form>
  );
}

function SetTrackNumberForm({ current, onSubmit }: { current?: number; onSubmit: (n: number | null) => void }) {
  const { pop } = useNavigation();
  const [value, setValue] = useState("");
  function handleSubmit() {
    const trimmed = value.trim();
    if (trimmed === "") {
      if (current !== undefined) onSubmit(current); // 留空 = 采用占位(建议号)
      pop();
      return;
    }
    const n = parseInt(trimmed, 10);
    if (isNaN(n) || n < 0) {
      showToast({ style: Toast.Style.Failure, title: t.invalidPosition });
      return;
    }
    onSubmit(n === 0 ? null : n); // 0 = 移出
    pop();
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.save} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="n"
        title={t.trackNumber}
        placeholder={current !== undefined ? String(current) : "1"}
        value={value}
        onChange={setValue}
      />
    </Form>
  );
}
