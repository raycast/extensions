import { Alert, Icon, closeMainWindow, confirmAlert, showHUD } from "@raycast/api";
import {
  MuteDeckOffline,
  MuteDeckStatus,
  StateValue,
  Toggleable,
  getPreferences,
  getStatus,
  isPresenting,
  toggle,
} from "./mutedeck";

const RESULT_HUD: Record<Toggleable, Record<Exclude<StateValue, "disabled" | "">, string>> = {
  mute: { active: "🔇 Muted", inactive: "🎙️ Unmuted" },
  video: { active: "🎥 Camera on", inactive: "🚫 Camera off" },
  share: { active: "🖥️ Sharing screen", inactive: "🖥️ Stopped sharing" },
  record: { active: "⏺️ Recording", inactive: "⏹️ Stopped recording" },
};

const UNAVAILABLE_HUD: Record<Toggleable, string> = {
  mute: "🎙️ Microphone unavailable",
  video: "🎥 Camera unavailable — join a call first",
  share: "🖥️ Screen sharing unavailable — join a call first",
  record: "⏺️ Recording unavailable — join a call first",
};

const FLIP_POLL_MS = 150;
const FLIP_TIMEOUT_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * MuteDeck's status lags a moment behind an action (the mic/camera state has
 * to propagate through the OS or meeting app first), so poll until the value
 * changes instead of trusting the first read after the toggle.
 */
export async function waitForFlip(what: Toggleable, before: StateValue): Promise<StateValue> {
  const deadline = Date.now() + FLIP_TIMEOUT_MS;
  let state = before;
  while (Date.now() < deadline) {
    await sleep(FLIP_POLL_MS);
    state = (await getStatus())[what];
    if (state !== before) {
      return state;
    }
  }
  return state;
}

/**
 * Ask before toggling the mic or camera while the user is sharing or
 * recording, when the matching preference is enabled.
 */
export async function confirmWhilePresenting(what: Toggleable, status: MuteDeckStatus): Promise<boolean> {
  const prefs = getPreferences();
  const wanted =
    (what === "mute" && prefs.confirmMuteInPresentation) || (what === "video" && prefs.confirmVideoInPresentation);
  if (!wanted || !isPresenting(status)) {
    return true;
  }
  const thing = what === "mute" ? "Microphone" : "Camera";
  return confirmAlert({
    title: `Toggle ${thing} While Presenting?`,
    message: "You are currently sharing your screen or recording.",
    icon: what === "mute" ? Icon.Microphone : Icon.Video,
    primaryAction: { title: `Toggle ${thing}`, style: Alert.ActionStyle.Destructive },
  });
}

/** Toggle a control and wait until MuteDeck reports its new state. */
export async function toggleAndWait(what: Toggleable, before: StateValue): Promise<StateValue> {
  await toggle(what);
  return waitForFlip(what, before);
}

/** Toggle a control and show a HUD with the state it actually ended up in. */
export async function runToggle(what: Toggleable): Promise<void> {
  try {
    const before = await getStatus();
    if (before[what] === "disabled" || before[what] === "") {
      await showHUD(UNAVAILABLE_HUD[what]);
      return;
    }
    if (!(await confirmWhilePresenting(what, before))) {
      return;
    }
    await closeMainWindow();
    // Ask MuteDeck what actually happened instead of assuming the flip worked.
    const state = await toggleAndWait(what, before[what]);
    if (state === "active" || state === "inactive") {
      await showHUD(RESULT_HUD[what][state]);
    } else {
      await showHUD(UNAVAILABLE_HUD[what]);
    }
  } catch (e) {
    await showHUD(e instanceof MuteDeckOffline ? "⚠️ MuteDeck isn't running" : "⚠️ MuteDeck error");
  }
}
