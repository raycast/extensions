import {
  Action,
  ActionPanel,
  Alert,
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
import { useEffect, useRef, useState } from "react";
import fs from "node:fs";
import path from "node:path";
import { strings } from "@/strings";
import { getSettings } from "@/settings";
import type { Project } from "@/core/projects/types";
import type { TaxonomyOption } from "@/core/metadata/taxonomy";
import { PlayToggleAction } from "@/core/ui/actions/play-toggle";
import { PlaybackControlsSection } from "@/core/ui/actions/playback-controls";
import { DocActions } from "@/core/ui/actions/doc-actions";
import { CopyProjectSection } from "@/core/ui/actions/copy-project-section";
import { OpenProjectInFinderAction } from "@/core/ui/actions/open-project-in-finder";
import { ViewToggleSection } from "@/core/ui/actions/view-toggle";
import { useDetailView } from "@/core/ui/hooks/use-detail-view";
import { useMissingDocFolders } from "@/core/ui/hooks/use-missing-doc-folders";
import {
  TrackMap,
  assignNumber,
  getTrackMap,
  nextNumber,
  removeNumber,
  setTrackMap,
  swapNumbers,
} from "@/core/metadata/collection-order";
import { RoleMap, assignRole, clearRole, getRoleMap, setRoleMap } from "@/core/metadata/collection-roles";
import { ENERGY_ENABLED, TrackInfo, loadTrackInfos } from "@/core/projects/track-info";
import { useAudioPlayer } from "@/core/ui/hooks/use-audio-player";
import { refreshDocFile, useDocWatcher } from "@/core/ui/hooks/use-doc-watcher";
import { ensureAudioPlayerBinary } from "@/core/audio/audio-player-path";
import { findLatestProjectBounce } from "@/core/projects/bounces";
import { displayDoc, readDocFile, stripFrontmatter } from "@/core/docs/docs";
import { docPlaceholder } from "@/core/docs/doc-actions";
import { addProjectsToCollection, getAllProjectMetadata, saveProjectMetadata } from "@/core/metadata/project-metadata";
import { showFailure } from "@/core/ui/shared/toast";
import { copyLatestBounce, playProjectBounce } from "@/core/ui/shared/bounce-actions";
import { onFinderRenames } from "@/core/fs/finder-sync";
import { EditInfo, type ProjectRename } from "@/core/ui/components/edit-info";
import { optionKeywords } from "@/core/ui/shared/search-keywords";
import {
  analyzedCount,
  durationMinuteDigits,
  durationPlaceholder,
  energyLevelOf,
  energyRanges,
  formatDuration,
  matchesFilter,
  numberCounts,
  splitTracklist,
  totalDuration,
  trackInfoSignature,
} from "@/core/ui/collections/tracklist";
import { projectIcon } from "@/daws/icons";

const VIEW_MODE_STORAGE_KEY = "view-mode:collections";
const DETAIL_DOC_STORAGE_KEY = "detail-doc:collections";
const PLAYER_PATH = ensureAudioPlayerBinary();

// 固定的冷→暖位置色模板：每个圆点槽位颜色固定，所有 Project 一致。
// 槽位 1→5：最冷 → 次冷 → 中性 → 次暖 → 最暖。
const ENERGY_SLOT_COLORS: Color[] = [Color.Blue, Color.Green, Color.Yellow, Color.Orange, Color.Red];

// 返回 5 个圆点 accessory：槽位 i < level 的点亮（显示该槽位的冷→暖色），其余留空（无色）。
// level 为 null（无数据 / 分析中 / 本专辑暂无可定尺的曲目）→ 全部空点占位，保持右侧列对齐。
function energyAccessories(level: number | null): List.Item.Accessory[] {
  return ENERGY_SLOT_COLORS.map((color, i) => {
    const filled = level !== null && i < level;
    return filled ? { text: { value: "●", color } } : { text: { value: "○", color: Color.SecondaryText } };
  });
}

export function CollectionPanel({
  collection,
  projects,
  stages,
  genres,
  onProjectsChanged,
}: {
  collection: TaxonomyOption;
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
  const { showDetail, toggleDetail, detailDoc, toggleDetailDoc } = useDetailView({
    viewModeKey: VIEW_MODE_STORAGE_KEY,
    detailDocKey: DETAIL_DOC_STORAGE_KEY,
    defaultMode: "overview",
  });
  const [selectedFilter, setSelectedFilter] = useState("all");
  // 笔记 / 歌词文件夹是否失效：只在打开时查一次，渲染路径不碰磁盘。
  const missingDocFolders = useMissingDocFolders();
  const { playbackStatus, playingId, play, pause, resume, stop, seek, restart } = useAudioPlayer({
    playerPath: PLAYER_PATH,
  });
  const renderPlayToggle = (p: Project) => (
    <PlayToggleAction
      isThisPlaying={playingId === p.id}
      playbackStatus={playbackStatus}
      onPlay={() => playProjectBounce(p, play)}
      onPause={pause}
      onResume={resume}
    />
  );

  // 播放时才出现的停止、seek / restart 控制，作用于全局播放器。
  const renderPlaybackControls = () => (
    <PlaybackControlsSection
      playingId={playingId}
      playbackStatus={playbackStatus}
      onStop={stop}
      onSeek={seek}
      onRestart={restart}
      onResume={resume}
    />
  );

  // 轨号表和角色只跟合集有关：和曲目分析分开，改笔记、改标签时不必重读这两张表。
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [trackMap, roleMap] = await Promise.all([getTrackMap(collection.id), getRoleMap(collection.id)]);
      if (cancelled) return;
      setMap(trackMap);
      setRoles(roleMap);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [collection.id]);

  // 曲目分析：只在影响分析结果的字段变化时重跑（见 trackInfoSignature），改笔记、改标签不再重跑。
  // 重跑时不清空已有结果，也不重新打开加载状态，避免列表闪一下。
  // 成员列表走 ref：effect 只依赖签名，否则 exhaustive-deps 会要求依赖整个数组。
  const membersRef = useRef<Project[]>(members);
  membersRef.current = members;
  const analysisSignature = trackInfoSignature(members);
  useEffect(() => {
    let cancelled = false;
    void loadTrackInfos(
      membersRef.current,
      (projectId, info) => {
        if (cancelled) return;
        setInfos((prev) => ({ ...prev, [projectId]: info }));
      },
      () => cancelled,
    );
    return () => {
      cancelled = true;
    };
  }, [collection.id, analysisSignature]);

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

  // Finder 里改了名：后台重载已把轨号 / 角色迁到新 id，这里把快照里的旧 id 换掉，免得下次排序把旧表写回去。
  const reloadMetadataRef = useRef(reloadMetadata);
  reloadMetadataRef.current = reloadMetadata;
  useEffect(
    () =>
      onFinderRenames((renames) => {
        void (async () => {
          for (const rename of renames) await reloadMetadataRef.current(rename);
        })();
      }),
    [],
  );

  // Edit Note / Edit Lyrics 存盘后：重读该曲目的那份文档，让详情面板即时回显。
  function reloadDoc(project: Project, kind: "notes" | "lyrics") {
    const body = stripFrontmatter(readDocFile(project, kind));
    setProjectList((prev) => prev.map((p) => (p.id === project.id ? { ...p, [kind]: body } : p)));
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
      title: strings.removeFromCollection,
      icon: { source: Icon.Trash, tintColor: Color.Red },
      message: strings.removeFromCollectionHint,
      primaryAction: { title: strings.removeFromCollection, style: Alert.ActionStyle.Destructive },
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
      await showFailure(strings.saveFailed, error);
      return;
    }
    await reloadMetadata();
    await showToast({ style: Toast.Style.Success, title: strings.projectsAdded, message: String(ids.length) });
  }

  // 按 Track Number 顺序把 Tracklist 成员的 latest bounce 写成 .m3u，Unsorted 不排。
  // 交系统默认 App 打开。不支持无播放列表的播放器（如 QuickTime Player）——见 README。
  async function queueCollection() {
    const entries: { title: string; path: string; duration: number }[] = [];
    for (const p of tracked) {
      const bounce = findLatestProjectBounce(p);
      if (bounce) {
        entries.push({ title: p.title, path: bounce, duration: infos[p.id]?.duration ?? -1 });
      }
    }

    if (entries.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: strings.noBounces });
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
      await showFailure(strings.queueFailed, error);
      return;
    }

    await open(playlistPath);

    const skipped = tracked.length - entries.length;
    await showToast({
      style: Toast.Style.Success,
      title: strings.collectionQueued,
      message:
        skipped > 0
          ? `${entries.length} ${strings.tracksWord} · ${skipped} ${strings.skippedNoBounce}`
          : `${entries.length} ${strings.tracksWord}`,
    });
  }

  const renderQueueCollection = () =>
    tracked.length > 0 && (
      <Action
        title={strings.queueCollection}
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
    <DocActions project={p} onNoteSaved={() => reloadDoc(p, "notes")} onLyricsSaved={() => reloadDoc(p, "lyrics")} />
  );

  // 视图切换 Action（Detail / Overview，本视图独立记忆）。
  const renderViewToggle = () => (
    <ViewToggleSection
      showDetail={showDetail}
      detailDoc={detailDoc}
      onToggleDetail={toggleDetail}
      onToggleDetailDoc={toggleDetailDoc}
    />
  );

  // 返回 Search Projects（跨层直接回根视图）。
  const renderBackToProjects = () => (
    <ActionPanel.Section title={strings.sectionNavigate}>
      <Action
        title={strings.backToProjects}
        icon={Icon.Compass}
        shortcut={{ modifiers: ["ctrl"], key: "return" }}
        onAction={() => {
          pop();
          setTimeout(() => pop(), 0);
        }}
      />
    </ActionPanel.Section>
  );

  // 工程包用「打开」会交给 DAW，所以改成在 Finder 里选中它；普通文件夹照旧在 Finder 里打开。
  const renderOpenInFinder = (p: Project) => <OpenProjectInFinderAction kind={p.kind} folderPath={p.folderPath} />;

  const renderCopySection = (p: Project) => (
    <CopyProjectSection project={p} onCopyLatestBounce={() => copyLatestBounce(p)} />
  );

  const { tracked, unsorted } = splitTracklist(members, map);

  // 统计每个号被几首占用(用于撞号高亮)
  const counts = numberCounts(tracked, map);

  // 能量定档的尺：对已排序曲目的各特征分别取 min/max。
  const ranges = energyRanges(tracked, infos);

  // 总时长：所有已排序曲目（不分 Stage）。
  const totalSeconds = totalDuration(tracked, infos);
  const tracklistTitle =
    totalSeconds > 0 ? `${strings.tracklistDuration} ${formatDuration(totalSeconds)}` : strings.tracklist;

  // 还在分析的曲目（时长、能量）：顶部显示加载条，第一个分区的副标题显示进度，分析完自动消失。
  // 不用 Toast：播放中的常驻 Toast 会被盖掉。
  const analyzed = analyzedCount(members, infos);
  const analyzing = !loading && analyzed < members.length;
  const analyzingSubtitle = analyzing ? `${strings.analyzing} ${analyzed}/${members.length}` : undefined;

  // 分钟位宽：本合集任一曲目 ≥ 10 分钟则补两位，保证时长列对齐。
  const minuteDigits = durationMinuteDigits(members, infos);
  const placeholder = durationPlaceholder(minuteDigits);

  // 已排序曲目的能量档位（以本合集已排序曲目为尺）；未排序或无数据 → null。
  const levelOf = (p: Project) => energyLevelOf(p, map, infos, ranges);

  // 单首曲目的 Detail 面板：Note 作 markdown 主体，其余作 metadata。缺数据的字段留标题、值空白。
  const renderDetail = (p: Project) => {
    const info = infos[p.id];
    const role = roles[p.id];
    const stage = stages.find((s) => s.id === p.stageId);
    const level = levelOf(p);
    const detailBody = detailDoc === "notes" ? (p.notes ?? "") : (p.lyrics ?? "");
    const detailPlaceholder = docPlaceholder(detailDoc, p.title, missingDocFolders[detailDoc]);

    return (
      <List.Item.Detail
        markdown={detailBody.trim() ? displayDoc(detailBody) : detailPlaceholder}
        metadata={
          <List.Item.Detail.Metadata>
            {stage ? (
              <List.Item.Detail.Metadata.TagList title={strings.stage}>
                <List.Item.Detail.Metadata.TagList.Item text={stage.name} color={stage.color ?? Color.SecondaryText} />
              </List.Item.Detail.Metadata.TagList>
            ) : (
              <List.Item.Detail.Metadata.Label title={strings.stage} text="" />
            )}
            <List.Item.Detail.Metadata.Label
              title={strings.duration}
              text={info?.duration != null ? formatDuration(info.duration, minuteDigits) : ""}
            />
            <List.Item.Detail.Metadata.Label title={strings.role} text={role ?? ""} />
            <List.Item.Detail.Metadata.Label title={strings.bpm} text={info?.bpm != null ? String(info.bpm) : ""} />
            <List.Item.Detail.Metadata.Label title={strings.key} text={info?.key ?? ""} />
            <List.Item.Detail.Metadata.Label title={strings.timeSignature} text={info?.timeSignature ?? ""} />
            {ENERGY_ENABLED && level !== null && (
              <List.Item.Detail.Metadata.TagList title={strings.energy}>
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
        <ActionPanel.Section title={strings.sectionTracklist}>
          <Action
            title={strings.addToTracklist}
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.Pin}
            onAction={() => apply(assignNumber(map, p.id, nextNumber(map)))}
          />
        </ActionPanel.Section>
      );
    }
    return (
      <ActionPanel.Section title={strings.sectionTracklist}>
        <Action
          title={strings.removeFromTracklist}
          icon={Icon.Minus}
          shortcut={Keyboard.Shortcut.Common.Pin}
          onAction={() => removeFromTracklist(p.id)}
        />
        {i > 0 && (
          <Action
            title={strings.swapUp}
            icon={Icon.ArrowUp}
            shortcut={Keyboard.Shortcut.Common.MoveUp}
            onAction={() => apply(swapNumbers(map, p.id, tracked[i - 1].id))}
          />
        )}
        {i < tracked.length - 1 && (
          <Action
            title={strings.swapDown}
            icon={Icon.ArrowDown}
            shortcut={Keyboard.Shortcut.Common.MoveDown}
            onAction={() => apply(swapNumbers(map, p.id, tracked[i + 1].id))}
          />
        )}
        {i > 0 && (
          <Action
            title={strings.moveToTop}
            icon={Icon.ArrowUpCircle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
            onAction={() => moveToTop(p.id)}
          />
        )}
        {i < tracked.length - 1 && (
          <Action
            title={strings.moveToBottom}
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
      title={strings.addProjects}
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
        title={strings.setTrackNumber}
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
      <ActionPanel.Section title={strings.sectionDetails}>
        <Action.Push
          title={strings.editInfo}
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
      <ActionPanel.Section title={strings.sectionDangerZone}>
        <Action
          title={strings.removeFromCollection}
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
              tooltip: strings.duplicateTrack,
            } as List.Item.Accessory,
          ]
        : []),
      { text: `${strings.track} ${String(num).padStart(2, "0")}` },
      { text: info?.duration != null ? formatDuration(info.duration, minuteDigits) : placeholder },
      ...(ENERGY_ENABLED ? energyAccessories(levelOf(p)) : []),
    ];
  };

  // Tracklist 与 Unsorted 共用同一种行：差别只在 accessories 和 Tracklist 分区的动作。
  const renderMember = (p: Project) =>
    matchesFilter(p, selectedFilter) ? (
      <List.Item
        key={p.id}
        icon={projectIcon(p.kind)}
        title={p.title}
        accessories={showDetail ? [] : trackAccessories(p)}
        detail={showDetail ? renderDetail(p) : undefined}
        actions={renderItemActions(p)}
      />
    ) : null;

  return (
    <List
      navigationTitle={collection.name}
      searchBarPlaceholder={strings.searchTracks}
      isLoading={loading || analyzing}
      isShowingDetail={showDetail}
      searchBarAccessory={
        <List.Dropdown tooltip={strings.filter} value={selectedFilter} onChange={setSelectedFilter}>
          <List.Dropdown.Section title="">
            <List.Dropdown.Item title={strings.all} value="all" icon={Icon.CircleProgress100} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title={strings.stage}>
            {stages.map((option) => (
              <List.Dropdown.Item
                key={`stage:${option.id}`}
                title={option.name}
                value={`stage:${option.id}`}
                keywords={["stage", "stages", strings.stage, ...optionKeywords(option)]}
                icon={option.color ? { source: Icon.Circle, tintColor: option.color } : Icon.Circle}
              />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title={strings.genre}>
            {genres.map((option) => (
              <List.Dropdown.Item
                key={`genre:${option.id}`}
                title={option.name}
                value={`genre:${option.id}`}
                keywords={["genre", "genres", strings.genre, ...optionKeywords(option)]}
                icon={option.color ? { source: Icon.Circle, tintColor: option.color } : Icon.Tag}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {tracked.length === 0 && unsorted.length === 0 ? (
        <List.EmptyView
          title={strings.noCategories}
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
            <List.Section title={strings.unsorted} subtitle={tracked.length === 0 ? analyzingSubtitle : undefined}>
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
      navigationTitle={strings.addProjects}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={strings.add}
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
        <Form.Description text={strings.allProjectsInCollection} />
      ) : (
        <Form.TagPicker id="projects" title={strings.projects} value={ids} onChange={setIds}>
          {candidates.map((p) => (
            <Form.TagPicker.Item key={p.id} value={p.id} title={p.title} icon={projectIcon(p.kind)} />
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
      showToast({ style: Toast.Style.Failure, title: strings.invalidPosition });
      return;
    }
    onSubmit(n === 0 ? null : n); // 0 = 移出
    pop();
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={strings.save} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="n"
        title={strings.trackNumber}
        placeholder={current !== undefined ? String(current) : "1"}
        value={value}
        onChange={setValue}
      />
    </Form>
  );
}
