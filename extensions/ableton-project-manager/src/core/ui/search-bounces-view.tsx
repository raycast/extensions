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
import { useLocalStorage } from "@raycast/utils";
import { getSettings } from "@/settings";
import { getTranslations } from "@/i18n";
import { LOG_PREFIX } from "@/core/log";
import { SortBySubmenu, sortItems, sortOptionTitle, useSortOption } from "@/core/ui/sorting";
import { groupItems } from "@/core/ui/grouping";
import { canonicalPath, collectBounces, projectBounceSources, unmatchedSharedBounces } from "@/core/projects/bounces";
import {
  mergeBounces,
  readBounceListCache,
  serializeBounceList,
  writeBounceListCache,
} from "@/core/projects/bounce-list";
import type { BounceListItem, BounceOwner } from "@/core/projects/bounce-list";
import type { Project } from "@/core/projects/types";
import { reloadProjectData } from "@/core/ui/reload-projects";
import {
  BOUNCES_SORT_OPTIONS,
  BounceGroupSubmenu,
  Bounces,
  formatSize,
  isBounceGroup,
  splitExt,
} from "@/core/ui/bounces";
import type { BounceGroup } from "@/core/ui/bounces";
import { AssignBounce } from "@/core/ui/unmatched-bounces";
import { showFailure } from "@/core/ui/toast";

const settings = getSettings();
const t = getTranslations(settings.language);
const PROJECTS_ROOT = settings.projectsFolder;

const SEARCH_BOUNCES_SORT_STORAGE_KEY = "search-bounces-sort-option";
// useLocalStorage 存的是 JSON，和旧键里的纯字符串不兼容，所以换一个键名。
const SEARCH_BOUNCES_GROUP_STORAGE_KEY = "search-bounces-group-by";

