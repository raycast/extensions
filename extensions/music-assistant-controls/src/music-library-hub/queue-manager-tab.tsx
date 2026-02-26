import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import MusicAssistantClient from "../music-assistant/music-assistant-client";
import { getSelectedQueueID } from "../player-selection/use-selected-player-id";
import { commandOrControlShortcut } from "../shortcuts/shortcuts";
import { QueueManagerData } from "./types";

interface QueueManagerTabProps {
  client: MusicAssistantClient;
}

export function QueueManagerTab({ client }: QueueManagerTabProps) {
  const { data: queueId } = useCachedPromise(async () => await getSelectedQueueID(), []);

  const {
    isLoading,
    data: queueData,
    revalidate,
  } = useCachedPromise(
    async (selectedQueueId: string | undefined): Promise<QueueManagerData | null> => {
      if (!selectedQueueId) return null;

      const [queue, items] = await Promise.all([
        client.getPlayerQueue(selectedQueueId),
        client.getPlayerQueueItems(selectedQueueId, 100, 0),
      ]);

      return { queue, items };
    },
    [queueId],
    {
      keepPreviousData: true,
      execute: !!queueId,
    },
  );

  const deleteItem = async (itemId: string, itemName: string) => {
    if (!queueId) return;

    try {
      await client.queueCommandDelete(queueId, itemId);
      await showToast({
        style: Toast.Style.Success,
        title: "Removed from Queue",
        message: `"${itemName}" removed`,
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Remove Item",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const moveItem = async (itemId: string, direction: "up" | "down" | "next") => {
    if (!queueId) return;

    const posShift = client.getQueueMovePositionShift(direction);

    try {
      await client.queueCommandMoveItem(queueId, itemId, posShift);
      await showToast({
        style: Toast.Style.Success,
        title: "Item Moved",
        message: client.getQueueMoveFeedback(direction),
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Move Item",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const clearQueue = async () => {
    if (!queueId) return;

    const confirmed = await confirmAlert({
      title: "Clear Queue",
      message: "Are you sure you want to clear all items from the queue?",
      primaryAction: {
        title: "Clear Queue",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      await client.queueCommandClear(queueId);
      await showToast({
        style: Toast.Style.Success,
        title: "Queue Cleared",
        message: "All items removed from queue",
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Clear Queue",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const toggleShuffle = async () => {
    if (!queueId || !queueData?.queue) return;

    try {
      await client.queueCommandShuffle(queueId, !queueData.queue.shuffle_enabled);
      await showToast({
        style: Toast.Style.Success,
        title: "Shuffle Toggled",
        message: queueData.queue.shuffle_enabled ? "Shuffle disabled" : "Shuffle enabled",
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Toggle Shuffle",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const cycleRepeat = async () => {
    if (!queueId || !queueData?.queue) return;

    const nextMode = client.getNextRepeatMode(queueData.queue.repeat_mode);

    try {
      await client.queueCommandRepeat(queueId, nextMode);
      await showToast({
        style: Toast.Style.Success,
        title: "Repeat Mode Changed",
        message: `Repeat: ${nextMode}`,
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Change Repeat Mode",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  if (!queueId) {
    return (
      <List.Section title="Queue Manager">
        <List.Item
          title="No Active Player"
          subtitle="Please select an active player using 'Set Active Player' command"
          icon={Icon.XMarkCircle}
        />
      </List.Section>
    );
  }

  return (
    <List.Section
      title="Queue Manager"
      subtitle={
        queueData?.queue
          ? `${queueData.items?.length || 0} items | Shuffle: ${queueData.queue.shuffle_enabled ? "On" : "Off"} | Repeat: ${queueData.queue.repeat_mode}`
          : undefined
      }
    >
      {queueData?.queue && (
        <List.Item
          title="Queue Controls"
          icon={Icon.Gear}
          actions={
            <ActionPanel>
              <Action title="Toggle Shuffle" icon={Icon.Shuffle} onAction={toggleShuffle} />
              <Action title="Cycle Repeat Mode" icon={Icon.Repeat} onAction={cycleRepeat} />
              <Action title="Clear Queue" icon={Icon.Trash} style={Action.Style.Destructive} onAction={clearQueue} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={commandOrControlShortcut("r")}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      )}

      {isLoading && <List.Item title="Loading queue..." icon={Icon.Clock} />}

      {!isLoading && (!queueData?.items || queueData.items.length === 0) && (
        <List.Item title="Queue is empty" icon={Icon.List} />
      )}

      {!isLoading &&
        queueData?.items?.map((item, index) => (
          <List.Item
            key={item.queue_item_id}
            title={`${index + 1}. ${item.name}`}
            subtitle={item.media_item ? "Available" : "Unavailable"}
            icon={item.available ? Icon.Dot : Icon.Circle}
            accessories={[{ text: item.duration ? client.formatDuration(item.duration) : "" }]}
            actions={
              <ActionPanel>
                <Action
                  title="Move to Next"
                  icon={Icon.ArrowRight}
                  onAction={() => moveItem(item.queue_item_id, "next")}
                />
                <Action
                  title="Move up"
                  icon={Icon.ArrowUp}
                  shortcut={commandOrControlShortcut("arrowUp")}
                  onAction={() => moveItem(item.queue_item_id, "up")}
                />
                <Action
                  title="Move Down"
                  icon={Icon.ArrowDown}
                  shortcut={commandOrControlShortcut("arrowDown")}
                  onAction={() => moveItem(item.queue_item_id, "down")}
                />
                <Action
                  title="Remove from Queue"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={commandOrControlShortcut("backspace")}
                  onAction={() => deleteItem(item.queue_item_id, item.name)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={commandOrControlShortcut("r")}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        ))}
    </List.Section>
  );
}
