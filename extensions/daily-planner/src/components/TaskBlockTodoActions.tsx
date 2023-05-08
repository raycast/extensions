import { Action, ActionPanel, Alert, confirmAlert, Icon } from "@raycast/api";
import { deleteEvent, updateEventURL } from "../api/eventkit";
import {
  appendToTaskBlockURL,
  createTaskBlockURL,
  extractSourceIdedTodoIdsInTaskBlockURL,
  taskBlockName,
} from "../api/todo-source";
import { callFunctionShowingToasts } from "../helpers/actions";
import { formatInterval } from "../helpers/datetime";
import { shortcut } from "../helpers/shortcut";
import { TodoItem } from "../helpers/todoList";
import { Block } from "../types";

async function confirmBlockDeletion(): Promise<boolean> {
  return await confirmAlert({
    icon: Icon.Trash,
    title: `Delete ${taskBlockName}`,
    message: `This ${taskBlockName} will be deleted since there won't be any to-dos left in it. Proceed?`,
    primaryAction: {
      title: "Delete",
      style: Alert.ActionStyle.Destructive,
    },
  });
}

export default function TaskBlockTodoActions({
  todoItem,
  currentBlock,
  availableTaskBlocks,
  revalidateBlocks,
}: {
  todoItem: TodoItem;
  currentBlock: Block;
  availableTaskBlocks: Block[] | undefined;
  revalidateBlocks: () => Promise<Block[]>;
}): JSX.Element {
  async function moveToTaskBlock(destBlock: Block): Promise<void> {
    const remainingTodoItemIds = extractSourceIdedTodoIdsInTaskBlockURL(currentBlock.url).filter(
      (id) => id !== todoItem.id
    );
    const isDeletingBlock = remainingTodoItemIds.length === 0;
    if (!isDeletingBlock || (await confirmBlockDeletion())) {
      const formattedInterval = formatInterval(destBlock);
      await callFunctionShowingToasts({
        async fn() {
          const newDestURL = appendToTaskBlockURL(destBlock.url, todoItem.id);
          const newOrigURL = createTaskBlockURL(remainingTodoItemIds);

          await Promise.all([
            updateEventURL(destBlock.id, newDestURL),
            isDeletingBlock ? deleteEvent(currentBlock.id) : updateEventURL(currentBlock.id, newOrigURL),
          ]);
          await revalidateBlocks();
        },
        initTitle: `Moving to ${taskBlockName} ${formattedInterval}`,
        successTitle: `Moved to ${taskBlockName} ${formattedInterval}`,
        successMessage: `${todoItem.title}`,
        failureTitle: `Failed to move to ${taskBlockName} ${formattedInterval}`,
      });
    }
  }

  async function removeFromTaskBlock(): Promise<void> {
    const remainingTodoItemIds = extractSourceIdedTodoIdsInTaskBlockURL(currentBlock.url).filter(
      (id) => id !== todoItem.id
    );
    const isDeletingBlock = remainingTodoItemIds.length === 0;
    if (!isDeletingBlock || (await confirmBlockDeletion())) {
      const formattedInterval = formatInterval(currentBlock);
      await callFunctionShowingToasts({
        async fn() {
          if (isDeletingBlock) {
            await deleteEvent(currentBlock.id);
          } else {
            const newURL = createTaskBlockURL(remainingTodoItemIds);
            await updateEventURL(currentBlock.id, newURL);
          }
          await revalidateBlocks();
        },
        initTitle: `${isDeletingBlock ? "Deleting" : "Removing from"} ${taskBlockName} ${formattedInterval}`,
        successTitle: `${isDeletingBlock ? "Deleted" : "Removed from"} ${taskBlockName} ${formattedInterval}`,
        successMessage: `${todoItem.title}`,
        failureTitle: `Failed to ${
          isDeletingBlock ? "delete" : "remove from"
        } to ${taskBlockName} ${formattedInterval}`,
      });
    }
  }

  return (
    <ActionPanel.Section>
      {availableTaskBlocks && availableTaskBlocks.length > 0 ? (
        <ActionPanel.Submenu
          icon={{ source: { light: "light/calendar-xmark.svg", dark: "dark/calendar-xmark.svg" } }}
          title={"Move to Another " + taskBlockName}
          shortcut={shortcut.moveBlock}
        >
          {availableTaskBlocks.map((block) => (
            <Action
              key={block.id}
              title={formatInterval({ start: block.start, end: block.end })}
              onAction={() => void moveToTaskBlock(block)}
            />
          ))}
        </ActionPanel.Submenu>
      ) : undefined}

      <Action
        icon={{ source: { light: "light/calendar-xmark.svg", dark: "dark/calendar-xmark.svg" } }}
        title={"Remove from " + taskBlockName}
        shortcut={shortcut.removeFromTaskBlock}
        onAction={() => void removeFromTaskBlock()}
      />
    </ActionPanel.Section>
  );
}
