// What each command lists and the picture beside each row, without Raycast:
// the commands draw these, and the tests and the offline renders call the
// same functions on real data.

import { homedir } from "node:os";
import { formatCompact, plural } from "./mint-cli";
import { PILE_COLORS, TIER_COLORS, attributed, displaySource, memoryScale, sourceOf, sourceOrder } from "./mint-model";
import { PANE_WIDTH, accent, listSVG, markdownImage } from "./mint-visuals";
import type { Appearance, ListRow } from "./mint-visuals";

export function baseName(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}

// ---------------------------------------------------------------------------
// Optimize Storage: identical copies by the source they live in.
// ---------------------------------------------------------------------------

export type Copy = { id: string; path: string; keeper: string; estimatedSavingBytes: number };
export type OptimizeScan = { sessionID: string; complete?: boolean; items: Copy[] };
/** One file and its copies within one source: a copy counts where it lives, as the app counts it. */
export type CopyGroup = { id: string; keeper: string; source: string; copies: Copy[]; bytes: number };
export type Source = { key: string; groups: CopyGroup[]; bytes: number };

export function groupCopies(copies: Copy[], home = homedir()): CopyGroup[] {
  const byID = new Map<string, CopyGroup>();
  for (const copy of copies) {
    const source = sourceOf(copy.path, home);
    const id = `${source}\u0000${copy.keeper}`;
    const group = byID.get(id) ?? { id, keeper: copy.keeper, source, copies: [], bytes: 0 };
    group.copies.push(copy);
    group.bytes += Math.max(0, copy.estimatedSavingBytes);
    byID.set(id, group);
  }
  return [...byID.values()].sort((a, b) => b.bytes - a.bytes);
}

export function sourcesOf(groups: CopyGroup[]): Source[] {
  const bySource = new Map<string, Source>();
  for (const group of groups) {
    const source = bySource.get(group.source) ?? { key: group.source, groups: [], bytes: 0 };
    source.groups.push(group);
    source.bytes += group.bytes;
    bySource.set(group.source, source);
  }
  return [...bySource.values()].sort((a, b) => sourceOrder(a.key) - sourceOrder(b.key) || b.bytes - a.bytes);
}

/** The sources a scan can fill, before it has: these three on every Mac, the AI tools Mint has found here before. */
export function expectedSources(seen: string[]): Source[] {
  const keys = new Set(["files", "apps", "tmp", ...seen.map(displaySource)]);
  return [...keys]
    .sort((a, b) => sourceOrder(a) - sourceOrder(b) || a.localeCompare(b))
    .map((key) => ({ key, groups: [], bytes: 0 }));
}

/** The scan's sources, with Files, Apps & data and Temporary files listed even when empty. */
export function sourcesWithBase(found: Source[]): Source[] {
  const keys = new Set(found.map((source) => source.key));
  const empty = ["files", "apps", "tmp"].filter((key) => !keys.has(key)).map((key) => ({ key, groups: [], bytes: 0 }));
  return [...found, ...empty].sort((a, b) => sourceOrder(a.key) - sourceOrder(b.key) || b.bytes - a.bytes);
}

export function sourcePicture(source: Source, all: Source[], appearance: Appearance, state: RunState = {}): string {
  const struck = state.struck ?? new Set<string>();
  const gone = state.gone ?? new Set<string>();
  const ids = (group: CopyGroup) => group.copies.map((copy) => copy.id);
  const listed = source.groups.filter((group) => !isDone(ids(group), gone));
  const left = listed.filter((group) => !isDone(ids(group), struck));
  const remainingOf = (groups: CopyGroup[]) =>
    groups.reduce((sum, group) => sum + (isDone(ids(group), struck) ? 0 : group.bytes), 0);
  const shown = listed.slice(0, 10);
  const rows: ListRow[] = shown.map((group) => ({
    title: baseName(group.keeper),
    detail: state.receipt && !isDone(ids(group), struck) ? "kept" : `${group.copies.length + 1} copies`,
    value: formatCompact(group.bytes),
    struck: isDone(ids(group), struck),
  }));
  const label = state.running
    ? state.running
    : state.receipt
      ? left.length
        ? `${formatCompact(state.receipt.bytes)} ${state.receipt.text} · ${left.length} kept`
        : `${state.receipt.text} · ${plural(source.groups.length, "file")}`
      : source.groups.length
        ? `${plural(left.length, "file")} ${left.length === 1 ? "shares its" : "share their"} copies · nothing deleted`
        : "No identical copies here right now";
  const value =
    state.receipt && left.length === 0
      ? formatCompact(state.receipt.bytes)
      : source.groups.length || state.receipt
        ? formatCompact(remainingOf(source.groups))
        : "None";
  const parts = all.map((other) => ({ bytes: remainingOf(other.groups), lit: other.key === source.key }));
  const picture = listSVG({
    appearance,
    value,
    label,
    color: TIER_COLORS.optimizable,
    rows,
    more: listed.length > shown.length ? `+${listed.length - shown.length} more · ⌘O` : undefined,
    whole: all.length > 1 && remainingOf(source.groups) > 0 ? parts : undefined,
  });
  return markdownImage(picture.svg, PANE_WIDTH, picture.height);
}

