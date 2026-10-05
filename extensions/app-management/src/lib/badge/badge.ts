// Copied from badge-count-raycast src/lib/badge.ts on 2026-09-30, unchanged except this header
// Pure badge data types and classification (SPEC.md sections 3 and 5.4).
// No Raycast or Node imports, so the unit tests can load this file directly.

/** One Dock application item as reported by the helper. */
export type DockApp = {
  bundleId: string | null;
  path: string | null;
  title: string | null;
  running: boolean;
  badge: string | null;
};

export type ReadFailure =
  | "permission"
  | "helper-missing"
  | "helper-not-executable"
  | "timeout"
  | "dock-not-running"
  | "dock-unrecognised"
  | "helper-error"
  | "unsupported-architecture";

/** Result of one Dock read. Badge values live only in this in-memory object. */
export type DockRead =
  { ok: true; apps: DockApp[] } | { ok: false; failure: ReadFailure; reason: string; diagnostic: string };

export type BadgeState =
  | { kind: "numeric"; text: string }
  | { kind: "zero"; text: string }
  | { kind: "nonNumeric"; text: string }
  | { kind: "noBadge" };

export type RowState =
  | BadgeState
  | { kind: "loading" }
  | { kind: "notInDock" }
  | { kind: "notInstalled" }
  | { kind: "unavailable"; reason: string; failure: ReadFailure };

/**
 * Classify raw Dock badge text. The text is never parsed into a number for
 * display: "99+" stays "99+", "1,204" stays "1,204".
 */
export function classifyBadge(raw: string | null | undefined): BadgeState {
  if (raw === null || raw === undefined || raw === "") return { kind: "noBadge" };
  if (raw === "0") return { kind: "zero", text: raw };
  if (/^[0-9]+$/.test(raw) && /[1-9]/.test(raw)) return { kind: "numeric", text: raw };
  return { kind: "nonNumeric", text: raw };
}

/** Find the Dock item for a selected app: bundle ID first, then bundle path. */
export function findDockItem(
  app: { bundleId?: string | null; path?: string | null },
  items: DockApp[],
): DockApp | undefined {
  if (app.bundleId) {
    const byId = items.find((item) => item.bundleId === app.bundleId);
    if (byId) return byId;
  }
  if (app.path) return items.find((item) => item.path === app.path);
  return undefined;
}

/**
 * State for one row. A missing bundle is reported as Not installed even when
 * the Dock read failed, because that fact does not depend on the Dock.
 */
export function rowState(
  app: { bundleId?: string | null; path?: string | null },
  installed: boolean,
  read: DockRead | undefined,
): RowState {
  if (!installed) return { kind: "notInstalled" };
  if (!read) return { kind: "loading" };
  if (!read.ok) return { kind: "unavailable", reason: read.reason, failure: read.failure };
  const item = findDockItem(app, read.apps);
  if (!item) return { kind: "notInDock" };
  return classifyBadge(item.badge);
}
