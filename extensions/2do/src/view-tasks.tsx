import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import {
  deadlineSections,
  hasStarted,
  List as TwoDoList,
  scopeArgs,
  sortByCompletionDateDesc,
  sortByStartThenDue,
  Tag,
  Task,
  twoDo,
} from "./2do";
import { loadScopeCounts, titleWithCount } from "./scope-counts";
import { invalidateSmartLists, loadSmartLists } from "./smart-lists";
import { TaskItem } from "./task-item";

const FOCUSES = [
  ["all", "All", Icon.Tray],
  ["now", "Now", Icon.CircleProgress],
  ["later-today", "Later Today", Icon.Clock],
  ["today", "Today", Icon.Calendar],
  ["tomorrow", "Tomorrow", Icon.Calendar],
  ["starred", "Starred", Icon.Star],
  ["scheduled", "Scheduled", Icon.Clock],
  ["deadlines", "Deadlines", Icon.ExclamationMark],
  ["done", "Done", Icon.CheckCircle],
] as const;

const DATED_SCOPES = new Set(["focus:now", "focus:later-today", "focus:today", "focus:tomorrow", "focus:scheduled"]);

function prepareTasks(scope: string, tasks: Task[]): Task[] {
  let shown = tasks;
  if (scope === "focus:now") shown = tasks.filter((t) => hasStarted(t));
  else if (scope === "focus:later-today") shown = tasks.filter((t) => !hasStarted(t));
  else if (scope.startsWith("paused-tag:")) {
    const tagId = scope.slice("paused-tag:".length);
    shown = tasks.filter((t) => t.tags.some((tag) => tag.tag_id === tagId));
  }
  if (DATED_SCOPES.has(scope)) return sortByStartThenDue(shown);
  if (scope === "focus:done") return sortByCompletionDateDesc(shown);
  return shown;
}

export default function Command() {
  const [scope, setScope] = useState<string>();
  const lists = useCachedPromise(() => twoDo<{ list: TwoDoList[] }>("list_lists").then((r) => r.list));
  const smartLists = useCachedPromise(loadSmartLists);
  const pausedTags = useCachedPromise(() =>
    twoDo<{ tags: (Tag & { paused: boolean })[] }>("list_tags").then((r) => r.tags.filter((t) => t.paused)),
  );
  const tasks = useCachedPromise(
    // ponytail: capped at 200 (matters for Done); paginate with offset/total_count if that gets hit
    (scope: string) =>
      twoDo<{ tasks: Task[] }>("query_tasks", { ...scopeArgs(scope), limit: 200 }).then((r) => r.tasks),
    [scope ?? ""],
    { execute: !!scope },
  );

  const countScopes = useMemo(() => {
    if (!lists.data || !smartLists.data || !pausedTags.data) return [];
    return [
      ...FOCUSES.map(([id]) => `focus:${id}`),
      ...pausedTags.data.map((tag) => `paused-tag:${tag.tag_id}`),
      ...lists.data.map((l) => l.collection_id),
      ...smartLists.data.map((l) => l.collection_id),
    ];
  }, [lists.data, smartLists.data, pausedTags.data]);

  // Counts load after catalogs are ready and never block the task list spinner.
  const counts = useCachedPromise((scopes: string[]) => loadScopeCounts(scopes), [countScopes], {
    execute: countScopes.length > 0,
  });

  function reload() {
    void tasks.revalidate();
    invalidateSmartLists();
    void smartLists.revalidate();
    void pausedTags.revalidate();
    void counts.revalidate();
  }

  const shown = scope && tasks.data ? prepareTasks(scope, tasks.data) : undefined;
  const sections: [string, Task[]][] =
    scope === "focus:deadlines" && shown ? deadlineSections(shown) : [["", shown ?? []]];
  const n = (value: string) => counts.data?.[value];

  return (
    <List
      isLoading={tasks.isLoading || lists.isLoading || pausedTags.isLoading}
      searchBarPlaceholder="Filter tasks"
      searchBarAccessory={
        <List.Dropdown tooltip="Scope" storeValue onChange={setScope}>
          <List.Dropdown.Section>
            {FOCUSES.map(([id, title, icon]) => (
              <List.Dropdown.Item
                key={id}
                value={`focus:${id}`}
                title={titleWithCount(title, n(`focus:${id}`))}
                icon={icon}
              />
            ))}
          </List.Dropdown.Section>
          {pausedTags.data && pausedTags.data.length > 0 && (
            <List.Dropdown.Section title="Paused">
              {pausedTags.data.map((tag) => (
                <List.Dropdown.Item
                  key={tag.tag_id}
                  value={`paused-tag:${tag.tag_id}`}
                  title={titleWithCount(`Paused: ${tag.title}`, n(`paused-tag:${tag.tag_id}`))}
                  icon={Icon.Pause}
                />
              ))}
            </List.Dropdown.Section>
          )}
          <List.Dropdown.Section title="Lists">
            {lists.data?.map((l) => (
              <List.Dropdown.Item
                key={l.collection_id}
                value={l.collection_id}
                title={titleWithCount(l.title, n(l.collection_id))}
              />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Smart Lists">
            {smartLists.data?.map((l) => (
              <List.Dropdown.Item
                key={l.collection_id}
                value={l.collection_id}
                title={titleWithCount(l.title, n(l.collection_id))}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!tasks.isLoading && <List.EmptyView icon={Icon.CheckCircle} title="No Tasks" />}
      {sections.map(
        ([title, sectionTasks]) =>
          sectionTasks.length > 0 && (
            <List.Section key={title || "tasks"} title={title || undefined}>
              {sectionTasks.map((t) => (
                <TaskItem key={t.task_id} task={t} onChange={reload} />
              ))}
            </List.Section>
          ),
      )}
    </List>
  );
}
