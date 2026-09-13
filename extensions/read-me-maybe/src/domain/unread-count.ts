import type { StoredSource } from "./source-catalog";

/**
 * A Source's identity: the runtime id of a Source Catalog row. The catalog
 * boundary validates ids; nothing downstream may assume a fixed set of Sources.
 */
export type Source = string;

export type BadgeInterpretation =
  | { kind: "zero"; label: "0"; contribution: 0 }
  | { kind: "numeric"; label: string; contribution: number }
  | { kind: "threshold"; label: string; contribution: number }
  | { kind: "attention"; label: "Unread activity"; contribution: 0 }
  | { kind: "couldNotReadBadge"; label: "Could not read badge" };

export type RawSourceOutcome =
  | { kind: "badge"; badge?: string }
  | { kind: "notAvailable" }
  | { kind: "accessibilityRequired" }
  | { kind: "automationRequired" }
  | { kind: "couldNotReadBadge" };

export type SourceOutcomes = Partial<Record<Source, RawSourceOutcome>>;

export type DockScan =
  | { kind: "success"; outcomes: SourceOutcomes }
  | { kind: "failed" }
  | { kind: "accessibilityRequired" }
  | { kind: "automationRequired" };

export type SetupDiagnostic =
  { kind: "success" } | { kind: "failed" } | { kind: "accessibilityRequired" } | { kind: "automationRequired" };

export type SourceResult = {
  id: Source;
  name: string;
  appPath?: string;
  openCommand: string;
  label: string;
  contribution?: number;
  unavailable: boolean;
};

export type Aggregate =
  | { kind: "complete"; total: number; hasExcludedUnreadActivity?: boolean }
  | { kind: "partial"; total: number; hasExcludedUnreadActivity?: boolean }
  | { kind: "empty" }
  | { kind: "noSources" }
  | { kind: "failed" }
  | { kind: "accessibilityRequired" }
  | { kind: "automationRequired" };

export type UnreadCountResult = { sources: SourceResult[]; aggregate: Aggregate };

export type MenuPresentation = {
  title?: string;
  status?: string;
  lastUpdated?: string;
  showSources: boolean;
  hasExcludedUnreadActivity?: boolean;
};

export function enabledSources(catalogRows: readonly StoredSource[]): StoredSource[] {
  return catalogRows.filter((source) => source.enabled);
}

/**
 * The derived Open Command for an application: `open '<appPath>'`. Single
 * quotes keep app paths with spaces intact; embedded quotes are escaped
 * POSIX-style.
 */
