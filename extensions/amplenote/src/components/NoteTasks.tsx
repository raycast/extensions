import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { Note, noteAppUrl, noteTitle, Tag } from "../lib/api";
import { amplenote } from "../lib/amplenote";
import { reportError } from "../lib/errors";
import { useTaskChanges } from "../lib/useTaskChanges";
import { useHighlightedTags } from "../lib/tags";
import AddTaskForm from "./AddTaskForm";
import ConnectionErrorView, { isConnectionError } from "./ConnectionErrorView";
import TaskListItem from "./TaskListItem";

export default function NoteTasks(props: { note: Note; tags?: Tag[] }) {
  const { note } = props;
  const tasks = usePromise(amplenote.getNoteTasks, [note.uuid], { onError: reportError });
  const changes = useTaskChanges();
  const { isHighlighted } = useHighlightedTags();
  const visible = changes.apply(tasks.data ?? []);

  if (isConnectionError(tasks.error)) {
    return <ConnectionErrorView error={tasks.error} isLoading={tasks.isLoading} onRetry={() => tasks.revalidate()} />;
  }

  return (
    <List navigationTitle={noteTitle(note)} isLoading={tasks.isLoading} searchBarPlaceholder="Filter tasks">
      <List.EmptyView
        icon={Icon.CheckCircle}
        title="No open tasks in this note"
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Task"
              icon={Icon.Plus}
              target={<AddTaskForm note={note} onCreated={tasks.revalidate} />}
            />
            <Action.Open
              title="Open Note in Amplenote"
              icon={Icon.AppWindow}
              target={noteAppUrl(note.uuid)}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          </ActionPanel>
        }
      />
      {visible.map((task) => (
        <TaskListItem
          key={task.uuid}
          task={task}
          tags={props.tags}
          isHighlighted={isHighlighted}
          onChange={changes.record}
          onRefresh={() => changes.refresh(tasks.revalidate)}
          addTaskNote={note}
        />
      ))}
    </List>
  );
}
