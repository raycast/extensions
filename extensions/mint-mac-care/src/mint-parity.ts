// What the commands Raycast opens with Mint 1.2 share (2026-11-05, Yukun 11-04:
// everything 1.1.3 does, open in Raycast as it is in MCP): the capability they
// need, one request wrapper, how a confirmation in Mint's window answers, and
// the pure shaping of Mint's answers, so node can test it. The views are in
// mint-trash, mint-conversations, mint-history, mint-handling and mint-rules.

import { formatBytes, formatCompact, plural, runMintSurface } from "./mint-cli";
import type { MintCLIVersion, MintSurfaceRequest, MintSurfaceResponse } from "./mint-cli";

/**
 * Mint confirms these commands' changes in its own window, never in Raycast
 * (NativeMCPApproval.raycastCapability). A Mint without it would run them on
 * the extension's `confirmed: true` alone, so the extension refuses them.
 */
export const NATIVE_APPROVAL_CAPABILITY = "surface.native-approval.v1";

export function hasCapability(version: MintCLIVersion | undefined, capability: string): boolean {
  return Boolean(version?.capabilities?.includes(capability));
}

/** The request fields these commands send beyond what mint-cli.ts types. */
export type ParityRequest = Omit<MintSurfaceRequest, "schemaVersion"> & {
  itemID?: string;
  level?: "protect" | "needs-review" | "ordinary";
  source?: "conversations" | "compression";
  kept?: boolean;
  ruleID?: string;
  rule?: CustomRule;
  limit?: number;
};

export function runParity<T extends object>(
  cli: string,
  request: ParityRequest,
  timeout?: number,
): Promise<T & MintSurfaceResponse> {
  return runMintSurface<T>(cli, request as Omit<MintSurfaceRequest, "schemaVersion">, timeout);
}

/** How a request Mint asked the person to confirm answers when it did not run. */
export type NotRun = { cancelled?: boolean; started?: boolean; approval?: string; notice?: string };

/**
 * The line to show when Mint's window did not approve the request, else
 * undefined. Mint's own notice wins; these cover an answer without one.
 */
export function notApprovedText(answer: NotRun): string | undefined {
  if (answer.cancelled !== true || answer.started !== false) return undefined;
  if (answer.notice) return answer.notice;
  switch (answer.approval) {
    case "expired":
      return "The confirmation in Mint expired. Nothing changed.";
    case "review_changed":
      return "What was listed changed before the confirmation. Look again; nothing changed.";
    case "interactive_session_required":
      return "Mint needs someone at this Mac to confirm. Nothing changed.";
    default:
      return "Not confirmed in Mint. Nothing changed.";
  }
}

// --- Trash -------------------------------------------------------------------

export type TrashItem = {
  id: string;
  path: string;
  name: string;
  bytes: number;
  isDirectory: boolean;
  inICloud: boolean;
  needsAdministrator: boolean;
};
export type TrashScan = { sessionID: string; complete: boolean; items: TrashItem[] };
export type TrashRemoval = NotRun & {
  removedCount?: number;
  failedCount?: number;
  partiallyRemovedCount?: number;
  processedBytes?: number;
  physicallyReclaimedBytes?: number;
  failures?: Array<{ name: string; reason: string }>;
};

/** Largest first, as the Disk page's Trash panel lists them. */
export function trashRows(scan: TrashScan | undefined): TrashItem[] {
  return [...(scan?.items ?? [])].sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name));
}

export function trashReceipt(result: TrashRemoval): string {
  const freed = result.physicallyReclaimedBytes ?? result.processedBytes ?? 0;
  const parts = [`${plural(result.removedCount ?? 0, "item")} deleted`, `${formatBytes(freed)} freed`];
  if (result.failedCount) parts.push(`${result.failedCount} kept: ${result.failures?.[0]?.reason ?? "macOS refused"}`);
  return parts.join(" · ");
}

// --- AI conversations ---------------------------------------------------------

export type ConversationFamily = {
  id: string;
  title: string;
  paths: string[];
  bytes: number;
  conversations: number;
  archived: boolean;
};
export type ConversationScan = { sessionID: string; items: ConversationFamily[]; optimizationAvailable?: boolean };
export type ConversationResult = NotRun & {
  changedCount?: number;
  deletedCount?: number;
  processedBytes?: number;
  physicallyReclaimedBytes?: number;
  failures?: unknown[];
  partiallyRemovedCount?: number;
};

/** A Claude Code transcript with pictures (disk.compress.scan): a DeclutterItem. */
export type Transcript = { id: string; path: string; label: string; sizeBytes: number; lastModifiedAt?: string };
export type TranscriptScan = { sessionID: string; items: Transcript[] };
export type TranscriptResult = NotRun & {
  compressedCount?: number;
  alreadyProcessedCount?: number;
  savedBytes?: number;
  failures?: Array<{ path: string; reason: string }>;
};