export function openCommandForApp(appPath: string): string {
  return `open '${appPath.replaceAll("'", `'\\''`)}'`;
}

export function openCommandForSource(source: StoredSource): string {
  const override = source.openCommand?.trim();
  if (override) return override;
  if (!source.appPath) return "";
  return openCommandForApp(source.appPath);
}

export function interpretBadge(badge: string | undefined): BadgeInterpretation {
  const value = badge?.trim() ?? "";
  if (value === "") {
    return { kind: "zero", label: "0", contribution: 0 };
  }

  const threshold = /^(\d+)\+$/.exec(value);
  if (threshold) {
    const contribution = parseCount(threshold[1]);
    return contribution === undefined
      ? { kind: "couldNotReadBadge", label: "Could not read badge" }
      : { kind: "threshold", label: value, contribution };
  }

  const numeric = /^(\d+)$/.exec(value);
  if (numeric) {
    const contribution = parseCount(numeric[1]);
    return contribution === undefined
      ? { kind: "couldNotReadBadge", label: "Could not read badge" }
      : { kind: "numeric", label: value, contribution };
  }

  if (value === "•" || value === "·" || value === ".") {
    return { kind: "attention", label: "Unread activity", contribution: 0 };
  }

  return { kind: "couldNotReadBadge", label: "Could not read badge" };
}

export function summarizeDockScan(sources: readonly StoredSource[], scan: DockScan): UnreadCountResult {
  if (sources.length === 0) {
    return { sources: [], aggregate: { kind: "noSources" } };
  }

  if (scan.kind === "failed") {
    return { sources: [], aggregate: { kind: "failed" } };
  }
  if (scan.kind === "accessibilityRequired" || scan.kind === "automationRequired") {
    return {
      sources: sources.map((source) => toSourceResult(source, { kind: scan.kind })),
      aggregate: { kind: scan.kind },
    };
  }

  const results = sources.map((source) => toSourceResult(source, scan.outcomes[source.id]));
  const readable = results.filter((result) => result.contribution !== undefined);
  if (readable.length === 0) {
    return { sources: results, aggregate: { kind: "empty" } };
  }

  // An Attention Badge is always excluded from the numeric total; its label
  // stays in the breakdown and its presence is flagged on the aggregate.
  const hasExcludedUnreadActivity = results.some((result) => result.label === "Unread activity");
  const total = readable.reduce((sum, result) => sum + (result.contribution ?? 0), 0);
  const kind = results.some((result) => result.unavailable) ? "partial" : "complete";
  return {
    sources: results,
    aggregate: { kind, total, ...(hasExcludedUnreadActivity ? { hasExcludedUnreadActivity } : {}) },
  };
}

/**
 * The status line an Aggregate earns, in the menu's wording — undefined for a
 * plain complete result. Shared by the menu presentation and the View Unreads
 * status row so both surfaces never disagree about what a state means.
 */
export function aggregateStatusLabel(aggregate: Aggregate): string | undefined {
  if (aggregate.kind === "noSources") return "No sources enabled";
  if (aggregate.kind === "failed") return "Could not refresh";
  if (aggregate.kind === "accessibilityRequired") return "Accessibility access required";
  if (aggregate.kind === "automationRequired") return "Automation access required";
  if (aggregate.kind === "empty") return "No readable Sources";
  if (aggregate.kind === "partial") return "Partial Result (incomplete)";
  return undefined;
}

export function menuPresentation(result: UnreadCountResult, updatedAt?: Date, now = new Date()): MenuPresentation {
  const { aggregate } = result;
  const status = aggregateStatusLabel(aggregate);
  if (aggregate.kind === "noSources") return { title: "-", status, showSources: false };
  if (aggregate.kind === "failed") return { title: "-", status, showSources: false };
  if (aggregate.kind === "accessibilityRequired") {
    return { title: "-", status, showSources: true };
  }
  if (aggregate.kind === "automationRequired") {
    return { title: "-", status, showSources: true };
  }

  const lastUpdated = `Last Updated: ${relativeFreshness(updatedAt, now)}`;
  if (aggregate.kind === "empty") {
    return { title: "-", status, lastUpdated, showSources: true };
  }

  const title = aggregate.total === 0 ? undefined : aggregate.total > 99 ? "99+" : String(aggregate.total);
  return {
    title,
    ...(status ? { status } : {}),
    lastUpdated,
    showSources: true,
    ...(aggregate.hasExcludedUnreadActivity ? { hasExcludedUnreadActivity: true } : {}),
  };
}

export function transitionSetupGate(currentGate: boolean, sources: Source[], diagnostic: SetupDiagnostic): boolean {
  if (sources.length === 0) {
    return currentGate;
  }
  if (diagnostic.kind === "success") {
    return true;
  }
  if (diagnostic.kind === "accessibilityRequired" || diagnostic.kind === "automationRequired") {
    return false;
  }
  return currentGate;
}

/**
 * The age of a reading in the menu's wording: "just now" is reserved for a
 * reading less than 15 seconds old, "less than a minute ago" bridges to the
 * first whole minute, and older readings count whole minutes. A missing
 * reading time reads as just now — surfaces render their own empty state.
 */
export function relativeFreshness(updatedAt: Date | undefined, now: Date): string {
  if (!updatedAt) return "just now";
  const elapsed = now.getTime() - updatedAt.getTime();
  if (elapsed < 15_000) return "just now";
  if (elapsed < 60_000) return "less than a minute ago";
  return `${Math.floor(elapsed / 60_000)} min ago`;
}

function toSourceResult(source: StoredSource, outcome: RawSourceOutcome | undefined): SourceResult {
  if (!outcome || outcome.kind === "notAvailable") {
    return unavailableSourceResult(source, "Not available");
  }
  if (outcome.kind === "accessibilityRequired") {
    return unavailableSourceResult(source, "Accessibility required");
  }
  if (outcome.kind === "automationRequired") {
    return unavailableSourceResult(source, "Automation required");
  }
  if (outcome.kind === "couldNotReadBadge") {
    return unavailableSourceResult(source, "Could not read badge");
  }

  const badge = interpretBadge(outcome.badge);
  if (badge.kind === "couldNotReadBadge") {
    return unavailableSourceResult(source, badge.label);
  }
  return {
    id: source.id,
    name: source.name,
    ...(source.appPath !== undefined ? { appPath: source.appPath } : {}),
    openCommand: openCommandForSource(source),
    label: badge.label,
    contribution: badge.contribution,
    unavailable: false,
  };
}

function unavailableSourceResult(source: StoredSource, label: string): SourceResult {
  return {
    id: source.id,
    name: source.name,
    ...(source.appPath !== undefined ? { appPath: source.appPath } : {}),
    openCommand: openCommandForSource(source),
    label,
    unavailable: true,
  };
}

function parseCount(value: string): number | undefined {
  const count = Number(value);
  return Number.isSafeInteger(count) ? count : undefined;
}
