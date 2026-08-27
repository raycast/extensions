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
import { InstallableFilterType, placeholder } from "./filter";

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
}

/** Icon for a package which is outdated, but not (yet) upgraded. */
export const PENDING_ICON = { source: Icon.CheckCircle, tintColor: Color.SecondaryText };

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
  const formulae = props.filterType != InstallableFilterType.casks ? (props.outdated?.formulae ?? []) : [];
  const casks = props.filterType != InstallableFilterType.formulae ? (props.outdated?.casks ?? []) : [];
  const hasResults = formulae.length > 0 || casks.length > 0;

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
      {/* Loading state */}
      {props.isLoading && !props.outdated && (
        <List.EmptyView
          icon={getProgressIcon(0.5)}
          title="Checking for outdated packages..."
          description="Running brew outdated"
        />
      )}

      {/* Empty state when no outdated packages */}
      {!props.isLoading && !hasResults && props.outdated !== undefined && (
        <List.EmptyView
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          title="All your packages are up to date"
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
  const version = `${outdated.installed_versions} -> ${outdated.current_version}`;

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
      subtitle={outdated.pinned ? "Pinned" : ""}
      accessories={[{ text: version }]}
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