export type ConversationVerb = "agents.optimize" | "agents.remove-media" | "agents.delete";

export function conversationRows(scan: ConversationScan | undefined): ConversationFamily[] {
  return [...(scan?.items ?? [])].sort((a, b) => b.bytes - a.bytes || a.title.localeCompare(b.title));
}

/** One line for a run on conversations, from what Mint says changed. */
export function conversationReceipt(verb: ConversationVerb, result: ConversationResult): string {
  const freed = formatBytes(result.physicallyReclaimedBytes ?? 0);
  const failed = Array.isArray(result.failures) ? result.failures.length : 0;
  const head =
    verb === "agents.delete"
      ? `${plural(result.deletedCount ?? 0, "file")} deleted · ${freed} freed`
      : verb === "agents.remove-media"
        ? `Pictures removed from ${plural(result.changedCount ?? 0, "file")} · ${freed} freed`
        : `${plural(result.changedCount ?? 0, "file")} optimized · ${freed} back`;
  return failed ? `${head} · ${failed} left as they were` : head;
}

export function transcriptReceipt(result: TranscriptResult): string {
  const head = `Pictures removed from ${plural(result.compressedCount ?? 0, "conversation")} · ${formatBytes(result.savedBytes ?? 0)} freed`;
  const failed = result.failures?.length ?? 0;
  return failed ? `${head} · ${failed} left as they were` : head;
}

// --- Pictures inside conversations -------------------------------------------

export type Picture = {
  id: string;
  copies: number;
  estimatedSavingBytes: number;
  mime: string;
  files: string[];
  kept: boolean;
};
export type PictureScan = { sessionID: string; source: "conversations" | "compression"; items: Picture[] };
export type PicturePreview = { pictureID: string; previewImage: { mimeType: string; data: string } };
export type PictureResult = NotRun & {
  changedCount?: number;
  /** Mint's reasons, for a removal it did not do in full (the free allowance, a file that changed). */
  failures?: unknown[];
  savedBytes?: number;
  physicallyReclaimedBytes?: number;
  updatedPictureCount?: number;
  review?: PictureScan;
};

/**
 * Mint's window reviews at most 100 pictures in one request. Removing pictures
 * saves every unselected one as a Keep choice, so the chooser stops at 100
 * rather than sending part of what was chosen.
 */
export const PICTURES_PER_REQUEST = 100;

/**
 * How many of the pictures sent Mint changed, read from the fresh review it
 * answers with: a removed picture is gone from it, a kept one carries the new
 * choice. Undefined when Mint answered without a review.
 */
export function picturesChanged(sent: string[], answer: PictureResult, kept?: boolean): number | undefined {
  if (!answer.review) return undefined;
  const listed = new Map(answer.review.items.map((picture) => [picture.id, picture]));
  return sent.filter((id) => (kept === undefined ? !listed.has(id) : listed.get(id)?.kept === kept)).length;
}

/** One line for a picture removal, counting only the pictures that went. */
export function pictureRemovalReceipt(sent: string[], answer: PictureResult): string {
  const freed = `${formatCompact(answer.physicallyReclaimedBytes ?? answer.savedBytes ?? 0)} freed`;
  const removed = picturesChanged(sent, answer);
  if (removed === undefined)
    return `Pictures removed from ${plural(answer.changedCount ?? 0, "conversation")} · ${freed}`;
  const left = sent.length - removed;
  const why = left ? firstReason(answer.failures) : undefined;
  return `${plural(removed, "picture")} removed · ${freed}${left ? ` · ${left} left as they were` : ""}${why ? `: ${why}` : ""}`;
}

/** Mint's first reason, as it wrote it: a sentence, or a `{ reason }` / `{ path, reason }` row. */
function firstReason(failures: unknown[] | undefined): string | undefined {
  const first = failures?.[0];
  if (typeof first === "string") return first.trim() || undefined;
  if (first && typeof first === "object" && "reason" in first && typeof first.reason === "string")
    return first.reason.trim() || undefined;
  return undefined;
}

export function pictureRows(scan: PictureScan | undefined): Picture[] {
  return [...(scan?.items ?? [])].sort(
    (a, b) => Number(a.kept) - Number(b.kept) || b.estimatedSavingBytes - a.estimatedSavingBytes,
  );
}

// --- History ------------------------------------------------------------------

