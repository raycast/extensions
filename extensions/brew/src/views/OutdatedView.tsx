/**
 * Outdated view for displaying outdated brew packages.
 */

import React from "react";
import { Color, Icon, List } from "@raycast/api";
import { useState } from "react";
import { getProgressIcon } from "@raycast/utils";
import { OutdatedCask, OutdatedFormula, OutdatedResults } from "../utils";
import { useBrewOutdated } from "../hooks/useBrewOutdated";
import { OutdatedActionPanel } from "../components/actionPanels";
import { InstallableFilterDropdown, InstallableFilterType, placeholder } from "../components/filter";
import { ErrorBoundary } from "../components/ErrorBoundary";

function OutdatedViewContent() {
  const [filter, setFilter] = useState(InstallableFilterType.all);
  const { isLoading, data, revalidate } = useBrewOutdated();

  return (
    <OutdatedList
      outdated={data}
      isLoading={isLoading}
      filterType={filter}
      searchBarAccessory={<InstallableFilterDropdown onSelect={setFilter} />}
      onAction={() => revalidate()}
    />
  );
}

export default function OutdatedView() {
  return (
    <ErrorBoundary>
      <OutdatedViewContent />
    </ErrorBoundary>
  );
}

function OutdatedCaskListItem(props: { outdated: OutdatedCask; onAction: () => void }) {
  const outdated = props.outdated;
  const version = `${outdated.installed_versions} -> ${outdated.current_version}`;

  return (
    <List.Item
      id={outdated.name}
      title={outdated.name}
      accessories={[{ text: version }]}
      icon={{ source: Icon.CheckCircle, tintColor: Color.Red }}
      actions={<OutdatedActionPanel outdated={outdated} onAction={props.onAction} />}
    />
  );
}

function OutdatedFormulaeListItem(props: { outdated: OutdatedFormula; onAction: () => void }) {
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
      icon={{ source: Icon.CheckCircle, tintColor: Color.Red }}
      actions={<OutdatedActionPanel outdated={outdated} onAction={props.onAction} />}
    />
  );
}

interface OutdatedListProps {
  outdated?: OutdatedResults;
  isLoading: boolean;
  searchBarAccessory?: React.ComponentProps<typeof List>["searchBarAccessory"];
  filterType: InstallableFilterType;
  onAction: () => void;
}

function OutdatedList(props: OutdatedListProps) {
  const formulae = props.filterType != InstallableFilterType.casks ? (props.outdated?.formulae ?? []) : [];
  const casks = props.filterType != InstallableFilterType.formulae ? (props.outdated?.casks ?? []) : [];
  const hasResults = formulae.length > 0 || casks.length > 0;

  // Determine empty state message based on filter
  const getEmptyMessage = () => {
    switch (props.filterType) {
      case InstallableFilterType.formulae:
        return "No formulae are outdated";
      case InstallableFilterType.casks:
        return "No casks are outdated";
      default:
        return "No casks or formulae are outdated";
    }
  };

  return (
    <List
      searchBarPlaceholder={placeholder(props.filterType)}
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
      {!props.isLoading && !hasResults && (
        <List.EmptyView
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          title={getEmptyMessage()}
          description="All your packages are up to date"
        />
      )}

      {/* Results */}
      {hasResults && (
        <>
          <List.Section title="Formulae">
            {formulae.map((formula) => (
              <OutdatedFormulaeListItem key={formula.name} outdated={formula} onAction={props.onAction} />
            ))}
          </List.Section>
          <List.Section title="Casks">
            {casks.map((cask) => (
              <OutdatedCaskListItem key={cask.name} outdated={cask} onAction={props.onAction} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