// ---------------------------------------------------------------------------
// Free Disk: the Disk page's groups.
// ---------------------------------------------------------------------------

export type DiskItem = {
  id: string;
  label: string;
  path: string;
  sizeBytes: number;
  defaultSelected: boolean;
  tier: "recommended" | "needs-review";
  /** Mint 1.0.81: the Disk page's group and its chip there. */
  group?: string | null;
  chip?: string | null;
};
export type DiskSection = { id: string; title: string; items: DiskItem[] };
export type DiskScan = { sessionID: string; notice?: string | null; sections: DiskSection[] };

export type BucketKey = "optimizable" | "safeToClean" | "yours" | "look";
/** One row of a group; `ids` are the request ids it stands for (a file and its copies are one row). */
export type Entry = {
  id: string;
  ids: string[];
  title: string;
  detail?: string;
  path: string;
  bytes: number;
  item?: DiskItem;
};
export type Bucket = { key: BucketKey; title: string; color: string; entries: Entry[]; bytes: number };

const BUCKETS: Record<BucketKey, { title: string; color: string }> = {
  optimizable: { title: "Optimizable", color: TIER_COLORS.optimizable },
  safeToClean: { title: "Safe to clean", color: TIER_COLORS.safeToClean },
  yours: { title: "Yours", color: TIER_COLORS.yours },
  look: { title: "Needs a look", color: TIER_COLORS.yours },
};

/**
 * The groups a scan will fill, before it has: they are always there, only
 * what is in them changes. A Mint that states the Disk page's groups gets
 * Yours; an older one states only what is safe without a look.
 */
export function bucketKeys(grouped: boolean): BucketKey[] {
  return ["optimizable", "safeToClean", grouped ? "yours" : "look"];
}

export function emptyBucket(key: BucketKey): Bucket {
  return { key, ...BUCKETS[key], entries: [], bytes: 0 };
}

/**
 * The scan's rows in the Disk page's groups, every group listed even when
 * empty. Mint 1.0.81 states each row's group; an older Mint states only
 * whether it is safe without a look, so its other rows are "Needs a look"
 * rather than guessed into Yours. Keep is left out: nothing in it can go.
 */
export function bucketsOf(scan: DiskScan | undefined, copies: OptimizeScan | undefined, grouped: boolean): Bucket[] {
  const items = scan?.sections.flatMap((section) => section.items) ?? [];
  const stated = items.length ? items.some((item) => item.group !== undefined) : grouped;
  const entries: Record<BucketKey, Entry[]> = { optimizable: [], safeToClean: [], yours: [], look: [] };
  for (const section of scan?.sections ?? []) {
    for (const item of section.items) {
      const key: BucketKey | undefined = !stated
        ? item.tier === "recommended"
          ? "safeToClean"
          : "look"
        : item.group === "rebuildable" || item.group === "leftovers"
          ? "safeToClean"
          : item.group === "clutter" || item.group === "compressible"
            ? "yours"
            : undefined;
      if (!key) continue;
      entries[key].push({
        id: item.id,
        ids: [item.id],
        title: item.label,
        detail: item.chip ?? section.title,
        path: item.path,
        bytes: Math.max(0, item.sizeBytes),
        item,
      });
    }
  }
  const byKeeper = new Map<string, Entry>();
  for (const copy of copies?.items ?? []) {
    const entry = byKeeper.get(copy.keeper) ?? {
      id: copy.keeper,
      ids: [],
      title: baseName(copy.keeper),
      path: copy.keeper,
      bytes: 0,
    };
    entry.ids.push(copy.id);
    entry.bytes += Math.max(0, copy.estimatedSavingBytes);
    entry.detail = `${entry.ids.length + 1} copies`;
    byKeeper.set(copy.keeper, entry);
  }
  entries.optimizable = [...byKeeper.values()];
  return bucketKeys(stated).map((key) => {
    const rows = entries[key].sort((a, b) => b.bytes - a.bytes);
    return { ...emptyBucket(key), entries: rows, bytes: rows.reduce((sum, entry) => sum + entry.bytes, 0) };
  });
}

