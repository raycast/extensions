import { Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { groupTasks } from "../api/grouping";
import { listProjects } from "../api/tasks";
import type { Scope } from "../api/types";
import { useTasks } from "../hooks/useTasks";
import { resolveCli } from "../preferences";
import { EmptyState } from "./EmptyState";
import { TaskActions, type Optimistic } from "./TaskActions";
import { TaskDetail } from "./TaskDetail";
import { TaskListItem } from "./TaskListItem";

const SCOPE_TITLES: Record<Scope, string> = {
  today: "Today",
  upcoming: "Upcoming",
  inbox: "Inbox",
  all: "All",
};

export type TaskListSource =
  { kind: "scope"; scope: Scope } | { kind: "search" };

/// The one browser. A scope source carries the dropdown so a scope change never
/// means backing out to root search; a search source carries none, because a
/// query already spans every scope.
export function TaskList({ source }: { source: TaskListSource }) {
  const [scope, setScope] = useState<Scope>(
    source.kind === "scope" ? source.scope : "all",
  );
  const [query, setQuery] = useState("");
  // The inline detail panel toggled per-row via "Show/Hide Details" in
  // `TaskActions` — one flag for the whole list, since Raycast's
  // `isShowingDetail` is a List-level switch, not per-item.
  // On by default. Toggling it used to be ↵'s job, which read oddly: Enter
  // "opened" a task but the arrows kept moving between tasks, because
  // Raycast's detail pane cannot take focus. Leaving the panel up makes
  // arrowing the list a live preview — the browsing model people expect —
  // and frees ↵ to actually go into the task. ⌘⇧D still collapses it when
  // the extra list width is worth more (see `TaskActions`).
  const [showingDetail, setShowingDetail] = useState(true);
  /// Today, and only Today, splits its rows around the app's evening divider.
  /// One decision, read in two places — the sectioning below and the panel's
  /// Evening field, which is shown precisely when there is no divider to say it.
  const splitEvening = scope === "today";
  const isSearch = source.kind === "search";
  const { tasks, isLoading, error, revalidate, mutate } = useTasks(
    isSearch ? { kind: "search", query } : { kind: "scope", scope },
  );

  /// Fetched once here, not per row — see the note on `TaskActions`.
  const { data: projects } = useCachedPromise(
    () => listProjects(resolveCli()),
    [],
    {
      initialData: [],
      // A picker that can't load its options shouldn't take down the list —
      // but the user still needs to know it's empty because of a failure,
      // not because there are no projects.
      onError: (error) => {
        void showToast({
          style: Toast.Style.Failure,
          title: "Couldn't load projects",
          message: error.message,
        });
      },
    },
  );

  /// The row moves the moment the key is pressed and reverts if the CLI
  /// refuses — `shouldRevalidateAfter` then reconciles with the real store,
  /// which matters because a reschedule can move a task out of this scope.
  const optimistic: Optimistic = async (apply, action) => {
    try {
      await mutate(action(), {
        optimisticUpdate: apply,
        rollbackOnError: true,
        shouldRevalidateAfter: true,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Ritual",
        message: (error as Error).message,
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      searchBarPlaceholder={
        isSearch
          ? "Search all tasks"
          : `Filter ${SCOPE_TITLES[scope].toLowerCase()}`
      }
      onSearchTextChange={isSearch ? setQuery : undefined}
      throttle={isSearch}
      searchBarAccessory={
        isSearch ? undefined : (
          // Not `storeValue`: Today and Upcoming are separate commands so that
          // each is hotkey-able, and a remembered scope would make one of them
          // open showing the other.
          <List.Dropdown
            tooltip="Scope"
            value={scope}
            onChange={(next) => setScope(next as Scope)}
          >
            {(Object.keys(SCOPE_TITLES) as Scope[]).map((key) => (
              <List.Dropdown.Item
                key={key}
                value={key}
                title={SCOPE_TITLES[key]}
              />
            ))}
          </List.Dropdown>
        )
      }
    >
      {/* Today gets the app's evening divider; the other scopes keep whatever
          sectioning the CLI sent (Upcoming's weeks) or none at all. The panel's
          Evening field is the inverse of this one decision — where the divider
          answers the question, the field would only repeat it. */}
      {groupTasks(tasks, { splitEvening }).map(([heading, rows]) => (
        <List.Section key={heading ?? "ungrouped"} title={heading}>
          {rows.map((task) => (
            <TaskListItem
              key={task.id}
              task={task}
              showingDetail={showingDetail}
              detail={<TaskDetail task={task} showEvening={!splitEvening} />}
              actions={
                <TaskActions
                  task={task}
                  onChanged={revalidate}
                  optimistic={optimistic}
                  projects={projects}
                  showingDetail={showingDetail}
                  onToggleDetail={() => setShowingDetail((s) => !s)}
                />
              }
            />
          ))}
        </List.Section>
      ))}
      <EmptyState
        error={error}
        emptyTitle={isSearch && !query.trim() ? "Type to search" : "All clear"}
        emptyIcon={isSearch ? Icon.MagnifyingGlass : Icon.CheckRosette}
      />
    </List>
  );
}
