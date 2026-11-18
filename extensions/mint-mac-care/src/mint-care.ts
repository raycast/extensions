// Auto Care as Mint 1.1.2 words and sets it, for the Auto Care command and
// the status captions. Pure (no Raycast import), so node can test it: every
// request a row sends is built here.
//
// The app's sources, all at v1.1.2: the disk plans and their words in
// Mint/Scheduler/DiskAutoCare.swift (isScheduled, scopeText, typesNames,
// setBucket, chooserOptions), the type names in DiskCareScope.swift
// (savedChipTitle) and DiskFlowDrawer.swift (DiskDrawerClutterFilter.title),
// a folder's three modes in Mint/Config/FolderAutomation.swift and the Files
// page's popover, memory in Mint/Views/Memory/MemoryTabView.swift. The writes
// are the surface's autocare.disk / autocare.folder / autocare.memory
// (Mint/Integrations/NativeCLIAction.swift).

import { isAtLeastVersion } from "./mint-cli";
import type { AutoCareJSON, CareTask } from "./mint-model";

/** Every plan runs hourly from Mint 1.1.2 (2026-10-28); before it, autocare.disk needs a frequency. */
export const AUTOCARE_MINIMUM_VERSION = "1.1.2";

/**
 * Whether this Mint takes Raycast's Auto Care writes. Every Mint since
 * 1.0.80 lists autocare.disk among its surface actions, but before 1.1.2 it
 * refuses one without a daily, weekdays or weekly frequency, so the version
 * decides. A CLI that cannot say its version (outside Mint.app) is not trusted
 * to be new enough.
 */
export function autoCareSupported(appVersion: string | undefined): boolean {
  return Boolean(appVersion && isAtLeastVersion(appVersion, AUTOCARE_MINIMUM_VERSION));
}

export type DiskBucket = "optimizable" | "rebuildable" | "clutter";

/** DiskAutoCare.supported, in the popover's order, with DiskDecisionGroup.title. */
export const DISK_BUCKETS: Array<{ bucket: DiskBucket; title: string }> = [
  { bucket: "optimizable", title: "Optimizable" },
  { bucket: "rebuildable", title: "Safe to clean" },
  { bucket: "clutter", title: "Yours" },
];

/** DiskDecisionGroup.canonical for the names a saved plan can carry. */
const CANONICAL: Record<string, DiskBucket> = {
  optimizable: "optimizable",
  rebuildable: "rebuildable",
  leftovers: "rebuildable",
  clutter: "clutter",
  compressible: "clutter",
};

/** DiskAutoCare.defaultChooserAge: Yours starts at 30 days, the others at any age. */
export function defaultAge(bucket: DiskBucket): number {
  return bucket === "clutter" ? 30 : 0;
}

/** DiskAutoCare.chooserAgeOptions and chooserAgeTitle. */
export const AGE_OPTIONS = [0, 7, 14, 30, 60, 90, 180, 365];
export function ageTitle(days: number): string {
  return days === 0 ? "Any age" : `${days} days`;
}

export const ALL_TYPES = "*";

/** DiskDrawerClutterFilter: every case but All, in its order, with its title. */
const CLUTTER_CHIPS: Array<[string, string]> = [
  ["codexConversations", "Codex"],
  ["claudeCodeConversations", "Claude Code"],
  ["geminiConversations", "Gemini CLI"],
  ["cursorConversations", "Cursor"],
  ["conversations", "Agent conversations"],
  ["trash", "Trash"],
  ["restorePoints", "Time Machine"],
  ["workspaces", "Workspaces"],
  ["apps", "Apps"],
  ["captures", "Captures"],
  ["downloads", "Downloaded"],
  ["desktop", "Desktop"],
  ["documents", "Documents"],
  ["pictures", "Pictures"],
  ["movies", "Movies"],
  ["music", "Music"],
  ["iPhoneBackups", "iPhone backups"],
  ["appData", "App data"],
  ["developer", "Developer"],
  ["other", "Elsewhere"],
];
const CONVERSATION_CHIPS = new Set(
  ["codexConversations", "claudeCodeConversations", "geminiConversations", "cursorConversations", "conversations"].map(
    (name) => `clutter:${name}`,
  ),
);

