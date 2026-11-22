import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSettings } from "@/settings";
import { strings } from "@/strings";
import { LOG_PREFIX } from "@/core/log";
import { SortBySubmenu } from "@/core/ui/actions/sort-by-submenu";
import { CopyBounceSection } from "./copy-bounce-section";
import { ShowInFinderAction } from "@/core/ui/actions/show-in-finder";
import { useSortOption } from "@/core/ui/hooks/use-sort-option";
import { sortItems, sortOptionTitle } from "@/core/ui/shared/sorting";
import { groupItems } from "@/core/ui/shared/grouping";
import { canonicalPath, collectBounces, projectBounceSources, unmatchedSharedBounces } from "@/core/projects/bounces";
import {
  mergeBounces,
  readBounceListCache,
  serializeBounceList,
  writeBounceListCache,
} from "@/core/projects/bounce-list";
import type { BounceListItem, BounceOwner } from "@/core/projects/bounce-list";
import type { Project } from "@/core/projects/types";
import { reloadProjectData } from "@/core/ui/shared/reload-projects";
import { BOUNCES_SORT_OPTIONS, BounceGroupSubmenu, Bounces } from "./bounces";
import { formatSize, groupBySource, splitExt } from "./bounce-format";
import { useBounceGroupOption } from "./use-bounce-group-option";
import { AssignBounce } from "./unmatched-bounces";
import { showFailure } from "@/core/ui/shared/toast";
import { itemLimit, limitGroups } from "@/core/ui/shared/progressive-list";
import { useProgressiveList } from "@/core/ui/hooks/use-progressive-list";

const settings = getSettings();
const PROJECTS_ROOT = settings.projectsFolder;

const SEARCH_BOUNCES_SORT_STORAGE_KEY = "search-bounces-sort-option";
// 分组选择现在和别的视图偏好一样存 Cache。键名不变，旧版本存在 LocalStorage 里的值第一次读到时搬过来。
const SEARCH_BOUNCES_GROUP_STORAGE_KEY = "search-bounces-group-by";

