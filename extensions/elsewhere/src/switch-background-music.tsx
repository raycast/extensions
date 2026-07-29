import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";

import { executeElsewhereCommand } from "./command-runner";
import { ElsewhereStateList } from "./elsewhere-state-list";
import { activeMusicTrackStatus } from "./music-state";

const musicTrackIcons: Record<string, Icon> = {
  "lo-fi": Icon.Headphones,
  "quiet-canopy": Icon.Leaf,
  "night-lines": Icon.Moon,
  "pressure-system": Icon.Cloud,
  "gathering-light": Icon.Sunrise,
};

function musicTrackIcon(trackId: string) {
  return {
    source: musicTrackIcons[trackId] ?? Icon.Music,
    tintColor: Color.SecondaryText,
  };
}

export default function Command() {
  return (
    <ElsewhereStateList searchBarPlaceholder="Search background music…">
      {(snapshot, refresh) => (
        <List.Section title="Background Music" subtitle={snapshot.backgroundMusicEnabled ? "On" : "Off"}>
          {snapshot.musicTracks.map((track) => {
            const isActive = track.id === snapshot.activeMusicTrackId;
            const icon = musicTrackIcon(track.id);
            return (
              <List.Item
                key={track.id}
                icon={icon}
                title={track.name}
                subtitle={track.description}
                accessories={isActive ? [{ text: activeMusicTrackStatus(snapshot.backgroundMusicEnabled) }] : undefined}
                actions={
                  <ActionPanel>
                    {isActive ? (
                      <Action title="Refresh Background Music" icon={Icon.ArrowClockwise} onAction={refresh} />
                    ) : (
                      <Action
                        title={`Switch to ${track.name}`}
                        icon={icon}
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
