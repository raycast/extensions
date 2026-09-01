/**
 * Show Upgrades: review the outdated packages, choose which to include, and
 * run the upgrade.
 *
 * The list opens with everything not pinned selected — exactly what a plain
 * `brew upgrade` would do — so running immediately is equivalent to Upgrade
 * All. A pin is a lock, matching brew's own behaviour: pinned formulae cannot
 * be selected, and upgrading one means unpinning it first, which selects it.
 * Casks carry no pin state before Homebrew 6, so every cask is simply
 * selectable.
 * Upgrades are reported via the toast/HUD, with the icon of each item
 * reflecting its selection and upgrade status.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Action, ActionPanel, Color, Icon, Keyboard, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import {
  upgradeKey,
  type OutdatedCask,
  type OutdatedFormula,
  type UpgradePackage,
  type UpgradePackageStatus,
} from "./utils";
import {
  applyPinChange,
  applyPinOverrides,
  confirmedPinOverrides,
  mergeSelectionState,
  selectedKeys,
  selectedPackages,
  selectionKey,
  setAllSelection,
  toggleSelection,
  type SelectablePackage,
  type SelectionState,
} from "./utils/upgrade-selection";
import { useBrewOutdated } from "./hooks/useBrewOutdated";
import { useBrewUpgrade } from "./hooks/useBrewUpgrade";
import { InstallableFilterDropdown, InstallableFilterType } from "./components/filter";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { OutdatedActionSections, UpgradingActionPanel } from "./components/actionPanels";
import { pin, unpin } from "./components/actions";
import { OutdatedList, statusIcon } from "./components/outdatedList";

// Blue, not green: green CheckCircle is the engine's "upgraded" outcome icon,
// and a selection that shares it makes the post-run list (kept open unless
// the closeAfterAction preference is set) unreadable — "chosen for the next
// run" and "done in the last run" must not look identical.
const INCLUDED_ICON = { source: Icon.CheckCircle, tintColor: Color.Blue };
const EXCLUDED_ICON = { source: Icon.Circle, tintColor: Color.SecondaryText };
const PINNED_ICON = { source: Icon.Tack, tintColor: Color.SecondaryText };

function ShowUpgradesContent() {
  const [filter, setFilter] = useState(InstallableFilterType.all);
  const { isLoading, isRefreshing, data, error, revalidate, cancelRefresh } = useBrewOutdated();
  const upgrade = useBrewUpgrade();

  // The user's last full selection map; the review selection shown is this
  // merged with the freshest package list (new packages get the default,
  // vanished ones are dropped, pinned ones are forced out).
  const [selection, setSelection] = useState<SelectionState>(new Map());
  // Locally made pin changes that must win over a stale in-flight fetch
  // until brew's own data catches up.
  const [pinOverrides, setPinOverrides] = useState<ReadonlyMap<string, boolean>>(new Map());

  // During a run the review deliberately stays on the pre-run data: a
  // package the run's update discovered was not reviewed and must read "Not
  // in this upgrade" rather than selected. After the run the review follows
  // the re-fetch below and settles to post-run reality, falling back to the
  // run's own snapshot only until data exists.
  const reviewSource = upgrade.isUpgrading ? data : (data ?? upgrade.outdated);

  // After a run, re-fetch so the review reflects what is outdated now:
  // upgraded packages drop off (the toast reports the count), failures stay
  // visible with their status, and a completed review is never backed by the
  // snapshot taken before the upgrades. The run already did its own brew
  // update, so this fetch is cheap and current.
  const wasUpgradingRef = useRef(false);
  useEffect(() => {
    if (upgrade.isUpgrading) {
      wasUpgradingRef.current = true;
      return;
    }
    if (wasUpgradingRef.current) {
      wasUpgradingRef.current = false;
      revalidate();
    }
  }, [upgrade.isUpgrading, revalidate]);

  const reviewPackages = useMemo<SelectablePackage[]>(() => {
    const fetched: SelectablePackage[] = [
      ...(reviewSource?.formulae ?? []).map((f) => ({ kind: "formula" as const, name: f.name, pinned: f.pinned })),
      // Casks carry no pin state before Homebrew 6 — plainly selectable
      ...(reviewSource?.casks ?? []).map((c) => ({ kind: "cask" as const, name: c.name })),
    ];
    return applyPinOverrides(fetched, pinOverrides);
  }, [reviewSource, pinOverrides]);

  // Retire overrides once a fetch agrees with them (or their package left)
  useEffect(() => {
    if (!data) return;
    setPinOverrides((previous) => {
      if (previous.size === 0) return previous;
      const fetched = data.formulae.map((f) => ({ kind: "formula" as const, name: f.name, pinned: f.pinned }));
      const retired = confirmedPinOverrides(fetched, previous);
      if (retired.length === 0) return previous;
      const next = new Map(previous);
      for (const key of retired) next.delete(key);
      return next;
    });
  }, [data]);

  const reviewSelection = useMemo(() => mergeSelectionState(selection, reviewPackages), [selection, reviewPackages]);

  const lockedKeys = useMemo(
    () => new Set(reviewPackages.filter((p) => p.pinned === true).map((p) => selectionKey(p.kind, p.name))),
    [reviewPackages],
  );
  const selectedCount = selectedKeys(reviewSelection).size;
  const upgradableCount = reviewPackages.length - lockedKeys.size;
  const allSelected = selectedCount === upgradableCount && upgradableCount > 0;
  const runTitle = selectedCount === upgradableCount ? "Upgrade All" : `Upgrade ${selectedCount} Selected`;

  const handleAction = useCallback(() => {
    // Show the refreshed results, rather than those fetched by the upgrade
    upgrade.reset();
    revalidate();
  }, [upgrade, revalidate]);

  const startUpgrade = useCallback(async () => {
    if (upgrade.isUpgrading) return;
    // A package the last run already upgraded stays visible with its status,
    // but launching another run for it would only no-op after a pointless
    // brew update — the engine's own reconciliation would drop it anyway.
    const packages: UpgradePackage[] = selectedPackages(reviewPackages, reviewSelection)
      .map((p) => ({ name: p.name, isCask: p.kind === "cask" }))
      .filter((pkg) => upgrade.states.get(upgradeKey(pkg))?.status !== "upgraded");
    if (packages.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing Selected",
        message: "Select at least one package to upgrade",
      });
      return;
    }
    // The run issues its own `brew update`, and Homebrew refuses concurrent
    // updates — abort the hook's background refresh and wait for its process
    // to release the update lock before the run starts.
    await cancelRefresh();
    if (upgrade.states.size > 0) upgrade.reset();
    upgrade.upgradeAll(packages);
  }, [upgrade, cancelRefresh, reviewPackages, reviewSelection]);

  const toggle = useCallback((key: string) => setSelection(toggleSelection(reviewSelection, key)), [reviewSelection]);

  const toggleAll = useCallback(
    () => setSelection(setAllSelection(reviewSelection, !allSelected, lockedKeys)),
    [reviewSelection, allSelected, lockedKeys],
  );

  const handlePinChange = useCallback(
    async (formula: OutdatedFormula, pinned: boolean) => {
      const ok = pinned ? await pin(formula) : await unpin(formula);
      if (!ok) return;
      const key = selectionKey("formula", formula.name);
      setPinOverrides((previous) => new Map(previous).set(key, pinned));
      setSelection(applyPinChange(reviewSelection, key, pinned));
      revalidate();
    },
    [reviewSelection, revalidate],
  );

  const icon = useCallback(
    (item: OutdatedCask | OutdatedFormula, isCask: boolean) => {
      const state = upgrade.states.get(upgradeKey({ name: item.name, isCask }));
      if (state) return statusIcon(state);
      const key = selectionKey(isCask ? "cask" : "formula", item.name);
      if (!isCask) {
        const pinned = pinOverrides.get(key) ?? (item as OutdatedFormula).pinned;
        if (pinned) return { value: PINNED_ICON, tooltip: "Pinned — unpin to include" };
      }
      if (reviewSelection.get(key) !== true) {
        return { value: EXCLUDED_ICON, tooltip: upgrade.isUpgrading ? "Not in this upgrade" : "Excluded from upgrade" };
      }
      return upgrade.isUpgrading ? statusIcon(undefined) : { value: INCLUDED_ICON, tooltip: "Included in upgrade" };
    },
    [upgrade.states, upgrade.isUpgrading, pinOverrides, reviewSelection],
  );

  const actions = useCallback(
    (item: OutdatedCask | OutdatedFormula, isCask: boolean) => {
      if (upgrade.isUpgrading) {
        return <UpgradingActionPanel outdated={item} onCancel={upgrade.cancel} />;
      }
      const key = selectionKey(isCask ? "cask" : "formula", item.name);
      return (
        <ReviewActionPanel
          outdated={item}
          isCask={isCask}
          pinned={!isCask && (pinOverrides.get(key) ?? (item as OutdatedFormula).pinned) === true}
          included={reviewSelection.get(key) === true}
          runTitle={selectedCount > 0 ? runTitle : undefined}
          allSelected={allSelected}
          onToggle={() => toggle(key)}
          onToggleAll={toggleAll}
          onStart={startUpgrade}
          onPinChange={(pinned) => handlePinChange(item as OutdatedFormula, pinned)}
          onUpgrade={(status) => upgrade.setPackageState({ name: item.name, isCask }, { status })}
          onAction={handleAction}
        />
      );
    },
    [
      upgrade,
      pinOverrides,
      reviewSelection,
      runTitle,
      selectedCount,
      allSelected,
      toggle,
      toggleAll,
      startUpgrade,
      handlePinChange,
      handleAction,
    ],
  );

  return (
    <OutdatedList
      outdated={upgrade.isUpgrading ? (upgrade.outdated ?? data) : (data ?? upgrade.outdated)}
      isLoading={isLoading || isRefreshing || upgrade.isUpgrading}
      filterType={filter}
      searchBarPlaceholder={upgrade.isUpgrading ? "Upgrading…" : undefined}
      searchBarAccessory={<InstallableFilterDropdown onSelect={setFilter} />}
      icon={icon}
      actions={actions}
      onAction={handleAction}
      error={error}
      onRetry={revalidate}
      emptyActions={
        <ActionPanel>
          <Action title="Show Installed Packages" icon={Icon.List} onAction={showInstalled} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={handleAction}
          />
        </ActionPanel>
      }
    />
  );
}

async function showInstalled() {
  try {
    await launchCommand({ name: "installed", type: LaunchType.UserInitiated });
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Could Not Open Show Installed" });
  }
}

function ReviewActionPanel(props: {
  outdated: OutdatedCask | OutdatedFormula;
  isCask: boolean;
  pinned: boolean;
  included: boolean;
  /** Absent when nothing is selected — the run action then gives way to a
      guidance action rather than offering an upgrade of zero packages. */
  runTitle?: string;
  allSelected: boolean;
  onToggle: () => void;
  onToggleAll: () => void;
  onStart: () => void;
  onPinChange: (pinned: boolean) => void;
  onUpgrade: (status: UpgradePackageStatus) => void;
  onAction: (result: boolean) => void;
}) {
  // The second action in the panel is where Raycast binds ⌘↩ — the run
  // action sits there on every row, so it is reachable from anywhere. That
  // binding is positional, so the slot must never fall through to Select All:
  // with nothing selected, a muscle-memory ⌘↩ would silently overwrite the
  // deliberately empty selection, and a second ⌘↩ would launch a full
  // upgrade. A guidance action holds the slot instead — pressing it surfaces
  // the Nothing Selected toast via onStart.
  const runAction = props.runTitle ? (
    <Action title={props.runTitle} icon={Icon.ArrowUpCircle} onAction={props.onStart} />
  ) : (
    <Action title="Select Packages to Upgrade" icon={Icon.CheckCircle} onAction={props.onStart} />
  );
  const toggleAllAction = (
    <Action
      title={props.allSelected ? "Deselect All" : "Select All"}
      icon={props.allSelected ? Icon.Circle : Icon.CheckCircle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      onAction={props.onToggleAll}
    />
  );

  // A pin is a lock: upgrading a pinned formula means unpinning it, which
  // selects it — one gesture.
  if (props.pinned) {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action
            title="Unpin and Select"
            icon={Icon.TackDisabled}
            shortcut={Keyboard.Shortcut.Common.Pin}
            onAction={() => props.onPinChange(false)}
          />
          {runAction}
          {toggleAllAction}
        </ActionPanel.Section>
        <OutdatedActionSections
          outdated={props.outdated}
          onUpgrade={props.onUpgrade}
          onAction={props.onAction}
          omitPin
        />
      </ActionPanel>
    );
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title={props.included ? "Exclude from Upgrade" : "Include in Upgrade"}
          icon={props.included ? Icon.Circle : Icon.CheckCircle}
          onAction={props.onToggle}
        />
        {runAction}
        {toggleAllAction}
        {/* Selection-aware pin: pinning locks the formula out of the run.
            Formulae only — casks cannot be pinned before Homebrew 6. */}
        {!props.isCask && (
          <Action
            title="Pin"
            icon={Icon.Tack}
            shortcut={Keyboard.Shortcut.Common.Pin}
            onAction={() => props.onPinChange(true)}
          />
        )}
      </ActionPanel.Section>
      <OutdatedActionSections outdated={props.outdated} onUpgrade={props.onUpgrade} onAction={props.onAction} omitPin />
    </ActionPanel>
  );
}

export default function Main() {
  return (
    <ErrorBoundary>
      <ShowUpgradesContent />
    </ErrorBoundary>
  );
}
