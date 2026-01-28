import { Icon, MenuBarExtra } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { truncate } from "lodash";
import { useEffect } from "react";

import { actionMapping, forward, PlayerState, rewind, statusEmojiMapping, togglePause } from "./apple-music";
import { useStatus } from "./hooks/useStatus";
import { formatProgress } from "./utils";

export default function Command() {
  const { data, isLoading: isLoading } = useStatus();
  const [playerState, setPlayerState] = useCachedState("menubar-is-loading", PlayerState.stopped);

  useEffect(() => {
    if (data?.state) {
      setPlayerState(data.state);
    }
  }, [data?.state, setPlayerState]);

  const trackName = data?.name || "";
  const progress = data ? formatProgress(data.position, data.time) : "";
  const icon = playerState === PlayerState.playing ? "command-icon.png" : "command-icon-grayscale.png";

  const onTogglePause = () => {
    setPlayerState((prev) => {
      switch (prev) {
        case PlayerState.playing:
          return PlayerState.paused;
        case PlayerState.paused:
          return PlayerState.playing;
        default:
          return prev;
      }
    });
    togglePause();
  };

  return (
    <MenuBarExtra isLoading={isLoading} icon={icon} tooltip="Podcasts Now">
      <MenuBarExtra.Item
        icon={isLoading ? Icon.CircleProgress : statusEmojiMapping[playerState]}
        title={truncate(trackName, { length: 20 })}
        subtitle={progress}
        tooltip={trackName}
        onAction={onTogglePause}
      />
      <MenuBarExtra.Section>
        {playerState === PlayerState.playing || playerState === PlayerState.paused ? (
          <MenuBarExtra.Item
            icon={actionMapping.icons[playerState]}
            title={actionMapping.titles[playerState]}
            shortcut={{ modifiers: [], key: "t" }}
            onAction={onTogglePause}
          />
        ) : null}
        <MenuBarExtra.Item
          icon={Icon.RotateClockwise}
          title="Forward 15s"
          shortcut={{ modifiers: [], key: "f" }}
          onAction={forward}
        />
        <MenuBarExtra.Item
          icon={Icon.RotateAntiClockwise}
          title="Rewind 15s"
          shortcut={{ modifiers: [], key: "r" }}
          onAction={rewind}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