const INITIAL_ITEM_COUNT = 15;
const FILL_DELAY_MS = 0;

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
  const [showAll, setShowAll] = useState(false);
  const [sortBy, setSortBy] = useSortOption(SEARCH_BOUNCES_SORT_STORAGE_KEY, BOUNCES_SORT_OPTIONS, "created-desc");
  // 持久化的分组选择（含 "source"）；存的值不认识时用默认。
  const { value: storedGroupBy, setValue: setStoredGroupBy } = useLocalStorage<string>(
    SEARCH_BOUNCES_GROUP_STORAGE_KEY,
    "created",
  );
  const groupBy: BounceGroup = storedGroupBy && isBounceGroup(storedGroupBy) ? storedGroupBy : "created";
  const setGroupBy = (next: BounceGroup) => {
    void setStoredGroupBy(next);
  };

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
      await showFailure(t.loadProjectsFailed, error, { message: t.loadProjectsFailedHint });
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

  // 首帧只渲染前 INITIAL_ITEM_COUNT 项，这里补全其余部分。
  // 依赖里带 showAll：StrictMode 模拟卸载后重新挂载时会重新设置计时器，不会被清掉后再也不设。
  useEffect(() => {
    if (showAll || items.length === 0) return;
    const timer = setTimeout(() => setShowAll(true), FILL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [showAll, items.length]);

  const handleCopy = async (bounce: BounceListItem) => {
    await Clipboard.copy({ file: bounce.path });
    await showToast({ style: Toast.Style.Success, title: t.bounceCopied, message: bounce.name });
  };

  const sortedProjects = [...projects].sort((a, b) => a.title.localeCompare(b.title));

  const bySort = (list: BounceListItem[]) =>
    sortItems(list, sortBy, (b) => ({ created: b.createdAt, modified: b.modifiedAt, name: b.name, size: b.size }));

  const groups: { key: string; title: string; subtitle: string; items: BounceListItem[] }[] =
    groupBy === "source"
      ? (["project", "shared", "external", "unmatched"] as const)
          .map((kind) => {
            const list = bySort(
              items.filter((b) => (kind === "unmatched" ? b.unmatched : !b.unmatched && b.source === kind)),
            );
            return {
              key: kind,
              title:
                kind === "project"
                  ? t.sourceProjectFolder
                  : kind === "shared"
                    ? t.sourceSharedFolder
                    : kind === "external"
                      ? t.sourceExternal
                      : t.unmatchedBounces,
              subtitle: String(list.length),
              items: list,
            };
          })
          .filter((group) => group.items.length > 0)
      : groupItems(
          bySort(items),
          groupBy,
          (b) => ({ created: b.createdAt, modified: b.modifiedAt }),
          sortOptionTitle(sortBy),
        );

  // 先渲染前 INITIAL_ITEM_COUNT 项，首帧之后补全。分组和排序已完成，只截掉最后渲染的部分。
  const itemLimit = showAll ? Number.POSITIVE_INFINITY : INITIAL_ITEM_COUNT;
  let itemBudget = itemLimit;
  const renderGroups = groups
    .map((group) => {
      const list = group.items.slice(0, Math.max(0, itemBudget));
      itemBudget -= list.length;
      return { ...group, items: list };
    })
    .filter((group) => group.items.length > 0);

  return (
    <List
      isLoading={isLoading}
      filtering={true}
      onSearchTextChange={(text) => {
        // 一打字就补全，不等计时器。
        if (text) setShowAll(true);
      }}
      searchBarPlaceholder={t.searchBounces}
    >
      {renderGroups.length === 0 && loadFailed ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title={t.loadProjectsFailed}
          description={t.loadProjectsFailedHint}
          actions={
            <ActionPanel>
              <Action
                title={t.retry}
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  setIsLoading(true);
                  void reload();
                }}
              />
              <Action title={t.openExtensionPreferences} icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : renderGroups.length === 0 ? (
        <List.EmptyView icon="bounce.png" title={t.noBounces} />
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
                          tooltip: t.unmatchedBounceTooltip,
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
                        title={t.openInDefaultApp}
                        icon={Icon.AppWindow}
                        target={b.path}
                        shortcut={Keyboard.Shortcut.Common.Open}
                      />
                      <Action.ShowInFinder
                        title={t.showInFinder}
                        path={b.path}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
                      />
                      {!b.unmatched && b.owners.length > 0 && (
                        <Action.Push
                          title={t.browseProjectBounces}
                          icon={Icon.Waveform}
                          shortcut={{ modifiers: ["opt"], key: "return" }}
                          target={
                            <Bounces
                              projectId={b.owners[0].id}
                              projectName={b.owners[0].title}
                              projectPath={b.owners[0].folderPath}
                              externalFolders={b.owners[0].externalBounceFolders}
                              externalFiles={b.owners[0].externalBounceFiles}
                              onChanged={() => void reload()}
                            />
                          }
                          onPop={() => void reload()}
                        />
                      )}
                      {b.unmatched && projects.length > 0 && (
                        <Action.Push
                          title={t.assignToProject}
                          icon={Icon.Link}
                          target={
                            <AssignBounce bounce={b} projects={sortedProjects} onAssigned={() => void reload()} />
                          }
                        />
                      )}
                    </ActionPanel.Section>
                    <ActionPanel.Section title={t.sectionCopy}>
                      <Action
                        title={t.copyBounce}
                        icon={Icon.CopyClipboard}
                        shortcut={Keyboard.Shortcut.Common.Copy}
                        onAction={() => handleCopy(b)}
                      />
                      <Action.CopyToClipboard
                        content={b.name}
                        title={t.copyBounceName}
                        icon={Icon.CopyClipboard}
                        shortcut={Keyboard.Shortcut.Common.CopyName}
                      />
                      <Action.CopyToClipboard
                        content={b.path}
                        title={t.copyBouncePath}
                        icon={Icon.CopyClipboard}
                        shortcut={Keyboard.Shortcut.Common.CopyPath}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title={t.sectionArrange}>
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
