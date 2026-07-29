import { Action, ActionPanel, Icon, List } from "@raycast/api";

import { executeElsewhereCommand } from "./command-runner";
import { ElsewhereStateList } from "./elsewhere-state-list";
import { activeMusicTrackStatus } from "./music-state";

export default function Command() {
  return (
    <ElsewhereStateList searchBarPlaceholder="Search background music…">
      {(snapshot, refresh) => (
        <List.Section title="Background Music" subtitle={snapshot.backgroundMusicEnabled ? "On" : "Off"}>
          {snapshot.musicTracks.map((track) => {
            const isActive = track.id === snapshot.activeMusicTrackId;
            return (
              <List.Item
                key={track.id}
                icon={Icon.Music}
                title={track.name}
                accessories={isActive ? [{ text: activeMusicTrackStatus(snapshot.backgroundMusicEnabled) }] : undefined}
                actions={
                  <ActionPanel>
                    {isActive ? (
                      <Action title="Refresh Background Music" icon={Icon.ArrowClockwise} onAction={refresh} />
                    ) : (
                      <Action
                        title={`Switch to ${track.name}`}
                        icon={Icon.Music}
                        onAction={() =>
                          executeElsewhereCommand(
                            { kind: "music", action: "select", id: track.id },
                            { successTitle: `Switched to ${track.name}`, onSettled: refresh },
                          )
                        }
                      />
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </ElsewhereStateList>
  );
}