/** DiskOptimizationKind.title, for a Safe to clean or Optimizable plan saved by type. */
const KIND_TITLES: Record<string, string> = {
  systemJunk: "System junk",
  trashBins: "Trash bins",
  caches: "Caches",
  logs: "Log files",
  agentConversations: "Codex conversations",
  appSlimming: "Slim apps",
  dormant: "Dormant apps & files",
  largeFiles: "Large files",
  developerJunk: "Developer junk",
  duplicatesSimilar: "Duplicates & similar",
};

/** DiskAutoCare.yoursTypeChips: Yours' types when its drawer never listed any on this Mac. */
export const YOURS_TYPE_CHIPS = CLUTTER_CHIPS.map(([name]) => `clutter:${name}`).filter(
  (id) => !CONVERSATION_CHIPS.has(id),
);

export function isConversationChip(id: string): boolean {
  return CONVERSATION_CHIPS.has(id);
}

/** DiskCareScope.savedChipTitle (English): undefined for an id the app has no name for. */
export function chipTitle(id: string): string | undefined {
  if (id === ALL_TYPES) return "All types";
  if (id.startsWith("kind:")) return KIND_TITLES[id.slice(5)];
  if (id.startsWith("source:")) return id.slice(7) || undefined;
  if (id.startsWith("clutter:")) return CLUTTER_CHIPS.find(([name]) => name === id.slice(8))?.[1];
  if (id.startsWith("native-manager:")) {
    const name = id.slice(15);
    return ["homebrew", "pnpm", "conda", "nix", "tart"].includes(name)
      ? name.charAt(0).toUpperCase() + name.slice(1)
      : undefined;
  }
  return undefined;
}

export type DiskCareScope = { chips: string[]; minimumAgeDays: number; chipAges?: Record<string, number> };

function scopeIsValid(scope: DiskCareScope | undefined): scope is DiskCareScope {
  return Boolean(
    scope &&
    Array.isArray(scope.chips) &&
    scope.chips.length > 0 &&
    scope.chips.length <= 64 &&
    Number.isInteger(scope.minimumAgeDays) &&
    scope.minimumAgeDays >= 0 &&
    scope.minimumAgeDays <= 3650,
  );
}

type Task = CareTask & { diskCareScope?: DiskCareScope; id?: string };

/** DiskAutoCare.task: the bucket's one plan. */
export function diskPlan(care: AutoCareJSON | undefined, bucket: DiskBucket): Task | undefined {
  return (care?.tasks as Task[] | undefined)?.find(
    (task) => task.taskType === "cleanup" && CANONICAL[task.diskCareBucket ?? ""] === bucket,
  );
}

/** DiskAutoCare.isScheduled: what the popover ticks. */
export function isScheduled(task: Task | undefined): boolean {
  if (!task || task.taskType !== "cleanup" || !task.enabled) return false;
  const bucket = CANONICAL[task.diskCareBucket ?? ""];
  if (!bucket) return false;
  const scoped = task.diskCareScope ? scopeIsValid(task.diskCareScope) : bucket !== "clutter";
  const minutes = task.scheduleTimeMinutes;
  return (
    scoped &&
    typeof minutes === "number" &&
    minutes >= 0 &&
    minutes < 1440 &&
    ["hourly", "daily", "weekdays", "weekly"].includes(task.scheduleFrequency ?? "")
  );
}

/** DiskAutoCare.typesNames: three or fewer named types by name, else a count. */
export function typesNames(scope: DiskCareScope | undefined): string {
  if (!scope || scope.chips.includes(ALL_TYPES)) return "All types";
  const count = scope.chips.length === 1 ? "1 type" : `${scope.chips.length} types`;
  if (scope.chips.length > 3) return count;
  const names = [...scope.chips].sort().map(chipTitle);
  return names.every(Boolean) ? names.join(", ") : count;
}

