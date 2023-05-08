import { Action, ActionPanel, getPreferenceValues, Icon } from "@raycast/api";
import { timeTracker } from "../../api/time-tracker";
import { shortcut } from "../../helpers/shortcut";
import { TodoItem } from "../../helpers/todoList";
import { UpdateTodoParams } from "./TodoActions";

const { isSyncingTags } = getPreferenceValues<{ isSyncingTags: boolean }>();

export default function TagSubmenu({
  todoItem,
  todoTags,
  updateTodo,
}: {
  todoItem: TodoItem;
  todoTags: Map<string, string> | undefined;
  updateTodo: <T>(params: UpdateTodoParams<T>) => Promise<void>;
}) {
  const currentTagIds = new Set(todoItem.tags?.map(({ id }) => id));
  const availableTags = todoTags ? Array.from(todoTags).filter(([tagId]) => !currentTagIds.has(tagId)) : undefined;

  async function addTag(id: string, name: string) {
    const tags = todoItem.tags ? todoItem.tags.concat({ id, name }) : [{ id, name }];
    await updateTodo({
      data: { tags },
      sideEffect:
        isSyncingTags && timeTracker !== null
          ? timeTracker.updateTimeEntries(todoItem.id, { tagNames: tags.map(({ name }) => name) })
          : undefined,
      initTitle: "Adding tag",
      successTitle: "Added tag",
      successMessage: `Tag "${name}" added to ${todoItem.title}`,
      failureTitle: "Failed to add tag",
    });
  }

  async function removeTag(id: string, name: string) {
    const tags = todoItem.tags?.filter((tag) => tag.id !== id);
    await updateTodo({
      data: { tags },
      sideEffect:
        isSyncingTags && timeTracker !== null
          ? timeTracker.updateTimeEntries(todoItem.id, { tagNames: tags?.map(({ name }) => name) ?? [] })
          : undefined,
      initTitle: "Removing tag",
      successTitle: "Removed tag",
      successMessage: `Tag "${name}" removed from "${todoItem.title}"`,
      failureTitle: "Failed to remove tag",
    });
  }

  return (
    <>
      {availableTags && availableTags.length > 0 ? (
        <ActionPanel.Submenu icon={Icon.Tag} title="Add Tag" shortcut={shortcut.addTag}>
          {availableTags.map(([id, name]) => (
            <Action key={id} icon={Icon.Tag} title={name} onAction={() => void addTag(id, name)} />
          ))}
        </ActionPanel.Submenu>
      ) : null}

      {todoItem.tags && todoItem.tags.length > 0 && todoTags ? (
        <ActionPanel.Submenu icon={Icon.Tag} title="Remove Tag" shortcut={shortcut.removeTag}>
          {todoItem.tags.map(({ id, name }) => (
            <Action key={id} icon={Icon.Tag} title={name} onAction={() => void removeTag(id, name)} />
          ))}
        </ActionPanel.Submenu>
      ) : null}
    </>
  );
}
