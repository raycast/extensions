import { LaunchProps, showHUD } from "@raycast/api";
import { setText } from "@bharper/atv-js";
import { findAction, performAction } from "./lib/actions";
import { installedApps, launchAppByName, resolveAppName } from "./lib/apps";
import { describe, nowPlaying } from "./lib/now-playing";
import { launchApp, skipBy } from "./lib/companion-extras";
import { withConnection } from "./lib/connection";
import { AppleTVError, showErrorToast } from "./lib/errors";
import { playContent } from "./lib/play-flow";

/**
 * One-shot natural-language command: "pause", "open Netflix",
 * "play Rick and Morty on Netflix". Parsed locally with no AI; show titles
 * resolve to deep links through JustWatch. Also the menu bar's dispatcher.
 */
async function ask(query: string): Promise<void> {
  // 1. Any named remote action ("pause", "volume up", "app switcher", "sleep", …)
  const action = findAction(query);
  if (action) return performAction(action);

  // 2. Parameterised gestures: "skip 30", "skip back 15", "type Hello"
  const skip = query.match(/^skip(?:\s+(back|backward|forward))?\s+(\d+)$/i);
  if (skip) {
    const seconds = Number(skip[2]) * (skip[1]?.toLowerCase().startsWith("back") ? -1 : 1);
    await withConnection((conn) => skipBy(conn, seconds));
    return showHUD(`${seconds > 0 ? "⏩" : "⏪"} ${Math.abs(seconds)}s`);
  }
  const type = query.match(/^type\s+(.+)$/i);
  if (type) {
    await withConnection((conn) => setText(conn, type[1]));
    return showHUD("⌨️ Sent text to Apple TV");
  }

  // 3. "what's playing"
  if (/^what(?:'?s| is)\s+(?:playing|on)\??$/i.test(query)) {
    const [state, apps] = await withConnection((conn) => Promise.all([nowPlaying(conn), installedApps(conn)]));
    return showHUD(
      state?.playing || state?.bundleId || state?.title
        ? `Now playing: ${describe(state, apps)}`
        : "Nothing is playing",
    );
  }

  // 4. "play/watch <title> [on <app>]"
  const play = query.match(/^(?:play|watch)\s+(.+?)(?:\s+on\s+([a-z0-9+ ]+))?$/i);
  if (play) return showHUD(`▶️ ${await playContent(play[1], play[2])}`);

  // 5. "open <URL | app | bundle ID>", or just an app name ("netflix")
  const target = query.match(/^(?:open|launch|start|go to)\s+(.+)$/i)?.[1] ?? (resolveAppName(query) && query);
  if (target?.includes("://")) {
    await withConnection((conn) => launchApp(conn, target));
    return showHUD("🔗 Sent link to Apple TV");
  }
  if (target) {
    const opened = await launchAppByName(target);
    if (!opened) {
      throw new AppleTVError(
        `Nothing on the Apple TV matches “${target}”. Try the Launch Apple TV App command.`,
        "Unknown App",
      );
    }
    return showHUD(`📺 Opened ${opened.name}`);
  }

  throw new AppleTVError("Try “pause”, “open Netflix”, or “play <show> on <app>”.", "Didn't Understand That");
}

export default async function Command(props: LaunchProps<{ arguments: { query: string } }>) {
  // Case is kept for what reaches the TV verbatim (typed text, URLs); every pattern matches case-insensitively.
  await ask(props.arguments.query.trim()).catch(showErrorToast);
}
