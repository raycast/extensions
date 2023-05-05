import { Action, Icon } from "@raycast/api";
import { shortcut } from "../helpers/shortcut";
import TaskBlockTodoList, { TaskBlockTodoListProps } from "./TaskBlockTodoList";

export default function TaskBlockActions(props: TaskBlockTodoListProps) {
  return props.rootTaskBlockItem.blocked ? (
    <>
      <Action.Push
        icon={Icon.BulletPoints}
        title="Show To-Dos"
        shortcut={shortcut.showTaskBlockTodos}
        target={<TaskBlockTodoList {...props} />}
      />

      <Action.OpenInBrowser
        icon={{ source: { light: "light/calendar-event.svg", dark: "dark/calendar-event.svg" } }}
        title="Open in Calendar"
        shortcut={shortcut.openInCalendar}
        url={`ical://ekevent/${props.rootTaskBlockItem.blocked.currentOrNextItem.id}?method=show&options=more`}
      />
    </>
  ) : null;
}
