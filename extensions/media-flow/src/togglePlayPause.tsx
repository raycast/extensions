import { showHUD } from "@raycast/api";
import { controlSource, getMediaSources } from "./core/mediaService";
import { registerAllProviders } from "./core/setup";
import { openPlayerApp, readLastPlayer } from "./lib/lastPlayer";
import { refreshMenuBar } from "./lib/refreshMenuBar";
import { mediaControlProvider } from "./providers/mediaControl";

registerAllProviders();

// After launching a cold app, give it a moment to register with the Now Playing service
// before we send play.
const WAKE_TRIES = 6;
const WAKE_MS = 400;

export default async function Command(): Promise<void> {
  const { sources } = await getMediaSources();
  const target = sources[0];
  if (target) {
    await controlSource(target, "playpause");
    await showHUD("Play/Pause");
    await refreshMenuBar();
    return;
  }

  // Nothing is active — mimic the Mac media key: reopen the last-played app and start it.
  const last = await readLastPlayer();
  if (!last) {
    await showHUD("No active media source");
    return;
  }

  openPlayerApp(last);
  // Wait for the app to come up and register a source, then play it.
  for (let i = 0; i < WAKE_TRIES; i++) {
    await new Promise((r) => setTimeout(r, WAKE_MS));
    const { sources: woken } = await getMediaSources();
    if (woken[0]) {
      await controlSource(woken[0], "play");
      await showHUD(`Playing ${last.appName}`);
      await refreshMenuBar();
      return;
    }
  }

  // Never registered in time (cold launch) — best-effort system play; a second press works.
  await mediaControlProvider.control?.("play");
  await showHUD(`Opening ${last.appName}…`);
  await refreshMenuBar();
}
