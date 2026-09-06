import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMusic } from "./session";
import { PlayerActions } from "./player-actions";

export function QueueView() {
  const { activeId, players, queues, service, run, loading, busy } = useMusic();
  const active = players.find((p) => p.id === activeId);
  const queue = queues.find((q) => q.id === active?.queueId);
  return (
    <List
      navigationTitle={`${service.mode === "demo" ? "Demo " : ""}Queue · ${active?.name ?? "No Active Player"}`}
      isLoading={loading || busy}
    >
      <List.EmptyView title="Queue Is Empty" description="Play a track or add one to the queue from Music." />
      {queue?.entries.map((entry, index) => (
        <List.Item
          key={entry.id}
          title={entry.track.name}
          subtitle={entry.track.artist}
          icon={entry.track.artwork ? { source: entry.track.artwork, fallback: Icon.Music } : Icon.Music}
          accessories={[{ text: index === queue.currentIndex ? "Now Playing" : `${index + 1}` }]}
          actions={
            <ActionPanel>
              {index !== queue.currentIndex && active && (
                <Action
                  title="Remove from Queue"
                  icon={Icon.Trash}
                  onAction={() => run(() => service.removeQueueEntry(active.id, entry.id))}
                />
              )}
              <PlayerActions />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
