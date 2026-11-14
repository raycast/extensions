import { environment, LaunchType, showHUD, updateCommandMetadata } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { EchoError, fetchLastPlayed, fetchStatus, playPause, resumeItem } from "./echo";

/// A live status line for Raycast's root search, so it can sit in Favorites and show what is
/// playing without opening anything. Raycast relaunches this in the background on the interval
/// declared in the manifest.
///
/// Return does what Return does on Echo's own now-playing row: it toggles play/pause, routed
/// through Echo so it also reaches its own player and browser tabs. With nothing playing at all
/// there is nothing to toggle, so it picks up the most recent thing instead.
export default async function NowPlaying() {
  const background = environment.launchType === LaunchType.Background;

  try {
    const { line, nowPlaying } = await fetchStatus();
    // Echo's own wording, including "Nothing playing", rather than a phrasing invented here.
    await updateCommandMetadata({ subtitle: line });
    if (background) return;

    if (nowPlaying) {
      await playPause();
      // Report the state we just moved TO, not the one we read.
      await showHUD(`${nowPlaying.playing ? "Paused" : "Playing"} ${nowPlaying.title}`);
      return;
    }

    const latest = await fetchLastPlayed();
    if (!latest) {
      await showHUD("Echo has nothing to play yet");
      return;
    }
    await resumeItem(latest.id, "auto");
    await showHUD(`Resuming ${latest.title}`);
  } catch (e) {
    // A background refresh must stay silent: Echo being closed is normal, not an error worth
    // interrupting the user for. Only a deliberate launch explains itself.
    await updateCommandMetadata({ subtitle: "Echo is not running" });
    if (!background) {
      if (e instanceof EchoError) await showFailureToast(e, { title: e.message });
      else await showHUD("Could not reach Echo");
    }
  }
}