type DiskRecord = {
  date: string;
  freedBytes: number;
  itemCount: number;
  movedToTrash?: boolean;
  permanentlyDeleted?: boolean;
  lossless?: boolean | null;
  autoCareBucket?: string | null;
};
type MemoryRecord = {
  date: string;
  freedBytes: number;
  quitCount: number;
  quitNames?: string[];
  wasAutomatic?: boolean;
};
type OrganizeRecord = { date: string; filesMoved: number; folderCount: number };
type UninstallRecord = { date: string; appName: string; freedBytes: number; appCount: number };
export type HistoryAnswer = {
  disk?: DiskRecord[];
  memory?: MemoryRecord[];
  organize?: OrganizeRecord[];
  uninstall?: UninstallRecord[];
};
export type HistoryKind = "disk" | "memory" | "organize" | "uninstall";
export type HistoryRow = { kind: HistoryKind; date: string; title: string; detail?: string; automatic: boolean };

/** Every receipt Mint keeps, newest first, in the History page's words. */
export function historyRows(answer: HistoryAnswer | undefined): HistoryRow[] {
  const rows: HistoryRow[] = [];
  for (const record of answer?.disk ?? []) {
    const verb = record.lossless
      ? "optimized, nothing deleted"
      : record.permanentlyDeleted
        ? "deleted"
        : record.movedToTrash
          ? "moved to the Trash"
          : "cleaned";
    rows.push({
      kind: "disk",
      date: record.date,
      title: `${formatBytes(record.freedBytes)} ${verb}`,
      detail: plural(record.itemCount, "item"),
      automatic: Boolean(record.autoCareBucket),
    });
  }
  for (const record of answer?.memory ?? []) {
    rows.push({
      kind: "memory",
      date: record.date,
      title: `${formatBytes(record.freedBytes)} of memory freed`,
      detail: record.quitNames?.length ? record.quitNames.join(", ") : plural(record.quitCount, "app"),
      automatic: Boolean(record.wasAutomatic),
    });
  }
  for (const record of answer?.organize ?? []) {
    rows.push({
      kind: "organize",
      date: record.date,
      title: `${plural(record.filesMoved, "file")} organized`,
      detail: plural(record.folderCount, "folder"),
      automatic: false,
    });
  }
  for (const record of answer?.uninstall ?? []) {
    rows.push({
      kind: "uninstall",
      date: record.date,
      title: `${record.appName} uninstalled`,
      detail: `${formatBytes(record.freedBytes)} to the Trash`,
      automatic: false,
    });
  }
  return rows.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

// --- File handling -----------------------------------------------------------

export type HandlingPermission = {
  id: string;
  path: string;
  level: "protect" | "needs_review";
  source: string;
  updatedAt?: string;
};
export type HandlingAnswer = { permissions: HandlingPermission[]; revision?: number };

export function handlingRows(answer: HandlingAnswer | undefined): HandlingPermission[] {
  return [...(answer?.permissions ?? [])].sort((a, b) =>
    a.level === b.level ? a.path.localeCompare(b.path) : a.level === "protect" ? -1 : 1,
  );
}

export function handlingTitle(level: HandlingPermission["level"]): string {
  return level === "protect" ? "Protect" : "Needs Review";
}

// --- Cleanup rules ------------------------------------------------------------

export type RuleFilter = {
  minSizeMB?: number | null;
  extensions?: string[] | null;
  nameKeyword?: string | null;
  olderThanDays?: number | null;
  namePrefix?: string | null;
  namePattern?: string | null;
  isScreenshot?: boolean | null;
  semanticQuery?: string | null;
  nameMatchMode?: string | null;
  timestampMode?: string | null;
};
export type RuleAction = "protected" | "review" | "trash" | "delete";
export type Rule = {
  id: string;
  name: string;
  subtitle?: string;
  icon?: string;
  accentColor?: string;
  group?: string;
  enabled: boolean;
  builtin: boolean;
  filter: RuleFilter;
  preferredAction: RuleAction;
};
/** Mint decodes `icon` as required (`DeclutterRule.init(from:)`), so every rule Raycast sends carries one. */
export type CustomRule = Omit<Rule, "builtin" | "icon"> & { builtin: false; icon: string };
/** A new rule's icon. Nothing in Mint draws a rule's icon today; it only has to be there. */
export const CUSTOM_RULE_ICON = "line.3.horizontal.decrease.circle";
export type RulesAnswer = { rules: Rule[] };
export type RuleScan = {
  sessionID: string;
  totalBytes: number;
  items: Array<{ id: string; path: string; label: string; sizeBytes: number }>;
};

/** Built-in first, then the person's own, each by name. */
export function ruleRows(answer: RulesAnswer | undefined): Rule[] {
  return [...(answer?.rules ?? [])].sort(
    (a, b) => Number(a.builtin === false) - Number(b.builtin === false) || a.name.localeCompare(b.name),
  );
}

export function ruleActionTitle(action: RuleAction): string {
  switch (action) {
    case "protected":
      return "Protect";
    case "review":
      return "Review first";
    case "trash":
      return "Move to the Trash";
    case "delete":
      return "Delete permanently";
  }
}

/** What a rule matches, from its filter, as a short line. */
export function ruleSummary(filter: RuleFilter): string {
  const parts: string[] = [];
  if (filter.extensions?.length) parts.push(filter.extensions.map((ext) => `.${ext.replace(/^\./, "")}`).join(" "));
  if (filter.nameKeyword) parts.push(`name has "${filter.nameKeyword}"`);
  if (filter.namePrefix) parts.push(`name starts "${filter.namePrefix}"`);
  if (filter.isScreenshot) parts.push("screenshots");
  if (filter.minSizeMB) parts.push(`${filter.minSizeMB} MB or larger`);
  if (filter.olderThanDays) parts.push(`older than ${plural(filter.olderThanDays, "day")}`);
  return parts.join(" · ") || "Every file";
}

export type RuleDraft = {
  name: string;
  extensions: string;
  nameKeyword: string;
  olderThanDays: string;
  minSizeMB: string;
  action: RuleAction;
};

/**
 * A custom rule from the form, or the reason it cannot be one. Mint checks it
 * again and asks the person in its own window before saving. An edit passes
 * the rule as listed (`kept`): what the form does not show (its icon, colour,
 * group, subtitle, and filter criteria such as `namePrefix` or
 * `nameMatchMode`) is sent back as it was, since `rules.update` replaces the
 * whole rule.
 */
export function customRule(draft: RuleDraft, id: string, kept?: Rule): { rule?: CustomRule; problem?: string } {
  const name = draft.name.trim();
  if (!name) return { problem: "Give the rule a name." };
  const extensions = draft.extensions
    .split(/[\s,]+/)
    .map((ext) => ext.trim().replace(/^\./, "").toLowerCase())
    .filter(Boolean);
  const days = draft.olderThanDays.trim() ? Number(draft.olderThanDays) : undefined;
  const size = draft.minSizeMB.trim() ? Number(draft.minSizeMB) : undefined;
  if (days !== undefined && (!Number.isInteger(days) || days < 1 || days > 3650)) {
    return { problem: "Older than takes whole days, 1 to 3650." };
  }
  if (size !== undefined && (!Number.isFinite(size) || size <= 0)) return { problem: "Size takes a number of MB." };
  const keyword = draft.nameKeyword.trim();
  const filter: RuleFilter = { ...(kept?.filter ?? {}) };
  delete filter.extensions;
  delete filter.nameKeyword;
  delete filter.olderThanDays;
  delete filter.minSizeMB;
  if (extensions.length) filter.extensions = extensions;
  if (keyword) filter.nameKeyword = keyword;
  if (days !== undefined) filter.olderThanDays = days;
  if (size !== undefined) filter.minSizeMB = size;
  const matches =
    Boolean(filter.extensions?.length || filter.nameKeyword || filter.namePrefix || filter.namePattern) ||
    Boolean(filter.semanticQuery?.trim() || filter.isScreenshot || filter.olderThanDays || filter.minSizeMB);
  if (!matches) return { problem: "Choose at least one thing the rule matches." };
  const rule: CustomRule = {
    id,
    name,
    icon: kept?.icon || CUSTOM_RULE_ICON,
    enabled: true,
    builtin: false,
    filter,
    preferredAction: draft.action,
  };
  if (kept?.accentColor) rule.accentColor = kept.accentColor;
  if (kept?.group) rule.group = kept.group;
  if (kept?.subtitle) rule.subtitle = kept.subtitle;
  return { rule };
}

// --- Access ---------------------------------------------------------------------

export type AccessAnswer = {
  allowed?: boolean;
  plan?: boolean;
  remainingCleanupBytes?: number | null;
  cleanupAllowanceResetsAt?: string;
};

/** The free week's line for View Mac Status; none on a plan with no limit. */
export function allowanceLine(access: AccessAnswer | undefined, now = new Date()): string | undefined {
  if (!access || access.remainingCleanupBytes === null || access.remainingCleanupBytes === undefined) return undefined;
  const reset = access.cleanupAllowanceResetsAt ? new Date(access.cleanupAllowanceResetsAt) : undefined;
  const days =
    reset && Number.isFinite(reset.getTime())
      ? Math.max(0, Math.ceil((reset.getTime() - now.getTime()) / 86_400_000))
      : undefined;
  const left = `${formatBytes(Math.max(0, access.remainingCleanupBytes))} free to clean or organize this week`;
  return days === undefined ? left : `${left} · back in ${plural(days, "day")}`;
}
