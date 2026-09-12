/**
 * Pure selection logic for the selective upgrade review.
 *
 * This module is deliberately free of I/O and Raycast imports so it can be
 * tested in isolation and reused by other surfaces.
 *
 * Concepts:
 * - Selection identity is a composite of package kind and name. A formula and
 *   a cask can share a name, so selection keyed on name alone would conflate
 *   them.
 * - The default selection is everything not currently pinned — exactly the set
 *   a plain `brew upgrade` would operate on.
 * - A pin is a lock, matching brew's own semantics (`brew upgrade` refuses a
 *   pinned formula). A pinned package is never selected; to upgrade it, the
 *   user unpins it, which selects it. Selecting and pinning are mutually
 *   exclusive states. The pin-aware functions (defaultSelectionState,
 *   mergeSelectionState, applyPinChange, setAllSelection via `locked`)
 *   enforce that invariant; toggleSelection is pin-blind by design and relies
 *   on callers never offering a toggle on a pinned row — the run skips pinned
 *   formulae regardless, so a violation cannot reach brew.
 * - The run upgrades each package individually by name, so honouring a
 *   selection means nothing more than filtering the run's package list
 *   (selectedPackages). Deselected packages are simply not upgraded — no
 *   state anywhere is touched on their behalf.
 */

/// Types

/** Kind of a Homebrew package. */
export type PackageKind = "formula" | "cask";

/** The minimal shape the selection logic needs to know about a package. */
export interface SelectablePackage {
  kind: PackageKind;
  name: string;
  /**
   * Pin state as reported by `brew outdated --json=v2`.
   * `undefined` means unknown (older Homebrew may not report pin state);
   * unknown is treated as unpinned for selection purposes, matching what a
   * plain `brew upgrade` would do.
   */
  pinned?: boolean;
}

/**
 * Selection state keyed by composite selection key.
 * `true` = included in the upgrade, `false` = excluded.
 */
export type SelectionState = ReadonlyMap<string, boolean>;

/// Selection identity

/**
 * Build the composite selection key for a package.
 */
export function selectionKey(kind: PackageKind, name: string): string {
  return `${kind}:${name}`;
}

/// Selection state

/**
 * Build the default selection: everything not currently pinned is selected —
 * exactly what a plain `brew upgrade` would do.
 */
export function defaultSelectionState(packages: readonly SelectablePackage[]): Map<string, boolean> {
  const state = new Map<string, boolean>();
  for (const pkg of packages) {
    state.set(selectionKey(pkg.kind, pkg.name), pkg.pinned !== true);
  }
  return state;
}

/**
 * Merge an existing selection with a freshly fetched package list.
 *
 * Packages the user has already decided on keep their decision; packages that
 * are new since the last fetch get the default (selected unless pinned);
 * packages that are no longer outdated are dropped. A package that is pinned
 * in the fresh data is always deselected, regardless of any prior decision —
 * the pin is a lock, and a pin applied outside the review (e.g. in a
 * terminal) must win over a stale selection.
 *
 * Known asymmetry: a pin-forced `false` is indistinguishable from a manual
 * deselection, so a package pinned and later unpinned outside the review
 * stays deselected after both refreshes. That errs toward holding back — the
 * row is visibly deselected and one ↩ re-selects it.
 */
export function mergeSelectionState(
  previous: SelectionState,
  packages: readonly SelectablePackage[],
): Map<string, boolean> {
  const state = new Map<string, boolean>();
  for (const pkg of packages) {
    const key = selectionKey(pkg.kind, pkg.name);
    if (pkg.pinned === true) {
      state.set(key, false);
      continue;
    }
    const prior = previous.get(key);
    state.set(key, prior !== undefined ? prior : true);
  }
  return state;
}

/**
 * Toggle a single package's selection. Returns a new map; unknown keys are
 * ignored.
 */
export function toggleSelection(state: SelectionState, key: string): Map<string, boolean> {
  const next = new Map(state);
  const current = next.get(key);
  if (current !== undefined) {
    next.set(key, !current);
  }
  return next;
}

/**
 * Reconcile a package's selection after its pin state changes: pinning
 * deselects it, unpinning selects it — deliberately overwriting any earlier
 * manual toggle, because the pin action expresses fresh intent (Unpin and
 * Select is one gesture). Returns a new map; unknown keys are ignored.
 */