/** DiskAutoCare.scopeText: "All types", or "Captures · 30+ days". */
export function scopeText(scope: DiskCareScope | undefined): string {
  const age = scope?.minimumAgeDays ?? 0;
  return [typesNames(scope), age > 0 ? `${age}+ days` : undefined].filter(Boolean).join(" · ");
}

export type DiskRow = {
  bucket: DiskBucket;
  title: string;
  on: boolean;
  /** The popover's line under the bucket's name. */
  detail?: string;
  /** A rule saved before, kept while off (setBucket turns it on again). */
  savedScope?: DiskCareScope;
  timeMinutes: number;
};

/**
 * One row per bucket, as the clock's popover draws it (DiskAutoCareOverview):
 * on, what the plan takes; Yours off with no rule, "Choose what it may take".
 */
export function diskRows(care: AutoCareJSON | undefined): DiskRow[] {
  return DISK_BUCKETS.map(({ bucket, title }) => {
    const plan = diskPlan(care, bucket);
    const on = isScheduled(plan);
    const savedScope = scopeIsValid(plan?.diskCareScope) ? plan?.diskCareScope : undefined;
    let detail: string | undefined;
    if (on) detail = scopeText(plan?.diskCareScope);
    else if (bucket === "clutter" && !savedScope) detail = "Choose what it may take";
    return { bucket, title, on, detail, savedScope, timeMinutes: plan?.scheduleTimeMinutes ?? 7 * 60 };
  });
}

/** DiskAutoCare.isOn: the popover's one switch. */
export function autoCareIsOn(care: AutoCareJSON | undefined): boolean {
  return ((care?.tasks as Task[] | undefined) ?? []).some(isScheduled);
}

export type DiskRequest = {
  action: "autocare.disk";
  bucket: DiskBucket;
  enabled: boolean;
  timeMinutes: number;
  confirmed: true;
  diskCareScope?: DiskCareScope;
};

/**
 * The popover's tick (DiskAutoCare.setBucket) as one autocare.disk request.
 * Off keeps the rule. On: the rule saved before (Mint keeps it when no scope
 * is sent), else every type at the drawer's default age; Yours has no
 * default and needs `scope`. The time is the plan's own, which Mint keeps.
 */
export function diskRequest(row: DiskRow, enabled: boolean, scope?: DiskCareScope): DiskRequest {
  const request: DiskRequest = {
    action: "autocare.disk",
    bucket: row.bucket,
    enabled,
    timeMinutes: row.timeMinutes,
    confirmed: true,
  };
  if (scope) request.diskCareScope = scope;
  else if (enabled && !row.savedScope) {
    if (row.bucket === "clutter") throw new Error("Choose what Auto Care may take from Yours first.");
    request.diskCareScope = { chips: [ALL_TYPES], minimumAgeDays: defaultAge(row.bucket) };
  }
  return request;
}

/** DiskAutoCare.toggledChips: "All types" stands alone; a named type replaces it. */
export function yoursScope(chosen: string[], age: number): DiskCareScope | undefined {
  const chips = chosen.includes(ALL_TYPES) ? [ALL_TYPES] : chosen.filter((id) => !isConversationChip(id));
  if (!chips.length) return undefined;
  return { chips, minimumAgeDays: Math.max(0, Math.min(3650, age)) };
}

export type ChooserOption = { id: string; title: string; listed: boolean; choosable: boolean };

/**
 * DiskAutoCare.chooserOptions: what Yours' drawer last listed on this Mac
 * (Mint.AutoCare.ListedTypes.V1), else every type it can name, then any
 * type the rule names that is not there now. Conversations are shown, never
 * choosable.
 */
