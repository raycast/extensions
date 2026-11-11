import { getPreferenceValues, open } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

/**
 * Talks to the Momently Mac app through its AppleScript dictionary
 * (`Countdown/Resources/Momently.sdef` in the app's repository).
 * Every command answers with JSON, so nothing here depends on AppleScript's
 * locale-specific date formats.
 */

/** An event as Momently's `list events` / `create event` return it */
export interface MomentlyEvent {
  id: string;
  title: string;
  /** SF Symbol name, not renderable in Raycast */
  symbol: string;
  /** Hex RGB, e.g. `#34C759` */
  color: string;
  /** ISO 8601 start of the upcoming occurrence */
  date: string;
  endDate: string;
  allDay: boolean;
  notes?: string;
  url?: string;
  tags: string[];
  flagged: boolean;
  archived: boolean;
  /** Shared through an iCloud link. Missing from builds older than the field */
  shared?: boolean;
  repeating: "none" | "daily" | "weekly" | "monthly" | "yearly";
}

export interface NewEvent {
  title: string;
  date: Date;
  allDay: boolean;
  url?: string;
  notes?: string;
  flagged: boolean;
}

const bundleIDs = ["rs.madza.Countdown", "rs.madza.Countdown.dev"] as const;
type BundleID = (typeof bundleIDs)[number];

export class MomentlyNotInstalledError extends Error {
  constructor() {
    super("Momently isn't installed. Get it from the Mac App Store, then try again.");
    this.name = "MomentlyNotInstalledError";
  }
}

/** The Momently build picked in the extension's preferences */
export function momentlyBundleID(): BundleID {
  const { app } = getPreferenceValues<Preferences>();
  return bundleIDs.find((id) => id === app) ?? bundleIDs[0];
}

/**
 * Runs `body` inside a `tell` block for the app. Values are passed through `argv`
 * rather than spliced into the script, so titles and notes need no escaping.
 * The bundle id is spliced in: AppleScript loads the app's terminology at compile
 * time only for a literal one, and it's one of `bundleIDs`.
 */
async function tellMomently(body: string, args: string[] = []): Promise<string> {
  const bundleID = momentlyBundleID();
  const script = `
on run argv
  tell application id "${bundleID}"
    ${body}
  end tell
end run`;

  try {
    // Generous: the first command may have to launch the app
    return await runAppleScript(script, args, { timeout: 30_000 });
  } catch (error) {
    // Raycast's `getApplications()` misses builds outside the app folders (like
    // Xcode's), so let Launch Services decide whether the app exists
    const message = error instanceof Error ? error.message : String(error);
    if (/Can.t get application id/.test(message)) {
      throw new MomentlyNotInstalledError();
    }
    throw new Error(cleanAppleScriptError(error));
  }
}

/** `execution error: Momently got an error: There's no event… (-1728)` → `There's no event…` */
function cleanAppleScriptError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("-1743")) {
    return "Raycast isn't allowed to control Momently. Allow it in System Settings › Privacy & Security › Automation.";
  }

  // The script didn't compile: the installed build has no AppleScript dictionary,
  // like the iPhone app running on a Mac or a Mac build older than the commands
  if (message.includes("-2741")) {
    return "This Momently build doesn't support Raycast commands. Update Momently, or pick another build in the extension's preferences.";
  }

  const match = message.match(/got an error: (.*?)(?: \(-?\d+\))?\s*$/s);
  return (match?.[1] ?? message).trim();
}

export async function listEvents(options: { includingPast?: boolean; limit?: number } = {}): Promise<MomentlyEvent[]> {
  const output = await tellMomently(
    `list events including past ((item 1 of argv) is "true") limit ((item 2 of argv) as integer)`,
    // A negative limit lists every event
    [String(options.includingPast ?? false), String(options.limit ?? -1)],
  );
  return JSON.parse(output) as MomentlyEvent[];
}

export async function createEvent(event: NewEvent): Promise<MomentlyEvent> {
  const output = await tellMomently(
    `create event (item 1 of argv) starting (item 2 of argv) all day ((item 3 of argv) is "true") url (item 4 of argv) notes (item 5 of argv) flagged ((item 6 of argv) is "true")`,
    [
      event.title,
      event.date.toISOString(),
      String(event.allDay),
      event.url ?? "",
      event.notes ?? "",
      String(event.flagged),
    ],
  );
  return JSON.parse(output) as MomentlyEvent;
}

export async function deleteEvent(id: string): Promise<void> {
  await tellMomently(`delete event (item 1 of argv)`, [id]);
}

/** Opens the event in Momently (`momently://open?id=<UUID>`) */
export async function openEvent(id: string) {
  await open(`momently://open?id=${encodeURIComponent(id)}`, momentlyBundleID());
}
