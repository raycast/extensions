import {
  ActionPanel,
  Action,
  closeMainWindow,
  Color,
  Icon,
  Keyboard,
  List,
  environment,
  showToast,
  Toast,
  trash,
  useNavigation,
  Alert,
  confirmAlert,
  openExtensionPreferences,
} from "@raycast/api";
import { useCallback, useRef, useState } from "react";
import { useAudioPlayer } from "@/core/ui/hooks/use-audio-player";
import { usePlaybackToast } from "@/core/ui/projects/use-playback-toast";
import { useCurrentSets } from "@/core/ui/projects/use-current-sets";
import { useOnboarding } from "@/core/ui/projects/use-onboarding";
import { useProjectList } from "@/core/ui/projects/use-project-list";
import { useReplacedProjects } from "@/core/ui/projects/use-replaced-projects";
import { resetToFirstRun } from "@/core/ui/projects/reset-to-first-run";
import { useDocWatcher } from "@/core/ui/hooks/use-doc-watcher";
import { useMissingDocFolders } from "@/core/ui/hooks/use-missing-doc-folders";
import { getSettings } from "@/settings";
import { deleteProjectMetadata, movePinnedProject, setProjectPinned } from "@/core/metadata/project-metadata";
import { removeProjectFromAllOrders } from "@/core/metadata/collection-order";
import { removeProjectFromAllRoles } from "@/core/metadata/collection-roles";
import { strings } from "@/strings";
import { PlayToggleAction } from "@/core/ui/actions/play-toggle";
import { PlaybackControlsSection } from "@/core/ui/actions/playback-controls";
import { CopyProjectSection } from "@/core/ui/actions/copy-project-section";
import { ViewToggleSection } from "@/core/ui/actions/view-toggle";
import { SortBySubmenu } from "@/core/ui/actions/sort-by-submenu";
import { useSortOption } from "@/core/ui/hooks/use-sort-option";
import { useDetailView } from "@/core/ui/hooks/use-detail-view";
import { sortItems, sortOptionTitle } from "@/core/ui/shared/sorting";
import type { SortOption } from "@/core/ui/shared/sorting";
import { GroupBySubmenu } from "@/core/ui/actions/group-by-submenu";
import { useGroupOption } from "@/core/ui/hooks/use-group-option";
import { groupItems } from "@/core/ui/shared/grouping";
import { Bounces } from "@/core/ui/bounces";
import { archiveDeletedProject, assertDeletionWritable } from "@/core/fs/deleted-projects";
import { showFailure } from "@/core/ui/shared/toast";
import { copyLatestBounce, playProjectBounce } from "@/core/ui/shared/bounce-actions";
import { CollectionList } from "@/core/ui/collections";
import { CleanUpRemovedProjects } from "@/core/ui/cleanup";
import type { Project } from "@/core/projects/types";
import { daw } from "@/daws";
import { SetsView, projectFilesInfo } from "@/daws/ui";
import { labels } from "@/daws/labels";
import { projectIcon } from "@/daws/icons";
import { ProjectDetail } from "@/core/ui/projects/project-detail";
import { projectAccessories } from "@/core/ui/projects/project-accessories";
import {
  ProjectDangerSection,
  ProjectDetailsSection,
  ProjectFileSection,
  ProjectPinSection,
} from "@/core/ui/projects/project-actions";
import { openWithDaw } from "@/core/daw-app";
import { useDawApp } from "@/core/ui/hooks/use-daw-app";
import { useTaxonomies } from "@/core/ui/projects/use-taxonomies";
import { listEmptyState } from "@/core/ui/shared/list-empty-state";
import { optionKeywords } from "@/core/ui/shared/search-keywords";
import { findCurrentSet } from "@/core/projects/current-set";
import { itemLimit, limitGroups } from "@/core/ui/shared/progressive-list";
import { useProgressiveList } from "@/core/ui/hooks/use-progressive-list";
import {
  createdYears,
  filterByDropdown,
  matchProject,
  parseTagSearch,
  projectKeyWords,
  projectSearchTerms,
  splitPinned,
  tagNames,
} from "@/core/ui/projects/project-filter";

const settings = getSettings();
const PROJECTS_ROOT = settings.projectsFolder;
const SORT_STORAGE_KEY = "project-sort-option";
const GROUP_STORAGE_KEY = "project-group-option";
const VIEW_MODE_STORAGE_KEY = "view-mode:projects";
const DETAIL_DOC_STORAGE_KEY = "detail-doc:projects";

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

