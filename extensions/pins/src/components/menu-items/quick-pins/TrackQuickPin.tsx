import { Application, MenuBarExtra } from "@raycast/api";
import { TrackRef } from "../../../lib/LocalData";
import { cutoff } from "../../../lib/utils";
import { KEYBOARD_SHORTCUT, StorageKey } from "../../../lib/constants";
import { getMusicTrackScript, getSpotifyTrackScript, getTVTrackScript } from "../../../lib/scripts";
import { createNewPin } from "../../../lib/Pins";
import { useCachedState } from "@raycast/utils";
import { Group } from "../../../lib/Groups";

type TrackQuickPinProps = {
  /**
   * The application that is currently open.
   */
  app: Application;

  /**
   * The track that is currently playing in Music, Spotify, or TV.
   */
  track: TrackRef;
};

/**
 * A menu bar extra item that creates a new pin whose target is a script that will play the currently track in Music, Spotify, or TV.
 * @returns A menu bar extra item, or null if there is no track playing.
 */
export default function TrackQuickPin(props: TrackQuickPinProps) {
  const { app, track } = props;
  const [targetGroup] = useCachedState<Group | undefined>(StorageKey.TARGET_GROUP, undefined);

  if (track.name == "") {
    return null;
  }

  let title = `Pin This Track (${cutoff(track.name, 20)})`;
  if (targetGroup) {
    title = `${title} to Target Group`;
  }

  return (
    <MenuBarExtra.Item
      title={title}
      icon={{ fileIcon: app.path }}
      tooltip="Create a pin whose target path is the path of the currently playing track in Music, Spotify, or TV"
      shortcut={KEYBOARD_SHORTCUT.PIN_CURRENT_TRACK}
      onAction={async () => {
        let trackScript = "return";

        if (app.name == "Music") {
          trackScript = getMusicTrackScript(track.name, track.artist, track.album);
        } else if (app.name == "Spotify.app") {
          trackScript = getSpotifyTrackScript(track.uri);
        } else if (app.name == "TV") {
          trackScript = getTVTrackScript(track.name, track.artist, track.album);
        }

        await createNewPin({
          name: `Play Track '${track.name}'`,
          url: `{{as:${trackScript}}}`,
          icon: app.path,
          group: targetGroup?.name || "None",
        });
      }}
    />
  );
}