export function chooserOptions(listed: string[] | undefined, chosen: string[]): ChooserOption[] {
  const shown = listed?.length ? listed : YOURS_TYPE_CHIPS;
  const extras = chosen.filter((id) => id !== ALL_TYPES && !shown.includes(id) && !isConversationChip(id)).sort();
  const title = (id: string) => chipTitle(id) ?? id.split(":").pop() ?? id;
  return [
    ...shown.map((id) => ({ id, title: title(id), listed: true, choosable: !isConversationChip(id) })),
    ...extras.map((id) => ({ id, title: title(id), listed: !listed?.length, choosable: true })),
  ];
}

/** DiskAutoCare.chooserNote: what a chosen type costs, said once. */
export function chooserNotes(chosen: string[]): string[] {
  const notes: string[] = [];
  if (chosen.includes("clutter:workspaces")) {
    notes.push("Folders with uncommitted changes, or commits only they hold, are always skipped.");
  }
  if (chosen.some((id) => PERMANENT_CHIPS.includes(id))) notes.push("Removed permanently.");
  return notes;
}

/** The types chooserNote calls "Removed permanently.": every other Yours file goes to the Trash. */
const PERMANENT_CHIPS = ["clutter:trash", "clutter:restorePoints", "source:Codex", "source:Claude Code"];

/**
 * What turning Yours on does, for the question before it: where its files
 * go, with the chooser's notes. "All types" takes every type, so it says
 * every note.
 */
export function yoursConsequence(scope: DiskCareScope | undefined): string {
  const chips = !scope || scope.chips.includes(ALL_TYPES) ? [...YOURS_TYPE_CHIPS] : scope.chips;
  const permanent = chips.filter((id) => PERMANENT_CHIPS.includes(id)).map((id) => chipTitle(id) ?? id);
  const sentences = [
    permanent.length === chips.length
      ? `${permanent.join(", ")}: removed permanently.`
      : permanent.length
        ? `Files go to the Trash; ${permanent.join(", ")}: removed permanently.`
        : "Files go to the Trash.",
    ...chooserNotes(chips).filter((note) => note !== "Removed permanently."),
  ];
  return sentences.join(" ");
}

/**
 * Mint.AutoCare.ListedTypes.V1's Yours list as `defaults read` prints it:
 * `{ clutter = ( "clutter:trash", "clutter:captures" ); }`. Undefined when
 * it is not there or does not read.
 */
export function parseListedTypes(text: string | undefined, bucket = "clutter"): string[] | undefined {
  if (!text) return undefined;
  const match = new RegExp(`(?:^|[\\s{;])"?${bucket}"?\\s*=\\s*\\(([^)]*)\\)`).exec(text);
  if (!match) return undefined;
  const ids = match[1]
    .split(",")
    .map((part) => part.trim().replace(/^"(.*)"$/, "$1"))
    .filter(Boolean);
  return ids.length ? ids : undefined;
}

// --- Memory --------------------------------------------------------------

/** MemoryGuard.minimumThreshold … maximumThreshold, in percent. */
export const MEMORY_THRESHOLDS = Array.from({ length: 50 }, (_, index) => 50 + index);

/** The Memory page's header after "Auto Care · " (MemoryTabView.careSummary). */
export function memoryText(care: AutoCareJSON | undefined): string {
  if (!care) return "…";
  if (care.automationAllowed === false) return "Locked";
  if (!care.memory?.available) return "Off";
  return care.memory.enabled && care.memory.threshold ? `Starts at ${care.memory.threshold}%` : "Off";
}

export type MemoryRequest = { action: "autocare.memory"; enabled: boolean; threshold: number; confirmed: true };

/** The Memory page's switch and slider as one autocare.memory request; the other half keeps its value. */
export function memoryRequest(
  care: AutoCareJSON | undefined,
  change: { enabled?: boolean; threshold?: number },
): MemoryRequest {
  const threshold = change.threshold ?? care?.memory?.threshold ?? 92;
  if (!Number.isInteger(threshold) || threshold < 50 || threshold > 99) {
    throw new Error("The threshold is from 50% through 99%.");
  }
  return {
    action: "autocare.memory",
    enabled: change.enabled ?? care?.memory?.enabled ?? false,
    threshold,
    confirmed: true,
  };
}