export function ProjectsView() {
  const { push } = useNavigation();
  const { stageOptions, genreOptions, collectionOptions, reloadCollections } = useTaxonomies();
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useSortOption(SORT_STORAGE_KEY, PROJECT_SORT_OPTIONS, "created-desc");
  const [groupBy, setGroupBy] = useGroupOption(GROUP_STORAGE_KEY, "created");
  // 默认 Detail；只有记过 Overview 才进 Overview。
  const { showDetail, toggleDetail, detailDoc, toggleDetailDoc } = useDetailView({
    viewModeKey: VIEW_MODE_STORAGE_KEY,
    detailDocKey: DETAIL_DOC_STORAGE_KEY,
    defaultMode: "detail",
  });
  const dawApp = useDawApp();
  // 残留数据提示每次打开只弹一次（fs.watch 触发的重载不再重复提示）。
  const leftoverToastShownRef = useRef(false);
  // 这两个回调要等下面的 hook 返回才能拿到，而它们又依赖 projects，所以用 ref 传进去。
  const refreshCurrentSetsRef = useRef<(list: Project[]) => Promise<void>>(async () => {});
  const runOnboardingRef = useRef<() => Promise<void>>(async () => {});
  const reloadProjectsRef = useRef<() => Promise<string[]>>(async () => []);
  const onStartupLoadedRef = useRef<(orphans: string[]) => Promise<void>>(async () => {});

  const { projects, isLoading, loadError, orphanIds, reloadProjects, applyMetadata, refreshDoc, getProjects } =
    useProjectList({
      root: PROJECTS_ROOT,
      trashingIds,
      onAppliedRef: refreshCurrentSetsRef,
      onStartupLoadedRef,
    });
  reloadProjectsRef.current = reloadProjects;
  // 同名旧项目的设置已归档的项目：这些行多出 Restore Previous Settings。
  const { ids: replacedIds, revalidate: revalidateReplaced } = useReplacedProjects(projects);

  // 出错页面上的 Retry：重读期间显示加载，读完再收起。
  const [retrying, setRetrying] = useState(false);
  const retryLoad = useCallback(async () => {
    setRetrying(true);
    try {
      await reloadProjects();
    } finally {
      setRetrying(false);
    }
  }, [reloadProjects]);

  const emptyState = listEmptyState(isLoading || retrying, projects.length, loadError);

  // 首次加载完：残留数据提示只弹一次，然后跑引导。时机和原来一样（加载状态关掉之后）。
  onStartupLoadedRef.current = async (orphans) => {
    if (orphans.length > 0 && !leftoverToastShownRef.current) {
      leftoverToastShownRef.current = true;
      await showToast({
        style: Toast.Style.Success,
        title: strings.leftoversFound,
        message: strings.leftoversFoundMessage.replace("{count}", String(orphans.length)),
        primaryAction: {
          title: strings.cleanUpLeftovers,
          onAction: () => push(<CleanUpRemovedProjects />, () => void reloadProjectsRef.current()),
        },
      });
    }
    await runOnboardingRef.current();
  };

  // 先渲染前 INITIAL_ITEM_COUNT 项，首帧之后补全；一打字也立刻补全。
  const { showAll, showAllNow } = useProgressiveList(projects.length);

  const { playbackStatus, playingId, positionSeconds, durationSeconds, play, pause, resume, stop, seek, restart } =
    useAudioPlayer();

  const { isPlaybackToastActive } = usePlaybackToast(projects, {
    playbackStatus,
    playingId,
    positionSeconds,
    durationSeconds,
  });
  const { currentSets, readingSets, refreshCurrentSets } = useCurrentSets({ isPlaybackToastActive });
  refreshCurrentSetsRef.current = refreshCurrentSets;

  const { runOnboarding } = useOnboarding({ getProjects, reloadProjects });
  runOnboardingRef.current = runOnboarding;

  // 外部编辑器改了笔记 / 歌词：只重读那一份，详情面板马上跟着变。
  useDocWatcher(PROJECTS_ROOT, refreshDoc);

  // 和打开 Set 的其他入口一样：打开后关掉 Raycast 窗口。
  const openCurrentSet = useCallback(async (project: Project) => {
    const sets = daw.listSets(project);
    const set = findCurrentSet(sets);
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
      title: project.pinned ? strings.projectUnpinned : strings.projectPinned,
    });
  };

  const handleMovePinnedProject = async (project: Project, direction: "up" | "down") => {
    await movePinnedProject(project.id, direction);
    await applyMetadata();
  };

  const handleTrashProject = async (project: Project) => {
    const confirmed = await confirmAlert({
      title: strings.moveToTrash,
      icon: Icon.Trash,
      message: `${strings.trashProjectHint}\n${project.title}`,
      primaryAction: { title: strings.moveToTrash, style: Alert.ActionStyle.Destructive },
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
      await showToast({ style: Toast.Style.Success, title: strings.projectMovedToTrash, message: project.title });
    } catch (error) {
      await showFailure(strings.trashProjectFailed, error);
    } finally {
      trashingIds.delete(project.id);
    }
  };

  // 搜索、筛选、排序都只读当前状态，计算本身在 project-filter.ts 里。
  const searchContext = { stageOptions, genreOptions, collectionOptions, currentSets };
  const searchTerms = (project: Project) => projectSearchTerms(project, searchContext);
  const keyWordsOf = (project: Project) => projectKeyWords(project, searchContext);

  // 以 # 开头时用组合搜索（每个词都要命中）；否则交给 Raycast 的模糊搜索。
  const { isTagSearch, isEmptyTagSearch, query } = parseTagSearch(searchText);
  const filteredByDropdown = filterByDropdown(projects, selectedFilter);
  const filteredProjects = isTagSearch
    ? filteredByDropdown.filter((project) => matchProject(project, query, searchContext))
    : filteredByDropdown;

  const { pinned: pinnedProjects, unpinned } = splitPinned(filteredProjects);
  const unpinnedProjects = sortItems(unpinned, sortBy, (project) => ({
    created: project.createdAt,
    modified: project.modifiedAt,
    name: project.title,
  }));

  // 笔记 / 歌词文件夹是否失效：只在打开时查一次，渲染路径不碰磁盘。
  const missingDocFolders = useMissingDocFolders();

  const renderProject = (item: Project) => {
    const stage = stageOptions.find((option) => option.id === item.stageId);
    // 工程文件数在加载项目时已算好，这里只读字段。
    const files = projectFilesInfo(item);
    const isThisPlaying = playingId === item.id;

    return (
      <List.Item
        key={item.id}
        icon={projectIcon(item.kind)}
        title={item.title}
        keywords={[...searchTerms(item), ...keyWordsOf(item)]}
        accessories={showDetail ? [] : projectAccessories({ project: item, stage, files, setsLabel: labels.sets })}
        detail={
          showDetail ? (
            <ProjectDetail
              project={item}
              detailDoc={detailDoc}
              missingDocFolder={missingDocFolders[detailDoc]}
              stage={stage}
              genreNames={tagNames(item.genreIds, genreOptions)}
              collectionNames={tagNames(item.collectionIds, collectionOptions)}
              files={files}
              current={currentSets[item.id]}
            />
          ) : undefined
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Push
                title={files ? files.labels.viewProjectFiles : labels.viewSets}
                icon={Icon.Document}
                target={<SetsView project={item} />}
                onPop={() => void reloadProjects()}
              />
              <PlayToggleAction
                isThisPlaying={isThisPlaying}
                playbackStatus={playbackStatus}
                onPlay={() => playProjectBounce(item, play)}
                onPause={pause}
                onResume={resume}
              />
              <Action
                title={strings.browseBounces}
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
                      backTitle={strings.backToProjects}
                      onChanged={reloadProjects}
                    />,
                    () => void reloadProjects(),
                  );
                }}
              />
              <Action.Push
                title={strings.browseCollections}
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
                  reloadCollections();
                }}
              />
              <Action
                title={files ? files.labels.openLatestProjectFile : labels.openCurrentSet}
                icon={dawApp ? { fileIcon: dawApp.path } : Icon.Document}
                shortcut={Keyboard.Shortcut.Common.Open}
                onAction={() => openCurrentSet(item)}
              />
            </ActionPanel.Section>
            <PlaybackControlsSection
              playingId={playingId}
              playbackStatus={playbackStatus}
              onStop={stop}
              onSeek={seek}
              onRestart={restart}
              onResume={resume}
            />
            <ProjectDetailsSection
              project={item}
              onSaved={() => {
                void reloadProjects();
                revalidateReplaced();
              }}
              hasPreviousSettings={replacedIds.has(item.id)}
            />
            <ProjectFileSection
              project={item}
              dawApp={dawApp}
              projects={projects}
              onChanged={() => void reloadProjects()}
            />
            <CopyProjectSection project={item} onCopyLatestBounce={() => copyLatestBounce(item)} />
            <ProjectPinSection
              project={item}
              onPinToggle={() => handlePinToggle(item)}
              onMovePinned={(direction) => handleMovePinnedProject(item, direction)}
            />
            <ViewToggleSection
              showDetail={showDetail}
              detailDoc={detailDoc}
              onToggleDetail={toggleDetail}
              onToggleDetailDoc={toggleDetailDoc}
            />
            <ActionPanel.Section title={strings.sectionArrange}>
              <GroupBySubmenu allowed={["modified", "created"]} value={groupBy} onChange={setGroupBy} />
              <SortBySubmenu allowed={PROJECT_SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
            </ActionPanel.Section>
            <ProjectDangerSection
              hasOrphans={orphanIds.length > 0}
              onChanged={() => void reloadProjects()}
              onTrash={() => handleTrashProject(item)}
            />
            {environment.isDevelopment && (
              <ActionPanel.Section title={strings.dev}>
                <Action
                  title={strings.resetToFirstRun}
                  icon={{ source: Icon.Power, tintColor: Color.Orange }}
                  onAction={async () => {
                    await resetToFirstRun();
                    // 缓存已清空，当前窗口里的列表还是旧的：关掉窗口，重开才是第一次打开的样子。
                    await closeMainWindow();
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
  const years = createdYears(projects);

  const groups = groupItems(
    unpinnedProjects,
    groupBy,
    (p) => ({ created: p.createdAt, modified: p.modifiedAt }),
    currentSortTitle,
  );
  // 先渲染前 INITIAL_ITEM_COUNT 项，首帧之后补全。分组和排序已完成，只截掉最后渲染的部分。
  const limit = itemLimit(showAll);
  const renderPinned = pinnedProjects.slice(0, limit);
  const renderGroups = limitGroups(groups, limit - renderPinned.length);

  return (
    <List
      isLoading={isLoading || retrying || readingSets}
      isShowingDetail={showDetail}
      filtering={!isTagSearch}
      onSearchTextChange={(text) => {
        setSearchText(text);
        // 一打字就补全，不等计时器。
        if (text) showAllNow();
      }}
      searchBarPlaceholder={strings.searchProjectsPlaceholder}
      searchBarAccessory={
        <List.Dropdown tooltip={strings.filter} value={selectedFilter} onChange={setSelectedFilter}>
          <List.Dropdown.Section title="">
            <List.Dropdown.Item title={strings.all} value="all" icon={Icon.CircleProgress100} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title={strings.stage}>
            {stageOptions.map((option) => (
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
            {genreOptions.map((option) => (
              <List.Dropdown.Item
                key={`genre:${option.id}`}
                title={option.name}
                value={`genre:${option.id}`}
                keywords={["genre", "genres", strings.genre, ...optionKeywords(option)]}
                icon={option.color ? { source: Icon.Circle, tintColor: option.color } : Icon.Tag}
              />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title={strings.created}>
            {years.map((year) => (
              <List.Dropdown.Item
                key={`created:${year}`}
                title={String(year)}
                value={`created:${year}`}
                keywords={["created", "year", strings.created]}
                icon={Icon.Calendar}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {emptyState === "error" && (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title={strings.loadProjectsFailed}
          description={loadError ?? undefined}
          actions={
            <ActionPanel>
              <Action title={strings.retry} icon={Icon.ArrowClockwise} onAction={retryLoad} />
              <Action title={strings.openExtensionPreferences} icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      )}
      {emptyState === "empty" && (
        <List.EmptyView
          icon="icon.png"
          title={labels.noProjectsFound}
          description={labels.noProjectsFoundHint.replace("{folder}", PROJECTS_ROOT)}
          actions={
            <ActionPanel>
              <Action title={strings.openExtensionPreferences} icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action.Open title={strings.openProjectsFolder} icon={Icon.Finder} target={PROJECTS_ROOT} />
            </ActionPanel>
          }
        />
      )}
      {isEmptyTagSearch && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={strings.advancedSearch}
          description={strings.advancedSearchHint}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title={strings.openReadme} icon={Icon.QuestionMark} url={daw.readmeUrl} />
            </ActionPanel>
          }
        />
      )}
      {!isEmptyTagSearch && renderPinned.length > 0 && (
        <List.Section title={strings.pinned}>{renderPinned.map(renderProject)}</List.Section>
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
