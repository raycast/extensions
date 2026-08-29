/**
 * Shared list of outdated formulae & casks.
 *
 * Used by both the outdated & upgrade commands.
 */

import React from "react";
import { Color, Icon, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { OutdatedCask, OutdatedFormula, OutdatedResults, type UpgradePackageStatus } from "../utils";
import type { PackageState } from "../hooks/useBrewUpgrade";
import { OutdatedActionPanel } from "./actionPanels";
import { OutdatedErrorView } from "./outdatedErrorView";
import { InstallableFilterType, placeholder } from "./filter";
import { UPDATE_AVAILABLE_ICON } from "./packageIcons";

/** Icon for a list item, e.g. an upgrade status indicator. Defaults to `PENDING_ICON`. */
export type OutdatedIcon = (
  outdated: OutdatedCask | OutdatedFormula,
  isCask: boolean,
) => React.ComponentProps<typeof List.Item>["icon"];

/** Called when a package upgrade starts or finishes, e.g. to update its icon. */
export type OutdatedUpgradeCallback = (
  outdated: OutdatedCask | OutdatedFormula,
  isCask: boolean,
  status: UpgradePackageStatus,
) => void;

/** Actions for a list item. Defaults to the standard OutdatedActionPanel. */
export type OutdatedActions = (
  outdated: OutdatedCask | OutdatedFormula,
  isCask: boolean,
) => React.ComponentProps<typeof List.Item>["actions"];

export interface OutdatedListProps {
  outdated?: OutdatedResults;
  isLoading: boolean;
  filterType: InstallableFilterType;
  searchBarAccessory?: React.ComponentProps<typeof List>["searchBarAccessory"];
  navigationTitle?: string;
  /** Overrides the default (filter based) search bar placeholder */
  searchBarPlaceholder?: string;
  icon?: OutdatedIcon;
  actions?: OutdatedActions;
  onUpgrade?: OutdatedUpgradeCallback;
  /** Overrides the default "Upgrade All", e.g. to report progress per package */
  onUpgradeAll?: () => void;
  onAction: () => void;
  /** Failed outdated fetch: shown as a failure view with a Retry action */
  error?: Error;
  onRetry?: () => void;
  /** Actions for the "all up to date" empty state, e.g. a route to Show Installed */
  emptyActions?: React.ComponentProps<typeof List.EmptyView>["actions"];
}

/**
 * Icon for a package which is outdated, but not (yet) upgraded.
 *
 * Shared with Search and Show Installed — every row in this list is an
 * available update, and it used to be drawn with the same green-check glyph
 * that means "upgraded", only greyed out.
 */
export const PENDING_ICON = UPDATE_AVAILABLE_ICON;

/**
 * The list item icon, indicating the upgrade status of a package.
 */
export function statusIcon(state?: PackageState): React.ComponentProps<typeof List.Item>["icon"] {
  if (!state) return { value: PENDING_ICON, tooltip: "Pending" };

  switch (state.status) {
    case "upgrading":
      return { value: { source: Icon.ArrowDownCircle, tintColor: Color.Blue }, tooltip: "Upgrading…" };
    case "upgraded":
      return { value: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Upgraded" };
    case "failed":
      return { value: { source: Icon.XMarkCircle, tintColor: Color.Red }, tooltip: state.message ?? "Upgrade failed" };
    case "skipped":
      return {
        value: { source: Icon.MinusCircle, tintColor: Color.SecondaryText },
        tooltip: state.message ?? "Skipped",
      };
  }
}

export function OutdatedList(props: OutdatedListProps) {
  const allFormulae = props.filterType != InstallableFilterType.casks ? (props.outdated?.formulae ?? []) : [];
  const casks = props.filterType != InstallableFilterType.formulae ? (props.outdated?.casks ?? []) : [];

  // Pinned formulae are separated out the way Show Installed separates them.
  // Here it also carries meaning: a pinned formula is one `brew upgrade` will
  // refuse and Upgrade All skips, so keeping it out of the actionable list says
  // that without needing the row to explain itself.
  const formulae = allFormulae.filter((formula) => !formula.pinned);
  const pinnedFormulae = allFormulae.filter((formula) => formula.pinned);
  const hasResults = allFormulae.length > 0 || casks.length > 0;

  // Determine search bar placeholder based on loading state
  const searchBarPlaceholder =
    props.searchBarPlaceholder ?? (props.isLoading ? "Checking for outdated packages…" : placeholder(props.filterType));

  return (
    <List
      navigationTitle={props.navigationTitle}
      searchBarPlaceholder={searchBarPlaceholder}
      searchBarAccessory={props.searchBarAccessory}
      isLoading={props.isLoading}
    >
      {/* Failed fetch, with nothing cached to show instead */}
      {props.error && props.onRetry && !props.isLoading && !hasResults && (
        <OutdatedErrorView error={props.error} onRetry={props.onRetry} />
      )}

      {/* Loading state */}
      {props.isLoading && !props.outdated && (
        <List.EmptyView
          icon={getProgressIcon(0.5)}
          title="Checking for upgrades…"
          description="Running brew outdated"
        />
      )}

      {/* Empty state when no outdated packages */}
      {!props.isLoading && !props.error && !hasResults && props.outdated !== undefined && (
        <List.EmptyView
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          title="All your packages are up to date"
          actions={props.emptyActions}
        />
      )}

      {/* Results */}
      {hasResults && (
        <>
          <List.Section title="Formulae">
            {formulae.map((formula) => (
              <OutdatedFormulaeListItem
                key={formula.name}
                outdated={formula}
                icon={props.icon}
                actions={props.actions}
                onUpgrade={props.onUpgrade}
                onUpgradeAll={props.onUpgradeAll}
                onAction={props.onAction}
              />
            ))}
          </List.Section>
          <List.Section title="Casks">
            {casks.map((cask) => (
              <OutdatedCaskListItem
                key={cask.name}
                outdated={cask}
                icon={props.icon}
                actions={props.actions}
                onUpgrade={props.onUpgrade}
                onUpgradeAll={props.onUpgradeAll}
                onAction={props.onAction}
              />
            ))}
          </List.Section>
          {pinnedFormulae.length > 0 && (
            <List.Section title="Pinned Formulae" subtitle={`${pinnedFormulae.length}`}>
              {pinnedFormulae.map((formula) => (
                <OutdatedFormulaeListItem
                  key={formula.name}
                  outdated={formula}
                  icon={props.icon}
                  actions={props.actions}
                  onUpgrade={props.onUpgrade}
                  onUpgradeAll={props.onUpgradeAll}
                  onAction={props.onAction}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

interface OutdatedListItemProps {
  icon?: OutdatedIcon;
  actions?: OutdatedActions;
  onUpgrade?: OutdatedUpgradeCallback;
  onUpgradeAll?: () => void;
  onAction: () => void;
}

function OutdatedCaskListItem(props: OutdatedListItemProps & { outdated: OutdatedCask }) {
  const outdated = props.outdated;
  let version = "";
  if (outdated.installed_versions.length > 0) {
    version = `${outdated.installed_versions[0]} -> ${outdated.current_version}`;
  }

  return (
    <List.Item
      id={outdated.name}
      title={outdated.name}
      accessories={[{ text: version }]}
      icon={props.icon?.(outdated, true) ?? PENDING_ICON}
      actions={
        props.actions?.(outdated, true) ?? (
          <OutdatedActionPanel
            outdated={outdated}
            onUpgrade={(status) => props.onUpgrade?.(outdated, true, status)}
            onUpgradeAll={props.onUpgradeAll}
            onAction={props.onAction}
          />
        )
      }
    />
  );
}

function OutdatedFormulaeListItem(props: OutdatedListItemProps & { outdated: OutdatedFormula }) {
  const outdated = props.outdated;
  let version = "";
  if (outdated.installed_versions.length > 0) {
    version = `${outdated.installed_versions[0]} -> ${outdated.current_version}`;
  }

  return (
    <List.Item
      id={outdated.name}
      title={outdated.name}
      accessories={[
        // The tack sits with the version rather than as a subtitle: it is a
        // property of the row, not a second name for the package.
        ...(outdated.pinned ? [{ icon: Icon.Tack, tooltip: "Pinned" }] : []),
        { text: version },
      ]}
      icon={props.icon?.(outdated, false) ?? PENDING_ICON}
      actions={
        props.actions?.(outdated, false) ?? (
          <OutdatedActionPanel
            outdated={outdated}
            onUpgrade={(status) => props.onUpgrade?.(outdated, false, status)}
            onUpgradeAll={props.onUpgradeAll}
            onAction={props.onAction}
          />
        )
      }
    />
  );
}
