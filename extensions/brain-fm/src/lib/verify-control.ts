import { BrowserPlayerSnapshot, PlayerTarget } from "./browser-script";
import { didTrackChange, PlaybackAction } from "./player-script";

type PlayerReader = (action: PlaybackAction, target?: PlayerTarget) => Promise<BrowserPlayerSnapshot>;

export async function controlWithReader(
  action: Exclude<PlaybackAction, "status">,
  read: PlayerReader,
  initialTarget?: PlayerTarget,
): Promise<BrowserPlayerSnapshot> {
  const before = await read(action, initialTarget);
  if (initialTarget && (before.browser !== initialTarget.browser || before.tabId !== initialTarget.tabId)) {
    throw new Error("The original Brain.fm player tab changed before control.");
  }
  if (!before.clicked) return before;
  const target: PlayerTarget = { browser: before.browser, tabId: before.tabId };
  const started = Date.now();
  while (Date.now() - started < 5_000) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const after = await read("status", target);
    if (after.browser !== target.browser || after.tabId !== target.tabId) {
      throw new Error("The original Brain.fm player tab changed during verification.");
    }
    if (action === "skip" || action === "previous") {
      if (didTrackChange(before, after)) return after;
    } else if (after.state === before.expectedState) {
      return after;
    }
  }
  throw new Error(
    action === "skip" || action === "previous"
      ? "Track change was requested, but a new track could not be verified. Check the Brain.fm player."
      : "Playback was requested, but the new state could not be verified. Check the Brain.fm player.",
  );
}
