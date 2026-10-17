import { Icon, Image, closeMainWindow, getPreferenceValues, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  ESCAPE,
  Key,
  Modifier,
  RETURN,
  TeamsError,
  TimingKind,
  activateTeams,
  pause,
  press,
  rememberFrontApp,
  returnTo,
} from "./teams";

const execFileAsync = promisify(execFile);

export interface MeetingAction {
  id: string;
  title: string;
  hud: string;
  icon: Image.ImageLike;
  key: Key;
  modifiers: Modifier[];
  /** Leave Teams in front afterwards, because the user picks something there next. */
  staysInTeams?: boolean;
}

/** The official Teams shortcuts for macOS. They work while a call is running. */
export const MEETING_ACTIONS: MeetingAction[] = [
  {
    id: "microphone",
    title: "Toggle Microphone",
    hud: "Toggled the microphone",
    icon: Icon.Microphone,
    key: { char: "m" },
    modifiers: ["command", "shift"],
  },
  {
    id: "camera",
    title: "Toggle Camera",
    hud: "Toggled the camera",
    icon: Icon.Video,
    key: { char: "o" },
    modifiers: ["command", "shift"],
  },
  {
    id: "hand",
    title: "Raise or Lower Hand",
    hud: "Raised or lowered your hand",
    icon: "✋🏽",
    key: { char: "k" },
    modifiers: ["command", "shift"],
  },
  {
    id: "share",
    title: "Share Content",
    hud: "Opened Share content in Teams",
    icon: Icon.Desktop,
    key: { char: "e" },
    modifiers: ["command", "shift"],
    staysInTeams: true,
  },
  {
    id: "lobby",
    title: "Admit from Lobby",
    hud: "Admitted from the lobby",
    icon: Icon.AddPerson,
    key: { char: "y" },
    modifiers: ["command", "shift"],
  },
  {
    id: "leave",
    title: "Leave Call",
    hud: "Left the call",
    icon: Icon.Logout,
    key: { char: "h" },
    modifiers: ["command", "shift"],
  },
];

/**
 * Runs a quick action in Teams and goes back to the app the user was in, if
 * the preference says so.
 */
export async function inTeams(work: () => Promise<void>, kind: TimingKind, stay = false): Promise<void> {
  const { returnToPreviousApp } = getPreferenceValues<Preferences>();
  const previous = returnToPreviousApp && !stay ? await rememberFrontApp() : undefined;
  // Started from the Raycast window: get it out of the way before Teams gets the keys.
  await closeMainWindow();
  await activateTeams(kind);
  await work();
  if (previous) {
    await pause(200, kind);
    await returnTo(previous);
  }
}

export async function runMeetingAction(id: string): Promise<void> {
  const action = MEETING_ACTIONS.find((a) => a.id === id);
  if (!action) throw new TeamsError(`Unknown meeting action: ${id}`);
  await inTeams(() => press(action.key, action.modifiers), "shortcuts", action.staysInTeams);
  await showHUD(action.hud);
}

export const STATUSES: { value: string; title: string; icon: Icon }[] = [
  { value: "available", title: "Available", icon: Icon.CheckCircle },
  { value: "busy", title: "Busy", icon: Icon.CircleFilled },
  { value: "dnd", title: "Do Not Disturb", icon: Icon.MinusCircle },
  { value: "brb", title: "Be Right Back", icon: Icon.Clock },
  { value: "away", title: "Away", icon: Icon.Clock },
  { value: "offline", title: "Offline", icon: Icon.XMarkCircle },
];

/** The Teams slash commands differ per language: /busy in English, /beschäftigt in German. */
const STATUS_COMMANDS: Record<string, Record<string, string>> = {
  en: { available: "available", busy: "busy", dnd: "dnd", brb: "brb", away: "away", offline: "offline" },
  de: {
    available: "verfügbar",
    busy: "beschäftigt",
    dnd: "nichtstören",
    brb: "bingleichzurück",
    away: "abwesend",
    offline: "offline",
  },
};

/** The preferred language, or the first macOS language that the extension knows. */
async function teamsLanguage(): Promise<string> {
  const { teamsLanguage } = getPreferenceValues<Preferences>();
  if (teamsLanguage && teamsLanguage !== "auto") return teamsLanguage;
  try {
    const { stdout } = await execFileAsync("/usr/bin/defaults", ["read", "-g", "AppleLanguages"]);
    for (const match of stdout.matchAll(/"?([a-z]{2})[-_A-Za-z]*"?/g)) {
      if (STATUS_COMMANDS[match[1]]) return match[1];
    }
  } catch {
    // Fall through to English.
  }
  return Intl.DateTimeFormat().resolvedOptions().locale.slice(0, 2) === "de" ? "de" : "en";
}

export function statusCommand(language: string, value: string): string {
  return "/" + (STATUS_COMMANDS[language] ?? STATUS_COMMANDS.en)[value];
}

/** Uses the Teams slash commands in the search box: ⌘E, /busy (or /beschäftigt …), Return. */
export async function setStatus(value: string): Promise<string> {
  const status = STATUSES.find((s) => s.value === value);
  if (!status) throw new TeamsError(`Unknown status: ${value}`);
  const command = statusCommand(await teamsLanguage(), status.value);
  await inTeams(async () => {
    await press({ char: "e" }, ["command"]);
    await pause(400);
    // Teams opens its command list on the slash, then filters it as you type.
    await press({ char: "/" });
    await pause(700);
    await press({ char: command.slice(1) });
    await pause(1200);
    await press(RETURN);
    await pause(600);
    await press(ESCAPE);
  }, "search");
  return status.title;
}

/** Body of the one-status commands, so each status can have its own hotkey. */
export async function setStatusCommand(value: string): Promise<void> {
  try {
    const title = await setStatus(value);
    await showHUD(`Teams status: ${title}`);
  } catch (error) {
    await report(error, "Could not set the status");
  }
}

/** Shared error handling for the no-view commands. */
export async function report(error: unknown, title: string): Promise<void> {
  await showFailureToast(error, { title });
}