export function applyPinChange(state: SelectionState, key: string, pinned: boolean): Map<string, boolean> {
  const next = new Map(state);
  if (next.has(key)) {
    next.set(key, !pinned);
  }
  return next;
}

/**
 * Overlay locally made pin changes onto a fetched package list.
 *
 * A pin change made in the review reaches brew immediately, but a fetch that
 * was already in flight can deliver a snapshot taken before the change; its
 * stale pin state would defeat the user's fresh intent (mergeSelectionState
 * deselects whatever the snapshot says is pinned, so an Unpin and Select
 * followed quickly by another lost its selection to the first unpin's
 * refresh). Overrides are keyed by selection key and win over the fetched
 * value until retired (see confirmedPinOverrides).
 */
export function applyPinOverrides(
  packages: readonly SelectablePackage[],
  overrides: ReadonlyMap<string, boolean>,
): SelectablePackage[] {
  if (overrides.size === 0) return [...packages];
  return packages.map((pkg) => {
    const override = overrides.get(selectionKey(pkg.kind, pkg.name));
    return override === undefined ? pkg : { ...pkg, pinned: override };
  });
}

/**
 * The overrides a fetched package list retires: the fetched pin state agrees
 * with the local change (brew has caught up), or the package is no longer in
 * the list at all (nothing left to override — and a stale override must not
 * ambush the package if it becomes outdated again later). Retiring on
 * agreement rather than on any fetch is what lets an override survive the
 * stale in-flight snapshot it exists to defeat.
 */
export function confirmedPinOverrides(
  packages: readonly SelectablePackage[],
  overrides: ReadonlyMap<string, boolean>,
): string[] {
  const fetchedPinned = new Map<string, boolean>();
  for (const pkg of packages) {
    fetchedPinned.set(selectionKey(pkg.kind, pkg.name), pkg.pinned === true);
  }
  const confirmed: string[] = [];
  for (const [key, override] of overrides) {
    const fetched = fetchedPinned.get(key);
    if (fetched === undefined || fetched === override) {
      confirmed.push(key);
    }
  }
  return confirmed;
}

/**
 * Set every package in the state to the given selected value. Keys in
 * `locked` (pinned packages) are never selected — a pin is a lock, so
 * Select All means "select everything upgradable".
 */
export function setAllSelection(
  state: SelectionState,
  selected: boolean,
  locked: ReadonlySet<string> = new Set(),
): Map<string, boolean> {
  const next = new Map<string, boolean>();
  for (const key of state.keys()) {
    next.set(key, selected && !locked.has(key));
  }
  return next;
}

/**
 * The set of selected keys in a selection state.
 */
export function selectedKeys(state: SelectionState): Set<string> {
  const keys = new Set<string>();
  for (const [key, selected] of state) {
    if (selected) {
      keys.add(key);
    }
  }
  return keys;
}

/**
 * The packages a run should include for the given selection: exactly those
 * with an explicit `true` in the state. A package absent from the state is
 * treated as deselected — an incomplete state fails toward holding packages
 * back rather than upgrading something the user never confirmed.
 */
export function selectedPackages(packages: readonly SelectablePackage[], state: SelectionState): SelectablePackage[] {
  return packages.filter((pkg) => state.get(selectionKey(pkg.kind, pkg.name)) === true);
}

/**
 * Restrict a run's package list to the reviewed selection — the enforcement
 * point that keeps a deselected package out of the run. The run resolves its
 * own outdated list after its own `brew update` and keeps the intersection:
 * a selected package no longer outdated is dropped, one that became outdated
 * during the update is not upgraded unreviewed. Generic over the engine's
 * package shape (`name` + `isCask`) so the engine needs no import from here
 * beyond this function.
 */
export function restrictToSelection<T extends { name: string; isCask: boolean }>(
  packages: readonly T[],
  selection: readonly { name: string; isCask: boolean }[],
): T[] {
  const key = (pkg: { name: string; isCask: boolean }) => selectionKey(pkg.isCask ? "cask" : "formula", pkg.name);
  const included = new Set(selection.map(key));
  return packages.filter((pkg) => included.has(key(pkg)));
}
