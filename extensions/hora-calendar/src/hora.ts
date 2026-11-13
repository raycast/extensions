import { getApplications } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

// The bridge to hora Calendar.
//
// hora exposes an AppleScript dictionary (`hora.sdef` in the app repo) and
// every command answers with a JSON string, so each wrapper here is a script
// template plus a `JSON.parse`. The dictionary is the contract — if something
// is missing from this file, look there first.

/**
 * hora ships through three channels, each with its own bundle identifier.
 *
 * The dev and demo builds trail them so the extension can be worked on, and so
 * Store screenshots can be taken against hora's seeded demo data instead of
 * somebody's real calendar. Neither build is distributed, so both entries are
 * inert for everyone else.
 */
const BUNDLE_IDS = [
  "szamowski.Hora",
  "szamowski.Hora-setapp",
  "szamowski.Hora-direct",
  "szamowski.Hora.dev",
  "szamowski.Hora.demo",
];

export class HoraNotInstalledError extends Error {
  constructor() {
    super("hora Calendar is not installed.");
    this.name = "HoraNotInstalledError";
  }
}

export class HoraNotAuthorizedError extends Error {
  constructor() {
    super("Raycast is not allowed to control hora Calendar.");
    this.name = "HoraNotAuthorizedError";
  }
}

/**
 * hora is installed but has no scripting dictionary, which means it predates
 * 1.1.5. Worth its own case: right after this extension lands, most people
 * who install it will be on an older hora, and "the handler is not defined"
 * tells them nothing about what to do next.
 */
export class HoraOutdatedError extends Error {
  constructor(message = "This version of hora Calendar cannot be scripted.") {
    super(message);
    this.name = "HoraOutdatedError";
  }
}

let cachedBundleID: string | undefined;

/**
 * Every hora on this Mac, in the order worth trying.
 *
 * Matching on bundle id rather than on the application name, the way most
 * single-channel extensions do, because all the builds are called
 * "hora Calendar" — only the identifier tells them apart.
 */
async function installedBundleIDs(): Promise<string[]> {
  const installed = await getApplications();
  const found = BUNDLE_IDS.filter((id) => installed.some((app) => app.bundleId === id));
  if (found.length === 0) throw new HoraNotInstalledError();
  return found;
}

/**
 * The installed builds, with the ones already open first.
 *
 * Someone can have a Setapp copy beside a Direct one, or a work build beside
 * the demo build used for screenshots. Whichever hora they are actually
 * looking at is the one a command should reach — and preferring it also
 * avoids launching a second copy just to answer a question.
 *
 * `running of application id` answers without launching anything, and the
 * whole check is one round trip, skipped entirely when only one hora exists.
 */
async function orderedCandidates(): Promise<string[]> {
  const installed = await installedBundleIDs();
  if (installed.length < 2) return installed;

  try {
    const isRunning = await runningFlags(installed);
    return [...installed.filter((_, i) => isRunning[i]), ...installed.filter((_, i) => !isRunning[i])];
  } catch {
    return installed;
  }
}

async function runningFlags(ids: string[]): Promise<boolean[]> {
  const answer = await runAppleScript(
    `return {${ids.map((id) => `running of application id ${quote(id)}`).join(", ")}}`,
    {
      humanReadableOutput: true,
      timeout: 5_000,
    },
  );
  return answer.split(",").map((value) => value.trim() === "true");
}

/** The hora this session has settled on, if it has settled on one. */
export async function horaBundleID(): Promise<string> {
  return cachedBundleID ?? (await orderedCandidates())[0];
}

/** Escapes one of our own bundle IDs for an `application id` literal. Data goes through `command` instead. */
function quote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Builds an AppleScript `date` from components rather than from a formatted
 * string. `date "18/09/2026"` is parsed with the user's regional settings, so
 * a literal that works here breaks on a machine set to another locale.
 *
 * Day is pinned to 1 before the month moves, or setting month to February
 * while the current date is the 31st rolls the date into March.
 */
function dateLiteral(variable: string, date: Date): string {
  return [
    `set ${variable} to current date`,
    `set day of ${variable} to 1`,
    `set year of ${variable} to ${date.getFullYear()}`,
    `set month of ${variable} to ${date.getMonth() + 1}`,
    `set day of ${variable} to ${date.getDate()}`,
    `set time of ${variable} to ${date.getHours() * 3600 + date.getMinutes() * 60}`,
  ].join("\n");
}

/** A hora command whose values travel as `argv` items, never as script source. */
interface Command {
  text: string;
  args: string[];
}

/** `arg` swaps a value for `(item n of argv)` and keeps the value aside. */
function command(build: (arg: (value: string) => string) => string): Command {
  const args: string[] = [];
  const text = build((value) => {
    args.push(value);
    return `(item ${args.length} of argv)`;
  });
  return { text, args };
}

/**
 * Runs one command against hora and parses its JSON answer.
 *
 * `preamble` holds any statements that must run outside the `tell` block,
 * which in practice means date variables. `only` pins the builds to try, for
 * callers that must not wake a closed one.
 */