/** A row is done when every item it stands for is. */
export function isDone(ids: string[], done: ReadonlySet<string>): boolean {
  return ids.length > 0 && ids.every((id) => done.has(id));
}

/** What is still there: rows not struck yet. */
export function remainingBytes(entries: Entry[], struck: ReadonlySet<string>): number {
  return entries.reduce((sum, entry) => sum + (isDone(entry.ids, struck) ? 0 : entry.bytes), 0);
}

/** How a group reads while Mint works on it and after. */
export type RunState = {
  struck?: ReadonlySet<string>;
  gone?: ReadonlySet<string>;
  /** The run's words while it goes on ("Cleaning · 12 of 70"). */
  running?: string;
  /** After the run: what it gave back and how to say it ("freed", "back · nothing deleted"). */
  receipt?: { bytes: number; text: string };
};

const EMPTY_LABELS: Record<BucketKey, string> = {
  optimizable: "No identical copies to share right now",
  safeToClean: "Nothing your apps make again right now",
  yours: "Nothing of yours to choose right now",
  look: "Nothing that needs a look right now",
};

export function bucketPicture(bucket: Bucket, all: Bucket[], appearance: Appearance, state: RunState = {}): string {
  const struck = state.struck ?? new Set<string>();
  const gone = state.gone ?? new Set<string>();
  const listed = bucket.entries.filter((entry) => !isDone(entry.ids, gone));
  const left = listed.filter((entry) => !isDone(entry.ids, struck));
  const remaining = remainingBytes(bucket.entries, struck);
  const shown = listed.slice(0, 10);
  const rows: ListRow[] = shown.map((entry) => ({
    title: entry.title,
    detail: state.receipt && !isDone(entry.ids, struck) ? "kept" : entry.detail,
    value: formatCompact(entry.bytes),
    struck: isDone(entry.ids, struck),
  }));
  const count =
    bucket.key === "optimizable"
      ? `${plural(left.length, "file")} ${left.length === 1 ? "shares its" : "share their"} copies · nothing deleted`
      : bucket.key === "safeToClean"
        ? `${plural(left.length, "item")} your apps make again`
        : `${plural(left.length, "item")} for you to choose`;
  const gonePlural = bucket.key === "optimizable" ? "file" : "item";
  const label = state.running
    ? state.running
    : state.receipt
      ? left.length
        ? `${formatCompact(state.receipt.bytes)} ${state.receipt.text} · ${left.length} kept`
        : `${state.receipt.text} · ${plural(bucket.entries.length, gonePlural)}`
      : bucket.entries.length
        ? count
        : EMPTY_LABELS[bucket.key];
  const value =
    state.receipt && left.length === 0
      ? formatCompact(state.receipt.bytes)
      : bucket.entries.length || state.receipt
        ? formatCompact(remaining)
        : "None";
  const parts = all.map((other) => ({
    bytes: remainingBytes(other.entries, struck),
    lit: other.key === bucket.key,
  }));
  const picture = listSVG({
    appearance,
    value,
    label,
    color: bucket.color,
    rows,
    more:
      listed.length > shown.length
        ? `+${listed.length - shown.length} more · ${bucket.key === "optimizable" || bucket.key === "safeToClean" ? "⌘O" : "↵"}`
        : undefined,
    // An empty group has no part of the whole to light: no bar.
    whole: all.length > 1 && remaining > 0 ? parts : undefined,
  });
  return markdownImage(picture.svg, PANE_WIDTH, picture.height);
}

// ---------------------------------------------------------------------------
// Free Memory: the Memory page's piles.
// ---------------------------------------------------------------------------

export type MemoryItem = {
  id: string;
  name: string;
  bytes: number;
  processCount: number;
  bundleIdentifier?: string | null;
  bundlePath?: string | null;
  agentKind?: string | null;
  selectable: boolean;
  advanced: boolean;
  needsReview: boolean;
  defaultSelected: boolean;
};
export type MemoryScan = {
  sessionID: string;
  detailsUnavailable: boolean;
  usedBytes?: number | null;
  totalBytes?: number | null;
  items: MemoryItem[];
};

