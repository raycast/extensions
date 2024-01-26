import { LaunchProps, updateCommandMetadata } from "@raycast/api";
import { getActiveCoordinator, isPlaying } from "./sonos";
import { SonosState } from "@svrooij/sonos/lib/models/sonos-state";

function formatSubtitle({ playing, state }: { playing: boolean; state: SonosState }): string {
  const play = `▶︎`;
  const pause = `⏸︎`;
  const icon = playing ? play : pause;

  // This means some kind of track is playing
  if (state.mediaInfo.CurrentURIMetaData === undefined) {
    const track = state.positionInfo.TrackMetaData;

    if (typeof track === "string") {
      return `${icon} ${track}`;
    }

    return `${icon} ${track.Title} - ${track.Artist}`;
  }

  // This means some kind of radio is playing
  const media = state.mediaInfo.CurrentURIMetaData;

  if (typeof media === "string") {
    return `${icon} ${media}`;
  }

  return `${icon} ${media.Title}`;
}

export default async function Command({ launchType }: LaunchProps) {
  const coordinator = await getActiveCoordinator();

  if (coordinator === undefined) {
    return null;
  }

  const playing = await isPlaying(coordinator);
  const state = await coordinator.GetState();

  if (launchType === "background") {
    const subtitle = formatSubtitle({
      playing,
      state,
    });

    updateCommandMetadata({
      subtitle,
    });
  } else if (launchType === "userInitiated") {
    await coordinator.TogglePlayback();

    updateCommandMetadata({
      subtitle: formatSubtitle({
        playing: !playing,
        state,
      }),
    });
  }
}