async function tellHora<T>(request: string | Command, preamble = "", only?: string[]): Promise<T> {
  const { text, args } = typeof request === "string" ? { text: request, args: [] } : request;
  // More than one hora can be installed — a Setapp copy beside a Direct one,
  // or an old build somebody never removed. Only the ones from 1.1.5 carry a
  // dictionary, so walk the list until one answers rather than betting the
  // whole command on the first that happens to be there.
  const candidates = only ?? (cachedBundleID ? [cachedBundleID] : await orderedCandidates());
  let lastOutdated: HoraOutdatedError | undefined;

  for (const bundleID of candidates) {
    const script = [
      "on run argv",
      preamble,
      `tell application id ${quote(bundleID)}`,
      `  ${text}`,
      "end tell",
      "end run",
    ]
      .filter(Boolean)
      .join("\n");

    let output: string;
    try {
      output = await runAppleScript(script, args, { humanReadableOutput: true, timeout: 30_000 });
    } catch (error) {
      const failure = translate(error);
      if (failure instanceof HoraOutdatedError) {
        lastOutdated = failure;
        continue;
      }
      throw failure;
    }

    cachedBundleID = bundleID;
    try {
      return JSON.parse(output) as T;
    } catch {
      throw new Error(`hora answered with something unexpected: ${output.slice(0, 200)}`);
    }
  }

  throw lastOutdated ?? new HoraNotInstalledError();
}

/**
 * Turns osascript's noise into something worth putting in a toast.
 *
 * hora's own failures arrive as `… got an error: <message>. (-10000)`, and the
 * message is already written for a person to read, so it is pulled out whole.
 */
function translate(error: unknown): Error {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes("-1743")) return new HoraNotAuthorizedError();
  if (raw.includes("-600") || raw.includes("-10814")) return new HoraNotInstalledError();
  // A hora without a dictionary fails two different ways, and neither says so.
  //
  // The first is a *compile* error: with no terminology to resolve `upcoming
  // events` against, AppleScript never reaches the app at all and complains
  // about a plural class name — as -2740 or -2741 depending on which word it
  // choked on. Matching the phrase rather than the codes, because the scripts
  // here are generated from fixed templates that are known to compile against
  // a current hora; a syntax error can only mean the terminology is missing.
  //
  // The second is the runtime one, -1717: the app took the event and had no
  // handler for it.
  //
  // Both mean the same thing to a person — hora is older than 1.1.5.
  if (/syntax error/i.test(raw) || raw.includes("-1717") || raw.includes("-1708")) {
    return new HoraOutdatedError();
  }
  const match = raw.match(/got an error:\s*(.+?)\s*\(-?\d+\)/s);
  return new Error(match ? match[1].replace(/\.$/, "") : raw);
}

// MARK: - Shapes answered by the dictionary

export interface HoraEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
  calendarID: string;
  calendarName?: string;
  calendarColorHex?: string;
  accountEmail: string;
  location?: string;
  conferenceLink?: string;
}

export interface HoraCalendar {
  id: string;
  name: string;
  accountEmail: string;
  colorHex: string;
  isPrimary: boolean;
  canEdit: boolean;
  isVisible: boolean;
}

export interface HoraTaskList {
  id: string;
  name: string;
  accountEmail: string;
  isVisible: boolean;
}

export interface CreatedEvent extends HoraEvent {
  added: boolean;
  /**
   * False while the event still carries hora's local identifier — an offline
   * create keeps it until the pending mutation replays, and `id` will change
   * once it does.
   */
  synced: boolean;
}

export interface CreatedTask {
  id: string;
  title: string;
  listID: string;
  listName: string;
  accountEmail: string;
  due?: string;
  notes?: string;
}

export interface FocusStatus {
  state: "idle" | "running" | "paused";
  phase: "focus" | "break";
  remainingSeconds: number;
  endsAt: string | null;
  title: string | null;
  isBlock: boolean;
}

export interface FreeTime {
  slots: { start: string; end: string }[];
  /** The slots written out for pasting into a message. */
  text: string;
}

// MARK: - Commands

/** Creates the event straight away. hora stays closed. */
export async function quickAddEvent(sentence: string, calendarName?: string): Promise<CreatedEvent> {
  return tellHora<CreatedEvent>(
    command((arg) => {
      const inCalendar = calendarName ? ` in calendar ${arg(calendarName)}` : "";
      return `parse sentence ${arg(sentence)} with add immediately${inCalendar}`;
    }),
  );
}

/** Opens hora's editor with the sentence already parsed into the fields. */
export async function addEventForEditing(sentence: string): Promise<void> {
  await tellHora(command((arg) => `parse sentence ${arg(sentence)}`));
}