// 全部项目的 bounce 汇总：同一个文件只出现一次，标出它属于哪些项目。
export function SearchBouncesView() {
  // 冷启动先显示上次读到的列表，扫描完再替换。
  const [initialCache] = useState(() => readBounceListCache(PROJECTS_ROOT));
  const [items, setItems] = useState<BounceListItem[]>(() => initialCache ?? []);
  // 读到缓存时先不显示加载：扫描完发现没变化就什么都不做。
  const [isLoading, setIsLoading] = useState(initialCache === undefined);
  // 指定项目、打开项目 Bounces 都要用完整项目列表。
  const [projects, setProjects] = useState<Project[]>([]);
  // 读失败且没有缓存可显示时，用出错状态代替「没有 bounce」。
  const [loadFailed, setLoadFailed] = useState(false);
  // 上次写进缓存的列表：打开时刚读出来的那份不重复写。
  const lastWrittenRef = useRef(initialCache);
  // 启动只跑一次：StrictMode 下 effect 会跑两次。
  const startupDoneRef = useRef(false);
  const { showAll, showAllNow } = useProgressiveList(items.length);
  const [sortBy, setSortBy] = useSortOption(SEARCH_BOUNCES_SORT_STORAGE_KEY, BOUNCES_SORT_OPTIONS, "created-desc");
  // 持久化的分组选择（含 "source"）；存的值不认识时用默认。
  // 旧键用 useLocalStorage 存 JSON，所以迁移时要先 JSON.parse。
  const [groupBy, setGroupBy] = useBounceGroupOption(SEARCH_BOUNCES_GROUP_STORAGE_KEY, "created", {
    key: SEARCH_BOUNCES_GROUP_STORAGE_KEY,
    parse: (raw) => {
      try {
        const parsed: unknown = JSON.parse(raw);
        return typeof parsed === "string" ? parsed : raw;
      } catch {
        return raw;
      }
    },
  });

  const reload = useCallback(async () => {
    try {
      const { projects: loaded } = await reloadProjectData(PROJECTS_ROOT, new Set(), {});
      const perProject = loaded.map((project) => {
        const owner: BounceOwner = {
          id: project.id,
          title: project.title,
          folderPath: project.folderPath,
          externalBounceFolders: project.externalBounceFolders,
          externalBounceFiles: project.externalBounceFiles,
        };
        return { owner, bounces: collectBounces(projectBounceSources(project)) };
      });
      const unmatched = unmatchedSharedBounces(loaded.flatMap((project) => project.externalBounceFiles));
      const next = mergeBounces(perProject, unmatched, canonicalPath);
      setProjects(loaded);
      // 内容没变就保留原来的引用，避免多余的重渲染和缓存写入。
      setItems((prev) => (serializeBounceList(prev) === serializeBounceList(next) ? prev : next));
      setLoadFailed(false);
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to load bounces:`, error);
      setLoadFailed(true);
      // 列表保留不动：读失败时旧列表比空列表有用。
      await showFailure(strings.loadProjectsFailed, error, { message: strings.loadProjectsFailedHint });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (startupDoneRef.current) return;
    startupDoneRef.current = true;
    void reload();
  }, [reload]);

  // 列表刷新完就更新缓存：下次冷启动先显示这一份。
  useEffect(() => {
    if (isLoading) return;
    if (items === lastWrittenRef.current) return;
    writeBounceListCache(PROJECTS_ROOT, items);
    lastWrittenRef.current = items;
  }, [isLoading, items]);

  const handleCopy = async (bounce: BounceListItem) => {
    await Clipboard.copy({ file: bounce.path });
    await showToast({ style: Toast.Style.Success, title: strings.bounceCopied, message: bounce.name });
  };

  const sortedProjects = [...projects].sort((a, b) => a.title.localeCompare(b.title));

  const bySort = (list: BounceListItem[]) =>
    sortItems(list, sortBy, (b) => ({ created: b.createdAt, modified: b.modifiedAt, name: b.name, size: b.size }));

  const groups: { key: string; title: string; subtitle: string; items: BounceListItem[] }[] =
    groupBy === "source"
      ? groupBySource(
          items,
          ["project", "shared", "external", "unmatched"],
          (b) => (b.unmatched ? "unmatched" : b.source),
          bySort,
        )
      : groupItems(
          bySort(items),
          groupBy,
          (b) => ({ created: b.createdAt, modified: b.modifiedAt }),
          sortOptionTitle(sortBy),
        );

  // 先渲染前 INITIAL_ITEM_COUNT 项，首帧之后补全。分组和排序已完成，只截掉最后渲染的部分。
  const renderGroups = limitGroups(groups, itemLimit(showAll));

  return (
    <List
      isLoading={isLoading}
      filtering={true}
      onSearchTextChange={(text) => {
        // 一打字就补全，不等计时器。
        if (text) showAllNow();
      }}
      searchBarPlaceholder={strings.searchBounces}
    >
      {renderGroups.length === 0 && loadFailed ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title={strings.loadProjectsFailed}
          description={strings.loadProjectsFailedHint}
          actions={
            <ActionPanel>
              <Action
                title={strings.retry}
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  setIsLoading(true);
                  void reload();
                }}
              />
              <Action title={strings.openExtensionPreferences} icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : renderGroups.length === 0 ? (
        <List.EmptyView icon="bounce.png" title={strings.noBounces} />
      ) : (
        renderGroups.map((group) => (
          <List.Section key={group.key} title={group.title} subtitle={group.subtitle}>
            {group.items.map((b) => (
              <List.Item
                key={b.path}
                title={splitExt(b.name).stem}
                subtitle={splitExt(b.name).ext}
                icon="bounce.png"
                quickLook={{ path: b.path, name: b.name }}
                keywords={b.unmatched ? [...b.owners.map((o) => o.title), "unmatched"] : b.owners.map((o) => o.title)}
                accessories={
                  b.unmatched
                    ? [
                        {
                          icon: { source: Icon.QuestionMarkCircle, tintColor: Color.Orange },
                          tooltip: strings.unmatchedBounceTooltip,
                        },
                        { text: formatSize(b.size) },
                      ]
                    : [{ text: b.owners.map((o) => o.title).join(", ") }, { text: formatSize(b.size) }]
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.ToggleQuickLook />
                      <Action.Open
                        title={strings.openInDefaultApp}
                        icon={Icon.AppWindow}
                        target={b.path}
                        shortcut={Keyboard.Shortcut.Common.Open}
                      />
                      <ShowInFinderAction path={b.path} />
                      {!b.unmatched && b.owners.length > 0 && (
                        <Action.Push
                          title={strings.browseProjectBounces}
                          icon={Icon.Waveform}
                          shortcut={{ modifiers: ["opt"], key: "return" }}
                          target={
                            <Bounces
                              projectId={b.owners[0].id}
                              projectName={b.owners[0].title}
                              projectPath={b.owners[0].folderPath}
                              externalFolders={b.owners[0].externalBounceFolders}
                              externalFiles={b.owners[0].externalBounceFiles}
                              backTitle={strings.backToSearchBounces}
                              onChanged={() => void reload()}
                            />
                          }
                          onPop={() => void reload()}
                        />
                      )}
                      {b.unmatched && projects.length > 0 && (
                        <Action.Push
                          title={strings.assignToProject}
                          icon={Icon.Link}
                          target={
                            <AssignBounce bounce={b} projects={sortedProjects} onAssigned={() => void reload()} />
                          }
                        />
                      )}
                    </ActionPanel.Section>
                    <CopyBounceSection name={b.name} path={b.path} onCopy={() => handleCopy(b)} />
                    <ActionPanel.Section title={strings.sectionArrange}>
                      <BounceGroupSubmenu value={groupBy} onChange={setGroupBy} />
                      <SortBySubmenu allowed={BOUNCES_SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
