import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { Player } from "../domain/model";
import { nextRepeat } from "../domain/policy";
import { SessionRoute, useMusic } from "./session";
import { shortcuts } from "./shortcuts";

function ChoosePlayerView() {
  const { players, activeId, controller, run, busy } = useMusic();
  return (
    <List navigationTitle="Choose Active Player" isLoading={busy} searchBarPlaceholder="Search players…">
      {players.map((player) => (
        <List.Item
          key={player.id}
          title={player.name}
          subtitle={player.provider}
          icon={Icon.Speaker}
          accessories={[{ text: player.id === activeId ? "Active" : player.available ? "Enter to Select" : "Offline" }]}
          actions={
            <ActionPanel>
              <Action
                title="Set Active Player"
                icon={Icon.Checkmark}
                onAction={() => run(() => controller.select(player.id), `${player.name} selected`)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/** Volume/mute target a highlighted player; transport/repeat/shuffle always target the saved active player. */
export function PlayerActions({ highlighted }: { highlighted?: Player }) {
  const { players, queues, activeId, controller, service, run } = useMusic();
  const active = players.find((p) => p.id === activeId);
  const target = highlighted ?? active;
  const queue = queues.find((q) => q.id === active?.queueId);
  return (
    <>
      <ActionPanel.Section title={active ? `Playback · ${active.name}` : "Playback · No Active Player"}>
        {!active && (
          <Action.Push
            title="Choose Active Player"
            icon={Icon.Speaker}
            target={
              <SessionRoute>
                <ChoosePlayerView />
              </SessionRoute>
            }
          />
        )}
        <Action
          title="Play/Pause"
          icon={Icon.Play}
          shortcut={shortcuts.playPause}
          onAction={() => run(() => controller.playback("play-pause"))}
        />
        <Action
          title="Next Track"
          icon={Icon.Forward}
          shortcut={shortcuts.next}
          onAction={() => run(() => controller.playback("next"))}
        />
        <Action
          title="Previous Track"
          icon={Icon.Rewind}
          shortcut={shortcuts.previous}
          onAction={() => run(() => controller.playback("previous"))}
        />
        {queue && active && (
          <>
            <Action
              title={`Repeat: ${queue.repeat === "off" ? "Off → Track" : queue.repeat === "one" ? "Track → Queue" : "Queue → Off"}`}
              icon={Icon.Repeat}
              shortcut={shortcuts.repeat}
              onAction={() => run(() => service.setRepeat(active.id, nextRepeat(queue.repeat)))}
            />
            <Action
              title={queue.shuffle ? "Turn Shuffle off" : "Turn Shuffle on"}
              icon={Icon.Shuffle}
              shortcut={shortcuts.shuffle}
              onAction={() => run(() => service.setShuffle(active.id, !queue.shuffle))}
            />
          </>
        )}
      </ActionPanel.Section>
      {target?.available && (
        <ActionPanel.Section title={`Volume · ${target.name}`}>
          {target.capabilities.volume && target.volume !== undefined && (
            <>
              <Action
                title="Volume up (5%)"
                icon={Icon.Plus}
                shortcut={shortcuts.volumeUp}
                onAction={() =>
                  run(async () => {
                    const latest = (await service.getPlayers()).find((p) => p.id === target.id);
                    if (latest?.volume !== undefined) await service.setVolume(target.id, latest.volume + 5);
                  })
                }
              />
              <Action
                title="Volume Down (5%)"
                icon={Icon.Minus}
                shortcut={shortcuts.volumeDown}
                onAction={() =>
                  run(async () => {
                    const latest = (await service.getPlayers()).find((p) => p.id === target.id);
                    if (latest?.volume !== undefined) await service.setVolume(target.id, latest.volume - 5);
                  })
                }
              />
            </>
          )}
          {target.capabilities.mute && (
            <Action
              title={target.muted ? "Unmute Player" : "Mute Player"}
              icon={Icon.Speaker}
              shortcut={shortcuts.mute}
              onAction={() => run(() => service.setMuted(target.id, !target.muted))}
            />
          )}
        </ActionPanel.Section>
      )}
    </>
  );
}