export async function addTask(input: {
  title: string;
  due?: Date;
  listName?: string;
  listID?: string;
  accountEmail?: string;
  notes?: string;
}): Promise<CreatedTask> {
  const preamble = input.due ? dateLiteral("dueDate", input.due) : "";
  const addTaskCommand = (list?: { id: string; account: string } | { name: string }) =>
    command((arg) => {
      const parts = [`add task ${arg(input.title)}`];
      if (input.due) parts.push("due on dueDate");
      if (list && "id" in list) parts.push(`with list ID ${arg(list.id)}`, `for account ${arg(list.account)}`);
      if (list && "name" in list) parts.push(`in list ${arg(list.name)}`);
      if (input.notes) parts.push(`notes ${arg(input.notes)}`);
      return parts.join(" ");
    });
  if (input.listID && input.accountEmail) {
    try {
      return await tellHora<CreatedTask>(addTaskCommand({ id: input.listID, account: input.accountEmail }), preamble);
    } catch (error) {
      if (!(error instanceof HoraOutdatedError) || !input.listName) throw error;
      const sameName = (await listTaskLists()).filter(
        (list) => list.name.localeCompare(input.listName!, undefined, { sensitivity: "accent" }) === 0,
      );
      if (
        sameName.length !== 1 ||
        sameName[0].id !== input.listID ||
        sameName[0].accountEmail.toLowerCase() !== input.accountEmail.toLowerCase()
      ) {
        throw new HoraOutdatedError(
          "This hora build cannot safely select that task list. Update to a build with account-specific task lists.",
        );
      }
      return tellHora<CreatedTask>(addTaskCommand({ name: input.listName }), preamble);
    }
  }
  if (input.listID || input.accountEmail) {
    throw new Error("Pass a task list ID together with its account email.");
  }
  return tellHora<CreatedTask>(addTaskCommand(input.listName ? { name: input.listName } : undefined), preamble);
}

export async function upcomingEvents(
  options: { limit?: number; withMeetingLinks?: boolean; ending?: Date } = {},
): Promise<HoraEvent[]> {
  const parts = ["upcoming events"];
  if (options.ending) parts.push("ending endDate");
  if (options.limit) parts.push(`limited to ${options.limit}`);
  if (options.withMeetingLinks) parts.push("with meeting links");
  return tellHora<HoraEvent[]>(parts.join(" "), options.ending && dateLiteral("endDate", options.ending));
}

export async function joinConference(eventID: string): Promise<{ conferenceLink: string; title: string }> {
  return tellHora(command((arg) => `join conference ${arg(eventID)}`));
}

export async function listCalendars(): Promise<HoraCalendar[]> {
  return tellHora<HoraCalendar[]>("list calendars");
}

export async function listTaskLists(): Promise<HoraTaskList[]> {
  return tellHora<HoraTaskList[]>("list task lists");
}

export async function respondToEvent(eventID: string, response: "accepted" | "declined" | "tentative"): Promise<void> {
  await tellHora(command((arg) => `respond to event ${arg(eventID)} response ${response}`));
}

/** Guests are never notified: a stray Raycast keystroke should not email anyone. */
export async function deleteEvent(eventID: string): Promise<void> {
  await tellHora(command((arg) => `delete event ${arg(eventID)} notifying guests false`));
}

// MARK: - Focus and availability (hora 3.0.2+)

/**
 * hora 3.0.2 added these commands. An older hora fails them the same way it
 * fails everything it does not know, which `translate` reads as "predates
 * 1.1.5" — wrong for a 3.0.1 that scripts fine, so say what is actually missing.
 */
async function tellNewHora<T>(command: string, preamble = "", only?: string[]): Promise<T> {
  try {
    return await tellHora<T>(command, preamble, only);
  } catch (error) {
    if (error instanceof HoraOutdatedError) {
      throw new HoraOutdatedError("Update hora Calendar to 3.0.2 or later to use this command.");
    }
    throw error;
  }
}

/** Numbers are pasted into the script, so refuse anything but a whole number. */
function whole(value: number, name: string, min = 1): number {
  if (!Number.isInteger(value) || value < min) throw new Error(`${name} must be a whole number of at least ${min}.`);
  return value;
}

export async function focusStatus(): Promise<FocusStatus> {
  return tellNewHora<FocusStatus>("focus status");
}

export async function startFocus(minutes?: number): Promise<FocusStatus & { started: boolean }> {
  const duration = minutes === undefined ? "" : ` for minutes ${whole(minutes, "Minutes")}`;
  return tellNewHora(`start focus${duration}`);
}

export async function stopFocus(): Promise<FocusStatus & { stopped: boolean }> {
  return tellNewHora("stop focus");
}

export async function findFreeTime(
  options: { lasting?: number; daysAhead?: number; fromHour?: number; toHour?: number } = {},
): Promise<FreeTime> {
  const parts = ["find free time"];
  if (options.lasting !== undefined) parts.push(`lasting ${whole(options.lasting, "Duration")}`);
  if (options.daysAhead !== undefined) parts.push(`days ahead ${whole(options.daysAhead, "Days ahead")}`);
  if (options.fromHour !== undefined) parts.push(`from hour ${whole(options.fromHour, "Start hour", 0)}`);
  if (options.toHour !== undefined) parts.push(`to hour ${whole(options.toHour, "End hour", 0)}`);
  return tellNewHora(parts.join(" "));
}
