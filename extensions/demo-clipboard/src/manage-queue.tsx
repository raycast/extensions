import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { loadQueue, saveQueue } from "./storage";
import { QueueState } from "./types";
import {
  addEmptyItem,
  clearQueue,
  resetToTop,
  updateItemText,
} from "./utils/queue-operations";

const MAX_ITEMS = 50;
const INITIAL_ITEMS = 5;

export default function Command() {
  const [queue, setQueue] = useState<QueueState>({
    items: [],
    currentPosition: 0,
    version: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [itemTexts, setItemTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const loaded = await loadQueue();

      // If queue is empty, initialize with empty items
      if (loaded.items.length === 0) {
        let updatedQueue = loaded;
        for (let i = 0; i < INITIAL_ITEMS; i++) {
          updatedQueue = addEmptyItem(updatedQueue);
        }
        setQueue(updatedQueue);
        await saveQueue(updatedQueue);
      } else {
        setQueue(loaded);
      }

      // Initialize form values from queue
      const texts: Record<string, string> = {};
      loaded.items.forEach((item) => {
        texts[item.id] = item.text;
      });
      setItemTexts(texts);

      setIsLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    try {
      // Update all items with current form values
      let updated = queue;
      queue.items.forEach((item) => {
        const newText = itemTexts[item.id] || "";
        if (newText !== item.text) {
          updated = updateItemText(updated, item.id, newText);
        }
      });

      setQueue(updated);
      await saveQueue(updated);

      await showToast({
        style: Toast.Style.Success,
        title: "Queue saved",
        message: `${updated.items.length} items saved`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleAddField() {
    if (queue.items.length >= MAX_ITEMS) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Maximum items reached",
        message: `You can have up to ${MAX_ITEMS} items`,
      });
      return;
    }

    const updated = addEmptyItem(queue);
    setQueue(updated);
    await saveQueue(updated);

    await showToast({
      style: Toast.Style.Success,
      title: "Field added",
    });
  }

  async function handleClearAll() {
    const confirmed = await confirmAlert({
      title: "Clear All Items?",
      message:
        "This will remove all items from your demo queue. This action cannot be undone.",
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      let updated = clearQueue();
      // Add initial empty items
      for (let i = 0; i < INITIAL_ITEMS; i++) {
        updated = addEmptyItem(updated);
      }

      setQueue(updated);
      setItemTexts({});
      await saveQueue(updated);

      await showToast({
        style: Toast.Style.Success,
        title: "Queue cleared",
      });
    }
  }

  async function handleResetToTop() {
    const updated = resetToTop(queue);
    setQueue(updated);
    await saveQueue(updated);

    await showToast({
      style: Toast.Style.Success,
      title: "Reset to top",
      message: "Queue position reset to first item",
    });
  }

  function handleTextChange(itemId: string, newText: string) {
    setItemTexts({
      ...itemTexts,
      [itemId]: newText,
    });
  }

  const totalItems = queue.items.length;
  const currentPosition = queue.currentPosition;
  const hasMore = currentPosition < totalItems - 1;
  const nextItemIndex = currentPosition < totalItems ? currentPosition : -1;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Queue Actions">
            <Action.SubmitForm
              title="Save Queue"
              icon={Icon.SaveDocument}
              onSubmit={handleSave}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
            <Action
              title="Reset to Top"
              icon={Icon.ArrowCounterClockwise}
              onAction={handleResetToTop}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action
              title="Clear All Items"
              icon={Icon.Trash}
              onAction={handleClearAll}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Manage Fields">
            <Action
              title="Add Field"
              icon={Icon.Plus}
              onAction={handleAddField}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description
        title="Demo Clipboard Queue"
        text={`Current Position: ${currentPosition + 1}/${totalItems} • ${
          hasMore ? "More items to paste" : "At end of queue"
        }`}
      />

      {queue.items.map((item, index) => {
        const isNext = index === nextItemIndex;
        const isPast = index < currentPosition;

        let titlePrefix = `Item ${index + 1}`;
        if (isNext) {
          titlePrefix += " → NEXT";
        } else if (isPast) {
          titlePrefix += " (pasted)";
        }

        return (
          <Form.TextArea
            key={item.id}
            id={item.id}
            title={titlePrefix}
            placeholder="Enter text to paste..."
            value={itemTexts[item.id] || ""}
            onChange={(newText) => handleTextChange(item.id, newText)}
            info={isNext ? "This item will be pasted next" : undefined}
          />
        );
      })}

      <Form.Separator />

      <Form.Description text="Use Cmd+S to save, Cmd+N to add fields, Cmd+R to reset position" />
    </Form>
  );
}
