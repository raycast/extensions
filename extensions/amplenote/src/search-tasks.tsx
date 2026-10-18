import { Action, Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import ConnectionErrorView, { isConnectionError } from "./components/ConnectionErrorView";
import TagDropdown, { UntaggedItem } from "./components/TagDropdown";
import TaskListItem from "./components/TaskListItem";
import { Note, nowSeconds, Task } from "./lib/api";
import { cmd } from "./lib/shortcuts";
import { amplenote } from "./lib/amplenote";
import { reportError } from "./lib/errors";
import { useTaskChanges } from "./lib/useTaskChanges";
import { ALL, matchesTagFilter, useHighlightedTags } from "./lib/tags";
import { dayLabel, isHidden, TaskGroup, taskGroup, taskGroupTitles } from "./lib/tasks";

const COMPLETED = "completed";
const COMPLETED_DAYS = 30;

const groups: TaskGroup[] = ["overdue", "today", "upcoming", "unscheduled"];

export default function SearchTasks() {
  const [filter, setFilter] = useState(ALL);
  const [showHidden, setShowHidden] = useState(false);
  const changes = useTaskChanges();

  const showCompleted = filter === COMPLETED;
  const [completedSince] = useState(() => nowSeconds() - COMPLETED_DAYS * 86400);
  const data = usePromise(amplenote.listOpenTasks, [], { onError: reportError });
  const completed = usePromise(amplenote.getCompletedTasks, [completedSince], {
    execute: showCompleted,
    onError: reportError,
  });
  const notes = usePromise(amplenote.listNotes, [], { onError: reportError });
  const tags = usePromise(amplenote.getTags, [], { onError: reportError });
  const { highlighted, isHighlighted } = useHighlightedTags();

  const notesByUUID = useMemo(
    () => new Map<string, Note>((notes.data ?? []).map((note) => [note.uuid, note])),
    [notes.data],
  );

  const error = data.error ?? notes.error;
  if (error && isConnectionError(error)) {
    return (
      <ConnectionErrorView
        error={error}
        onRetry={() => {
          data.revalidate();
          notes.revalidate();
          tags.revalidate();
        }}
      />
    );
  }

  const refresh = () => {
    void Promise.all([data.revalidate(), notes.revalidate(), showCompleted ? completed.revalidate() : null]).finally(
      changes.reset,
    );
  };

  const visible = changes
    .apply(data.data?.tasks ?? [])
    .filter((task) => showHidden || !isHidden(task))
    .filter((task) => {
      if (filter.startsWith("domain:")) return task.domainUUIDs.includes(filter.slice("domain:".length));
      const note = notesByUUID.get(task.noteUUID);
      return note ? matchesTagFilter(note.tags, filter) : filter === ALL;
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const completedDays = [
    ...[...(completed.data ?? [])]
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
      .reduce((days, task) => {
        const day = task.completedAt ? dayLabel(task.completedAt) : "Unknown";
        const list = days.get(day);
        if (list) list.push(task);
        else days.set(day, [task]);
        return days;
      }, new Map<string, Task[]>())
      .entries(),
  ];

  const hiddenToggle = (
    <Action
      title={showHidden ? "Hide Hidden Tasks" : "Show Hidden Tasks"}
      icon={showHidden ? Icon.EyeDisabled : Icon.Eye}
      shortcut={cmd("h", { shift: true })}
      onAction={() => setShowHidden((value) => !value)}
    />
  );

  return (
    <List
      isLoading={data.isLoading || notes.isLoading || (showCompleted && completed.isLoading)}
      searchBarPlaceholder="Search tasks by text, note, or tag"
      searchBarAccessory={
        <TagDropdown
          tags={tags.data}
          highlighted={highlighted}
          value={filter}
          onChange={setFilter}
          allTitle="All Tasks"
          topItems={
            <>
              <List.Dropdown.Item
                title={`Completed (Last ${COMPLETED_DAYS} Days)`}
                value={COMPLETED}
                icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              />
              <UntaggedItem />
            </>
          }
          extraItems={
            (data.data?.domains.length ?? 0) > 0 ? (
              <List.Dropdown.Section title="Task Domains">
                {data.data?.domains.map((domain) => (
                  <List.Dropdown.Item
                    key={domain.uuid}
                    title={domain.name}
                    value={`domain:${domain.uuid}`}
                    icon={Icon.Layers}
                  />
                ))}
              </List.Dropdown.Section>
            ) : null
          }
        />
      }
    >
      <List.EmptyView
        icon={Icon.CheckCircle}
        title={showCompleted ? "No completed tasks" : "No open tasks"}
        description={
          showCompleted ? `Nothing completed in the last ${COMPLETED_DAYS} days.` : "Nothing matches this filter."
        }
      />
      {showCompleted
        ? completedDays.map(([day, tasks]) => (
            <List.Section key={day} title={day} subtitle={`${tasks.length}`}>
              {changes.apply(tasks).map((task) => (
                <TaskListItem
                  key={task.uuid}
                  task={task}
                  note={notesByUUID.get(task.noteUUID)}
                  tags={tags.data}
                  isHighlighted={isHighlighted}
                  onChange={changes.record}
                  onRefresh={refresh}
                />
              ))}
            </List.Section>
          ))
        : groups.map((group) => {
            const tasks = visible.filter((task) => taskGroup(task) === group);
            if (tasks.length === 0) return null;
            return (
              <List.Section key={group} title={taskGroupTitles[group]} subtitle={`${tasks.length}`}>
                {tasks.map((task) => (
                  <TaskListItem
                    key={task.uuid}
                    task={task}
                    note={notesByUUID.get(task.noteUUID)}
                    tags={tags.data}
                    isHighlighted={isHighlighted}
                    onChange={changes.record}
                    onRefresh={refresh}
                    extraActions={hiddenToggle}
                  />
                ))}
              </List.Section>
            );
          })}
    </List>
  );
}
