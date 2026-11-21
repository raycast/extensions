import { KeyboardShortcutsAction } from "./shortcut-settings-view";
import { Action, ActionPanel, Color, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { useMusic, SessionRoute } from "./session";
import { PlayerActions } from "./player-actions";
import { QueueView } from "./queue-view";
import { useShortcuts } from "./use-shortcuts";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function NowPlayingView() {
  const shortcuts = useShortcuts();
  const { activeId, players, queues, service, bridge, run, refresh, loading, busy } = useMusic();
  const active = players.find((p) => p.id === activeId);
  const queue = queues.find((q) => q.id === active?.queueId);
  const currentIndex = queue?.currentIndex ?? null;
  const currentEntry = queue && currentIndex !== null ? queue.entries[currentIndex] : undefined;
  const currentTrack = currentEntry?.track;

  const navTitle = `${service.mode === "demo" ? "Demo " : ""}Now Playing · ${active?.name ?? "No Active Player"}`;

  if (!active) {
    return (
      <Detail
        navigationTitle={navTitle}
        isLoading={loading || busy}
        markdown={`# No Active Player\n\nPlease select a player in the **Players** view or action panel to display playback information.`}
        actions={
          <ActionPanel>
            <PlayerActions />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={shortcuts.refresh}
              onAction={() => run(refresh)}
            />
            <KeyboardShortcutsAction />
            <Action
              title="Extension Preferences"
              icon={Icon.Gear}
              shortcut={shortcuts.preferences}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (!currentTrack) {
    return (
      <Detail
        navigationTitle={navTitle}
        isLoading={loading || busy}
        markdown={`# Nothing Playing\n\n**Player:** ${active.name}\n\n**Status:** ${active.state}\n\nSelect a track, album, or artist from the library to begin playback.`}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Player" text={active.name} icon={Icon.Speaker} />
            <Detail.Metadata.TagList title="Playback State">
              <Detail.Metadata.TagList.Item
                text={active.state === "playing" ? "Playing" : active.state === "paused" ? "Paused" : "Idle"}
                color={
                  active.state === "playing"
                    ? Color.Green
                    : active.state === "paused"
                      ? Color.Yellow
                      : Color.SecondaryText
                }
              />
            </Detail.Metadata.TagList>
            {active.capabilities.volume && active.volume !== undefined && (
              <Detail.Metadata.Label
                title="Volume"
                text={active.muted ? `${active.volume}% (Muted)` : `${active.volume}%`}
                icon={active.muted ? Icon.SpeakerOff : Icon.SpeakerOn}
              />
            )}
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <PlayerActions />
            <ActionPanel.Section title="Workspace">
              <Action.Push
                title="Show Queue"
                icon={Icon.List}
                shortcut={shortcuts.queue}
                target={
                  <SessionRoute sessionBridge={bridge}>
                    <QueueView />
                  </SessionRoute>
                }
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={shortcuts.refresh}
                onAction={() => run(refresh)}
              />
              <KeyboardShortcutsAction />
              <Action
                title="Extension Preferences"
                icon={Icon.Gear}
                shortcut={shortcuts.preferences}
                onAction={openExtensionPreferences}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  const artworkMarkdown = currentTrack.artwork ? `![${currentTrack.name}](${currentTrack.artwork})\n\n` : "";
  const markdown = `${artworkMarkdown}# ${currentTrack.name}\n### ${currentTrack.artist}${currentTrack.album ? ` · *${currentTrack.album}*` : ""}`;

  return (
    <Detail
      navigationTitle={navTitle}
      isLoading={loading || busy}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Track" text={currentTrack.name} />
          <Detail.Metadata.Label title="Artist" text={currentTrack.artist} />
          {currentTrack.album ? <Detail.Metadata.Label title="Album" text={currentTrack.album} /> : null}
          {currentTrack.duration > 0 ? (
            <Detail.Metadata.Label title="Duration" text={formatDuration(currentTrack.duration)} />
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Player" text={active.name} icon={Icon.Speaker} />
          <Detail.Metadata.TagList title="Playback State">
            <Detail.Metadata.TagList.Item
              text={active.state === "playing" ? "Playing" : active.state === "paused" ? "Paused" : "Idle"}
              color={
                active.state === "playing"
                  ? Color.Green
                  : active.state === "paused"
                    ? Color.Yellow
                    : Color.SecondaryText
              }
            />
          </Detail.Metadata.TagList>
          {active.capabilities.volume && active.volume !== undefined && (
            <Detail.Metadata.Label
              title="Volume"
              text={active.muted ? `${active.volume}% (Muted)` : `${active.volume}%`}
              icon={active.muted ? Icon.SpeakerOff : Icon.SpeakerOn}
            />
          )}
          {queue && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Queue Position"
                text={`${(currentIndex ?? 0) + 1} of ${queue.entries.length}`}
              />
              <Detail.Metadata.Label
                title="Repeat"
                text={queue.repeat === "off" ? "Off" : queue.repeat === "one" ? "Track" : "All"}
                icon={Icon.Repeat}
              />
              <Detail.Metadata.Label title="Shuffle" text={queue.shuffle ? "On" : "Off"} icon={Icon.Shuffle} />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <PlayerActions />
          <ActionPanel.Section title="Workspace">
            <Action.Push
              title="Show Queue"
              icon={Icon.List}
              shortcut={shortcuts.queue}
              target={
                <SessionRoute sessionBridge={bridge}>
                  <QueueView />
                </SessionRoute>
              }
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={shortcuts.refresh}
              onAction={() => run(refresh)}
            />
            <KeyboardShortcutsAction />
            <Action
              title="Extension Preferences"
              icon={Icon.Gear}
              shortcut={shortcuts.preferences}
              onAction={openExtensionPreferences}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