export type PileKey = "idle" | "inUse" | "askFirst";
/** An app with the memory it frees, in the same currency as the receipt (attributed, never above used). */
export type MemoryApp = MemoryItem & { size: number };
export type Pile = { key: PileKey; title: string; color: string; apps: MemoryApp[]; bytes: number };

const PILES: Array<{ key: PileKey; title: string; color: string }> = [
  { key: "idle", title: "Idle", color: PILE_COLORS.idle },
  { key: "inUse", title: "In use", color: PILE_COLORS.inUse },
  { key: "askFirst", title: "Ask first", color: PILE_COLORS.keep },
];

/**
 * The apps Mint can quit, in the Memory page's piles: Idle is what Mint ticks
 * by itself; Ask first needs a forced quit or is on the Ignore list. Sizes are
 * attributed over everything running, so they add up to what quitting gives back.
 */
export function pilesOf(scan: MemoryScan | undefined): Pile[] {
  const items = scan?.items ?? [];
  const scale = memoryScale(
    items.map((item) => item.bytes),
    scan?.usedBytes,
  );
  const apps: Record<PileKey, MemoryApp[]> = { idle: [], inUse: [], askFirst: [] };
  for (const item of items) {
    if (!item.selectable) continue;
    const key: PileKey = item.defaultSelected ? "idle" : item.advanced || item.needsReview ? "askFirst" : "inUse";
    apps[key].push({ ...item, size: attributed(item.bytes, scale) });
  }
  return PILES.map((pile) => {
    const rows = apps[pile.key].sort((a, b) => b.size - a.size);
    return { ...pile, apps: rows, bytes: rows.reduce((sum, app) => sum + app.size, 0) };
  }).filter((pile) => pile.apps.length > 0);
}

/** Every pile, empty ones too, once any holds an app: the piles are always there, only what is in them changes. */
export function everyPile(piles: Pile[]): Pile[] {
  if (piles.length === 0) return [];
  return PILES.map((pile) => piles.find((found) => found.key === pile.key) ?? { ...pile, apps: [], bytes: 0 });
}

const EMPTY_PILES: Record<PileKey, string> = {
  idle: "No app is sitting idle right now",
  inUse: "No other app is in use",
  askFirst: "Nothing that needs care to quit",
};

/** A pile's memory among everything in use, then its apps. */
export function pilePicture(
  pile: Pile,
  piles: Pile[],
  used: number,
  appearance: Appearance,
  state: RunState = {},
): string {
  const struck = state.struck ?? new Set<string>();
  const gone = state.gone ?? new Set<string>();
  const listed = pile.apps.filter((app) => !gone.has(app.id));
  const left = listed.filter((app) => !struck.has(app.id));
  const remaining = left.reduce((sum, app) => sum + app.size, 0);
  const shown = listed.slice(0, 10);
  const rows: ListRow[] = shown.map((app) => ({
    title: app.name,
    detail:
      state.receipt && !struck.has(app.id) ? "kept running" : app.agentKind ? `running ${app.agentKind}` : undefined,
    value: formatCompact(app.size),
    struck: struck.has(app.id),
  }));
  const listedBytes = piles.reduce((sum, other) => sum + other.bytes, 0);
  const count = `${plural(left.length, "app")} ${pile.key === "idle" ? "nobody is using" : pile.key === "inUse" ? "you are using" : "to quit with care"}`;
  const picture = listSVG({
    appearance,
    value:
      state.receipt && left.length === 0
        ? formatCompact(state.receipt.bytes)
        : pile.apps.length
          ? formatCompact(remaining)
          : "None",
    label:
      state.running ??
      (state.receipt
        ? left.length
          ? `${formatCompact(state.receipt.bytes)} ${state.receipt.text} · ${left.length} kept running`
          : `${state.receipt.text} · ${plural(pile.apps.length, "app")} quit`
        : pile.apps.length
          ? count
          : EMPTY_PILES[pile.key]),
    color: pile.color,
    rows,
    more:
      listed.length > shown.length
        ? `+${listed.length - shown.length} more · ${pile.key === "idle" ? "⌘O" : "↵"}`
        : undefined,
    whole:
      remaining > 0
        ? [
            ...piles.map((other) => ({
              bytes: other.apps.reduce((sum, app) => sum + (struck.has(app.id) ? 0 : app.size), 0),
              lit: other.key === pile.key,
            })),
            { bytes: Math.max(0, used - listedBytes), lit: false },
          ]
        : undefined,
  });
  return markdownImage(picture.svg, PANE_WIDTH, picture.height);
}