// --- Folders -------------------------------------------------------------

export type FolderMode = "manual" | "daily" | "onArrival";

/** FolderAutomation.defaultTimeMinutes: 9:00 AM. */
export const FOLDER_DEFAULT_TIME = 9 * 60;

function samePath(a: string, b: string): boolean {
  const trim = (path: string) => (path.length > 1 ? path.replace(/\/+$/, "") : path);
  return trim(a) === trim(b);
}

/**
 * FolderAutomation.mode and status: arrival wins; daily while an organize
 * plan that covers the folder is on and scheduled; the time is that plan's,
 * else the last one it had, else 9:00 AM.
 */
export function folderMode(
  path: string,
  care: AutoCareJSON | undefined,
): { mode: FolderMode; timeMinutes: number; frequency?: string } {
  const covering = ((care?.tasks as Task[] | undefined) ?? []).filter(
    (task) => task.taskType === "organize" && (task.folderPaths ?? []).some((folder) => samePath(folder, path)),
  );
  const active = covering.find((task) => task.enabled && task.scheduleFrequency && task.scheduleFrequency !== "manual");
  const timeMinutes =
    active?.scheduleTimeMinutes ??
    covering.find((task) => typeof task.scheduleTimeMinutes === "number")?.scheduleTimeMinutes ??
    FOLDER_DEFAULT_TIME;
  const folder = care?.folders?.find((entry) => samePath(entry.path, path));
  if (folder?.organizeOnArrival) return { mode: "onArrival", timeMinutes };
  return active ? { mode: "daily", timeMinutes, frequency: active.scheduleFrequency } : { mode: "manual", timeMinutes };
}

export function clockText(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(mins).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
}

/** The Files page's popover: "Daily at 9:00 AM", "As files arrive", or Off. */
export function folderText(path: string, care: AutoCareJSON | undefined): string {
  if (!care) return "…";
  if (care.automationAllowed === false) return "Locked";
  const { mode, timeMinutes, frequency } = folderMode(path, care);
  if (mode === "onArrival") return "As files arrive";
  if (mode === "manual") return "Off";
  // An older plan can still say weekly; FolderAutomation writes only daily.
  return frequency === "weekly" ? `Weekly at ${clockText(timeMinutes)}` : `Daily at ${clockText(timeMinutes)}`;
}

export type FolderRequest = {
  action: "autocare.folder";
  path: string;
  mode: FolderMode;
  timeMinutes: number;
  confirmed: true;
};

export function folderRequest(path: string, mode: FolderMode, timeMinutes: number): FolderRequest {
  if (!Number.isInteger(timeMinutes) || timeMinutes < 0 || timeMinutes >= 1440) {
    throw new Error("The time is a minute of the day.");
  }
  return { action: "autocare.folder", path, mode, timeMinutes, confirmed: true };
}

/** The times the Daily at menu offers: every hour, and the folder's own if it is between them. */
export function folderTimes(current: number): number[] {
  const hours = Array.from({ length: 24 }, (_, hour) => hour * 60);
  return hours.includes(current) ? hours : [...hours, current].sort((a, b) => a - b);
}

// --- Where the command opens ----------------------------------------------

export type AutoCareSection = "disk" | "memory" | "folders";
export type AutoCareLaunch = { section?: AutoCareSection; bucket?: DiskBucket; folder?: string };

/** The row the command selects when another command opens it. */
export function launchSelection(context: AutoCareLaunch | undefined): string | undefined {
  if (!context) return undefined;
  if (context.folder) return `folder:${context.folder}`;
  if (context.section === "memory") return "memory";
  if (context.section === "folders") return undefined;
  if (context.section === "disk") return `disk:${context.bucket ?? "optimizable"}`;
  return undefined;
}
