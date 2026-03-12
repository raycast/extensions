import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Icon,
  Color,
  Clipboard,
  useNavigation,
  Form,
} from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import { loadQueue, saveQueue } from "./storage";
import { QueueState } from "./types";
import {
  addEmptyItem,
  insertItemAt,
  clearQueue,
  resetToTop,
  updateItemText,
  moveItemUp,
  moveItemDown,
  removeItem,
} from "./utils/queue-operations";

const MAX_ITEMS = 50;

function EditItemForm({
  itemId,
  initialText,
  onSave,
}: {
  itemId: string;
  initialText: string;
  onSave: (id: string, text: string) => void;
}) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Item"
            icon={Icon.SaveDocument}
            onSubmit={(values: { text: string }) => {
              onSave(itemId, values.text);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title="Item Text" defaultValue={initialText} placeholder="Enter text to paste..." />
    </Form>
  );
}

export default function Command() {
  const [queue, setQueue] = useState<QueueState>({
    items: [],
    currentPosition: 0,
    version: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const queueRef = useRef(queue);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    async function load() {
      let loaded = await loadQueue();
      if (loaded.items.length === 0) {
        loaded = addEmptyItem(loaded);
        await saveQueue(loaded);
      }
      setQueue(loaded);
      setIsLoading(false);
    }
    load();
  }, []);

  const persist = useCallback(async (updated: QueueState) => {
    queueRef.current = updated;
    setQueue(updated);
    await saveQueue(updated);
  }, []);

  function nextItemId(q: QueueState): string | undefined {
    return q.items[q.currentPosition]?.id;
  }

  function positionFollowingItem(updated: QueueState, trackId: string | undefined): QueueState {
    if (!trackId) return updated;
    const newIndex = updated.items.findIndex((item) => item.id === trackId);
    if (newIndex !== -1 && newIndex !== updated.currentPosition) {
      return { ...updated, currentPosition: newIndex };
    }
    return updated;
  }

  async function handleSetAsNext(itemId: string) {
    const current = queueRef.current;
    const index = current.items.findIndex((item) => item.id === itemId);
    if (index === -1) return;
    if (index === current.currentPosition) {
      await showToast({ style: Toast.Style.Success, title: "Already set as next" });
      return;
    }
    await persist({ ...current, currentPosition: index });
    await showToast({
      style: Toast.Style.Success,
      title: `Item #${index + 1} set as next`,
    });
  }

  async function handleMoveUp(itemId: string) {
    const current = queueRef.current;
    const trackId = nextItemId(current);
    let updated = moveItemUp(current, itemId);
    if (updated === current) return;
    updated = positionFollowingItem(updated, trackId);
    await persist(updated);
  }

  async function handleMoveDown(itemId: string) {
    const current = queueRef.current;
    const trackId = nextItemId(current);
    let updated = moveItemDown(current, itemId);
    if (updated === current) return;
    updated = positionFollowingItem(updated, trackId);
    await persist(updated);
  }

  async function handleEditSave(itemId: string, newText: string) {
    const updated = updateItemText(queueRef.current, itemId, newText);
    await persist(updated);
  }

  async function handleAddItemAbove(itemId: string) {
    const current = queueRef.current;
    if (current.items.length >= MAX_ITEMS) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Maximum items reached",
        message: `You can have up to ${MAX_ITEMS} items`,
      });
      return;
    }
    const index = current.items.findIndex((item) => item.id === itemId);
    if (index === -1) return;
    const clipboardText = (await Clipboard.readText()) || "";
    const updated = insertItemAt(current, index, clipboardText);
    await persist(updated);
  }

  async function handleAddItemBelow(itemId: string) {
    const current = queueRef.current;
    if (current.items.length >= MAX_ITEMS) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Maximum items reached",
        message: `You can have up to ${MAX_ITEMS} items`,
      });
      return;
    }
    const index = current.items.findIndex((item) => item.id === itemId);
    if (index === -1) return;
    const clipboardText = (await Clipboard.readText()) || "";
    const updated = insertItemAt(current, index + 1, clipboardText);
    await persist(updated);
  }

  async function handleRemoveItem(itemId: string) {
    const updated = removeItem(queueRef.current, itemId);
    await persist(updated);
  }

  async function handleClearAll() {
    const confirmed = await confirmAlert({
      title: "Clear All Items?",
      message: "This will remove all items from your demo queue. This action cannot be undone.",
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      let updated = clearQueue();
      updated = addEmptyItem(updated);
      await persist(updated);
    }
  }

  async function handleResetToTop() {
    const updated = resetToTop(queueRef.current);
    await persist(updated);
    await showToast({
      style: Toast.Style.Success,
      title: "Reset to top",
      message: "Queue position reset to first item",
    });
  }

  const totalItems = queue.items.length;
  const position = queue.currentPosition;
  const remaining = totalItems - position;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter queue items...">
      <List.Section
        title="Demo Queue"
        subtitle={`Position ${position + 1}/${totalItems} • ${remaining > 0 ? `${remaining} remaining` : "Done"}`}
      >
        {queue.items.map((item, index) => {
          const isNext = index === queue.currentPosition;
          const isPast = index < queue.currentPosition;
          const displayText = item.text || "(empty)";
          const lines = displayText.split("\n");
          const firstLine = lines[0].length > 80 ? lines[0].substring(0, 80) + "…" : lines[0];
          const hasMoreLines = lines.length > 1;

          return (
            <List.Item
              key={item.id}
              id={item.id}
              title={firstLine}
              subtitle={hasMoreLines ? `+${lines.length - 1} more lines` : undefined}
              icon={
                isNext
                  ? { source: Icon.ArrowRight, tintColor: Color.Green }
                  : isPast
                  ? { source: Icon.Checkmark, tintColor: Color.SecondaryText }
                  : Icon.Circle
              }
              accessories={[
                { text: `#${index + 1}` },
                ...(isNext
                  ? [{ tag: { value: "NEXT", color: Color.Green } }]
                  : isPast
                  ? [{ tag: { value: "pasted", color: Color.SecondaryText } }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Edit">
                    <Action.Push
                      title="Edit Item"
                      icon={Icon.Pencil}
                      target={<EditItemForm itemId={item.id} initialText={item.text} onSave={handleEditSave} />}
                    />
                    {!isNext && (
                      <Action
                        title="Set as Next"
                        icon={{ source: Icon.ArrowRight, tintColor: Color.Green }}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                        onAction={() => handleSetAsNext(item.id)}
                      />
                    )}
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Reorder">
                    <Action
                      title="Move Up"
                      icon={Icon.ArrowUp}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                      onAction={() => handleMoveUp(item.id)}
                    />
                    <Action
                      title="Move Down"
                      icon={Icon.ArrowDown}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                      onAction={() => handleMoveDown(item.id)}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Manage">
                    <Action
                      title="Add Item Above"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      onAction={() => handleAddItemAbove(item.id)}
                    />
                    <Action
                      title="Add Item Below"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                      onAction={() => handleAddItemBelow(item.id)}
                    />
                    <Action
                      title="Remove Item"
                      icon={Icon.Minus}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={() => handleRemoveItem(item.id)}
                    />
                    <Action
                      title="Reset to Top"
                      icon={Icon.ArrowCounterClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={handleResetToTop}
                    />
                    <Action
                      title="Clear All Items"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                      onAction={handleClearAll}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