// ---------------------------------------------------------------------------
// Organize a Folder.
// ---------------------------------------------------------------------------

export type Template = "media" | "time" | "source" | "topics";

export const TEMPLATES: Array<{ id: Template; title: string }> = [
  { id: "media", title: "By type" },
  { id: "time", title: "By date" },
  { id: "source", title: "By source" },
  { id: "topics", title: "By topic" },
];

export type Folder = {
  path: string;
  enabled?: boolean;
  organizeTemplate?: Template;
  organizeOnArrival?: boolean;
};

export type SortResult = {
  filesMoved: number;
  filesSkipped?: number;
  alreadyInPlaceCount?: number;
  categoryCounts?: Record<string, number>;
  plannedSamples?: Record<string, string[]>;
  needsReviewPaths?: string[];
  errors?: string[];
  organizeFailures?: Array<{ path?: string; message?: string }>;
  handlingReviewBlockedCount?: number;
};

export function templateTitle(template: Template | undefined): string {
  return TEMPLATES.find((entry) => entry.id === template)?.title ?? "By type";
}

/** Where a folder's loose files go: the count to sort, sorted against in place, then each destination. */
export function destinationsPicture(
  folder: Folder,
  care: string,
  result: SortResult | undefined,
  toSort: number | undefined,
  appearance: Appearance,
  state: RunState = {},
): string {
  const struck = state.struck ?? new Set<string>();
  const gone = state.gone ?? new Set<string>();
  const template = templateTitle(folder.organizeTemplate).toLowerCase();
  const inPlace = result?.alreadyInPlaceCount ?? 0;
  const destinations = Object.entries(result?.categoryCounts ?? {})
    .filter(([category, count]) => count > 0 && !gone.has(category))
    .sort((a, b) => b[1] - a[1]);
  const sorted = Object.entries(result?.categoryCounts ?? {})
    .filter(([category]) => struck.has(category))
    .reduce((sum, [, count]) => sum + count, 0);
  const left = toSort === undefined ? undefined : Math.max(0, toSort - sorted);
  const shown = destinations.slice(0, 10);
  const rows: ListRow[] = shown.map(([category, count]) => ({
    title: category,
    detail: result?.plannedSamples?.[category]?.[0],
    value: plural(count, "file"),
    struck: struck.has(category),
  }));
  const picture = listSVG({
    appearance,
    value: left === undefined ? "…" : left === 0 ? "Tidy" : `${left.toLocaleString("en-US")} to sort`,
    label:
      state.running ??
      state.receipt?.text ??
      `${template} · ${care === "Off" ? "organized when you ask" : care.toLowerCase()}`,
    color: accent(appearance),
    rows,
    more: destinations.length > shown.length ? `+${destinations.length - shown.length} more · ⌘O` : undefined,
    whole:
      result && (left ?? 0) > 0
        ? [
            { bytes: left ?? 0, lit: true },
            { bytes: inPlace, lit: false },
          ]
        : undefined,
  });
  return markdownImage(picture.svg, PANE_WIDTH, picture.height);
}

// ---------------------------------------------------------------------------
// Uninstall App.
// ---------------------------------------------------------------------------

export type Remnant = {
  id: string;
  category: string;
  categoryTitle: string;
  label: string;
  path: string;
  sizeBytes: number;
  sizeHuman?: string;
  boundary: "ordinary" | "needs-review" | "protected";
  requiresAdmin: boolean;
  defaultSelected: boolean;
  selectable: boolean;
};

export type UninstallScan = {
  sessionID: string;
  appName: string;
  appPath: string;
  bundleIdentifier: string;
  itemCount: number;
  totalBytes: number;
  items: Remnant[];
};

/** What ↵ removes: the app and every leftover that is not on the Ignore list. */
export function uninstallPlan(scan: UninstallScan): { items: Remnant[]; bytes: number } {
  const items = scan.items.filter((item) => item.selectable && item.boundary === "ordinary");
  return { items, bytes: items.reduce((sum, item) => sum + Math.max(0, item.sizeBytes), 0) };
}

/** The app first, then what it left, largest first. */
export function orderedRemnants(scan: UninstallScan): Remnant[] {
  return [...scan.items].sort(
    (a, b) => Number(b.category === "app-bundle") - Number(a.category === "app-bundle") || b.sizeBytes - a.sizeBytes,
  );
}

