export type PlaybackAction = "status" | "play" | "pause" | "toggle" | "skip" | "previous";

export interface PlayerSnapshot {
  title: string;
  timer: string;
  state: "playing" | "paused" | "loading" | "unavailable";
  canSkip: boolean;
  canPrevious: boolean;
  sourceFingerprint: string;
  mediaSession: { supported: boolean; playbackState: string; title: string };
  clicked: boolean;
  expectedState?: "playing" | "paused";
  error?: string;
}

// Public player UI identifiers observed in Brain.fm's current, publicly served web app.
// No account tokens, network requests, internal events, or private player stores are used.
const PLAYER_SCRIPT = String.raw`
(() => {
  if (location.origin !== "https://my.brain.fm") {
    return JSON.stringify({ error: "This is not the official Brain.fm player." });
  }
  const action = __ACTION__;
  const visible = (element) => !!element && element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility !== "hidden" && getComputedStyle(element).display !== "none";
  const find = (selector) => Array.from(document.querySelectorAll(selector)).find(visible);
  const byTestId = (id) => find('[data-testid="' + id + '"], [data-testid="' + id + '-mobile"]');
  const disabled = (element) => !element || element.disabled || element.getAttribute("aria-disabled") === "true";
  const playButton = byTestId("playPauseButton");
  const skipButton = byTestId("skipButton");
  const previousButton = byTestId("previousButton");
  const text = (element) => element ? (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim() : "";
  const titleNode = byTestId("currentTrackTitle");
  let title = "";
  if (titleNode) {
    const cleanTitle = titleNode.cloneNode(true);
    cleanTitle.querySelectorAll('[data-testid="newLabel"], [data-testid="newLabel-mobile"]').forEach((badge) => badge.remove());
    title = text(cleanTitle);
  }
  const audio = Array.from(document.querySelectorAll("audio, video")).find((element) => element.currentSrc);
  // Compare tracks without returning a stream URL, which could contain account tokens.
  const sourceURL = audio ? new URL(audio.currentSrc, location.origin) : null;
  const stableSource = sourceURL ? sourceURL.origin + sourceURL.pathname : "";
  let fingerprint = 2166136261;
  for (const char of stableSource) fingerprint = Math.imul(fingerprint ^ char.charCodeAt(0), 16777619);
  const session = navigator.mediaSession;
  const snapshot = {
    title: title || (session && session.metadata ? session.metadata.title : ""),
    timer: text(byTestId("timerDisplay")),
    state: !playButton ? "unavailable" : disabled(playButton) ? "loading" :
      playButton.getAttribute("aria-label") === "Pause" ? "playing" :
      playButton.getAttribute("aria-label") === "Play" ? "paused" : "unavailable",
    canSkip: !disabled(skipButton),
    canPrevious: !disabled(previousButton),
    sourceFingerprint: audio ? (fingerprint >>> 0).toString(16) : "",
    mediaSession: {
      supported: !!session,
      playbackState: session ? session.playbackState : "unsupported",
      title: session && session.metadata ? session.metadata.title : ""
    },
    clicked: false
  };
  const fail = (error) => JSON.stringify({ ...snapshot, error });
  if (action === "status") return JSON.stringify(snapshot);
  if (snapshot.state === "unavailable") return fail("Start a Brain.fm session in this tab first. The player controls are not available.");
  if (snapshot.state === "loading") return fail("Brain.fm is loading a track. Try again when its Play or Pause button is available.");
  if (action === "skip" || action === "previous") {
    const button = action === "skip" ? skipButton : previousButton;
    if (disabled(button)) return fail(action === "skip" ? "Brain.fm has no available next track." : "Brain.fm has no available previous track.");
    button.click();
    return JSON.stringify({ ...snapshot, clicked: true });
  }
  const expectedState = action === "play" ? "playing" : action === "pause" ? "paused" :
    snapshot.state === "playing" ? "paused" : "playing";
  if (snapshot.state === expectedState) return JSON.stringify({ ...snapshot, expectedState });
  playButton.click();
  return JSON.stringify({ ...snapshot, clicked: true, expectedState });
})()
`;

export function buildPlayerScript(action: PlaybackAction): string {
  return PLAYER_SCRIPT.replace("__ACTION__", JSON.stringify(action));
}

export function didTrackChange(before: PlayerSnapshot, after: PlayerSnapshot): boolean {
  if (after.state === "loading" || after.state === "unavailable") return false;
  if (before.title && after.title) return before.title !== after.title;
  return Boolean(
    before.sourceFingerprint && after.sourceFingerprint && before.sourceFingerprint !== after.sourceFingerprint,
  );
}

export function explicitPlaybackAction(state: PlayerSnapshot["state"]): "play" | "pause" {
  return state === "playing" ? "pause" : "play";
}
