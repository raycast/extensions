import { ReactElement } from "react";

import { Color, Icon, List } from "@raycast/api";
import { useState } from "react";
import { OutdatedCask, OutdatedFormula, OutdatedResults } from "./utils/brew";
import { OutdatedActionPanel } from "./components/actionPanels";
import { InstallableFilterDropdown, InstallableFilterType, placeholder } from "./components/filter";
import { useBrewOutdated } from "./hooks/useBrewOutdated";

export default function Main() {
  const [filter, setFilter] = useState(InstallableFilterType.all);
  const { isLoading, data, revalidate, isRefreshing } = useBrewOutdated();

  return (
    <OutdatedList
      outdated={data}
      isLoading={isLoading}
      isRefreshing={isRefreshing}
      filterType={filter}
      searchBarAccessory={<InstallableFilterDropdown onSelect={setFilter} />}
      onAction={() => revalidate()}
    />
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
  isRefreshing?: boolean;
  searchBarAccessory?: ReactElement<List.Dropdown.Props, string>;
  filterType: InstallableFilterType;
  onAction: () => void;
}

function OutdatedList(props: OutdatedListProps) {
  const formulae = props.filterType != InstallableFilterType.casks ? (props.outdated?.formulae ?? []) : [];
  const casks = props.filterType != InstallableFilterType.formulae ? (props.outdated?.casks ?? []) : [];

  // Show loading indicator if either initial load or background refresh
  const showLoading = props.isLoading || props.isRefreshing;
  const hasResults = formulae.length > 0 || casks.length > 0;

  return (
    <List
      searchBarPlaceholder={placeholder(props.filterType)}
      searchBarAccessory={props.searchBarAccessory}
      isLoading={showLoading}
    >
      {!showLoading && !hasResults && (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="All Packages Up to Date"
          description="No outdated formulae or casks found"
        />
      )}
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