export function appPicture(scan: UninstallScan, appearance: Appearance, state: RunState = {}): string {
  const struck = state.struck ?? new Set<string>();
  const gone = state.gone ?? new Set<string>();
  const plan = uninstallPlan(scan);
  const ordered = orderedRemnants(scan).filter((item) => !gone.has(item.id));
  const shown = ordered.slice(0, 10);
  const rows: ListRow[] = shown.map((item) => ({
    title: item.category === "app-bundle" ? scan.appName : item.label,
    detail:
      item.boundary === "protected" || (state.receipt && !struck.has(item.id))
        ? "kept"
        : item.boundary === "needs-review"
          ? "you choose"
          : item.category === "app-bundle"
            ? "App"
            : item.categoryTitle,
    value: formatCompact(item.sizeBytes),
    struck: struck.has(item.id),
  }));
  const leftovers = plan.items.filter((item) => item.category !== "app-bundle").length;
  const remaining = plan.items.reduce((sum, item) => sum + (struck.has(item.id) ? 0 : Math.max(0, item.sizeBytes)), 0);
  const picture = listSVG({
    appearance,
    value: state.receipt ? formatCompact(state.receipt.bytes) : formatCompact(remaining),
    label:
      state.running ??
      state.receipt?.text ??
      (leftovers
        ? `${scan.appName} and ${plural(leftovers, "leftover")} · to the Trash`
        : `${scan.appName} · to the Trash`),
    color: TIER_COLORS.yours,
    rows,
    more: ordered.length > shown.length ? `+${ordered.length - shown.length} more · ⌘O` : undefined,
  });
  return markdownImage(picture.svg, PANE_WIDTH, picture.height);
}

// ---------------------------------------------------------------------------
// Undo Mint Action.
// ---------------------------------------------------------------------------

export type UndoBatch = {
  id: string;
  kind: "journal" | "agent-archive";
  timestamp: string;
  trigger: string;
  folderPath: string;
  operationCount: number;
  totalBytes: number;
  fileNames: string[];
  /** Mint 1.0.81: the largest ten and the folder each went to. */
  files?: Array<{ name: string; bytes: number; to?: string | null }>;
};

export type UndoKind = "organize" | "trash" | "uninstall" | "optimize" | "other";

export function undoKind(trigger: string): UndoKind {
  if (trigger === "agent-optimize") return "optimize";
  if (trigger === "uninstall") return "uninstall";
  if (trigger.includes("organize") || trigger === "move") return "organize";
  if (trigger === "declutter" || trigger.includes("cleanup") || trigger.includes("disk") || trigger.includes("trash")) {
    return "trash";
  }
  return "other";
}

export function undoTitle(batch: UndoBatch): string {
  const folder = baseName(batch.folderPath);
  switch (undoKind(batch.trigger)) {
    case "organize":
      return `Organized ${folder}`;
    case "uninstall": {
      const app = batch.fileNames.find((name) => name.endsWith(".app"));
      return app ? `Uninstalled ${app.replace(/\.app$/, "")}` : "Uninstalled an app";
    }
    case "optimize":
      return `Optimized ${batch.fileNames[0] ?? "a conversation"}`;
    case "trash":
      return `Moved ${plural(batch.operationCount, "item")} to the Trash`;
    default:
      return `Changed ${plural(batch.operationCount, "item")} in ${folder}`;
  }
}

/** What Undo puts back: how much, then the largest files and where each went. */
export function undoPicture(batch: UndoBatch, appearance: Appearance): string {
  const kind = undoKind(batch.trigger);
  const files = batch.files ?? batch.fileNames.map((name) => ({ name, bytes: 0, to: undefined }));
  const rows: ListRow[] = files.map((file) => ({
    title: file.name,
    detail: kind === "organize" && file.to ? `→ ${file.to}` : undefined,
    value: file.bytes > 0 ? formatCompact(file.bytes) : "",
  }));
  const value = kind === "organize" ? plural(batch.operationCount, "file") : formatCompact(batch.totalBytes);
  const label =
    kind === "organize"
      ? `go back to ${baseName(batch.folderPath)}`
      : kind === "optimize"
        ? "of screenshots go back into the conversation"
        : `${plural(batch.operationCount, "item")} come back from the Trash`;
  const picture = listSVG({
    appearance,
    value,
    label,
    color: kind === "organize" ? accent(appearance) : kind === "optimize" ? TIER_COLORS.optimizable : TIER_COLORS.yours,
    rows,
    more: batch.operationCount > rows.length && rows.length ? `+${batch.operationCount - rows.length} more` : undefined,
  });
  return markdownImage(picture.svg, PANE_WIDTH, picture.height);
}
