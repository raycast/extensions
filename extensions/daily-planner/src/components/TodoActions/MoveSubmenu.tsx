import { Action, ActionPanel, confirmAlert, getPreferenceValues, Icon } from "@raycast/api";
import { timeTracker } from "../../api/time-tracker";
import { getThingsMoveDestiationLists, todoSourceId } from "../../api/todo-source";
import { todoGroupIcon } from "../../helpers/todoListIcons";
import { shortcut } from "../../helpers/shortcut";
import { TodoItem } from "../../helpers/todoList";
import { TodoGroup } from "../../types";
import { UpdateTodoParams } from "./TodoActions";

const { isSyncingProjects } = getPreferenceValues<{ isSyncingProjects: boolean }>();

export default function MoveSubmenu({
  todoItem,
  tieredTodoGroups,
  updateTodo,
}: {
  todoItem: TodoItem;
  tieredTodoGroups: TodoGroup[] | undefined;
  updateTodo: <T>(params: UpdateTodoParams<T>) => Promise<void>;
}) {
  async function moveTodo(group: TodoGroup) {
    const isMoving = group.id !== "";
    const projectName = group.id !== "" ? group.title : "";
    const displayTitle = group.id !== "" ? group.title : todoItem.group?.title ?? "Project";

    if (todoItem.childIds?.length) {
      const isPlural = todoItem.childIds.length > 1;
      const subtasks = isPlural ? "subtasks" : "subtask";
      const separateReminders = isPlural ? "separate Reminders" : "a separate Reminder";
      const isConfirmed = await confirmAlert({
        icon: Icon.Info,
        title: "Move Reminder with Subtasks",
        message: `The ${todoItem.childIds.length} ${subtasks} will also be moved to "${displayTitle}". However, the ${subtasks} will no longer be grouped under this Reminder and will become ${separateReminders}. Do you want to proceed?`,
      });
      if (!isConfirmed) {
        return;
      }
    }

    // Reminders with subtasks: Subtasks should be moved before the parent Reminder. Otherwise,
    // "com.apple.reminderkit error -3002" occurs. Reminder hierarchy won't be preserved due to EventKit limitations.
    await updateTodo({
      data: { group },
      prerequisiteIds: todoItem.childIds,
      sideEffect:
        group.type === "project" && isSyncingProjects && timeTracker !== null
          ? timeTracker.updateTimeEntries(todoItem.id, { projectName })
          : undefined,
      initTitle: (isMoving ? "Moving to " : "Detaching from ") + displayTitle,
      successTitle: (isMoving ? "Moved to " : "Detached from ") + displayTitle,
      successMessage: `"${todoItem.title}" ${isMoving ? "now in" : "detached from"} ${displayTitle}.`,
      failureTitle: `Failed to ${isMoving ? "move to" : "detach from"} ${displayTitle}`,
    });
  }

  return (
    <ActionPanel.Submenu title="Move" icon={Icon.ArrowRight} shortcut={shortcut.moveToList}>
      {todoItem.sourceId === todoSourceId.things ? (
        <ActionPanel.Section>
          {getThingsMoveDestiationLists(todoItem.group, true).map(({ type, id, title, icon }) => (
            <Action
              key={id}
              icon={{ source: icon }}
              title={title}
              onAction={() => void moveTodo({ type, id, title })}
            />
          ))}
        </ActionPanel.Section>
      ) : null}

      {tieredTodoGroups?.flatMap(({ type, id, title, isLocked, subgroups }) =>
        subgroups ? (
          <ActionPanel.Section key={type + id} title={isLocked ? title : undefined}>
            {!isLocked ? (
              <Action title={title} icon={todoGroupIcon[type]} onAction={() => void moveTodo({ type, id, title })} />
            ) : null}

            {subgroups.map(({ type, id, title, isLocked }) =>
              !isLocked ? (
                <Action
                  key={type + id}
                  title={title}
                  icon={todoGroupIcon[type]}
                  onAction={() => void moveTodo({ type, id, title })}
                />
              ) : null
            )}
          </ActionPanel.Section>
        ) : !isLocked ? (
          <Action
            key={type + id}
            title={title}
            icon={todoGroupIcon[type]}
            onAction={() => void moveTodo({ type, id, title })}
          />
        ) : null
      )}
    </ActionPanel.Submenu>
  );
}
