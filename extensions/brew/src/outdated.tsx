import { Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { OutdatedCask, OutdatedFormula, OutdatedResults, brewFetchOutdated } from "./brew";
import { OutdatedActionPanel } from "./components/actionPanels";
import { InstallableFilterDropdown, InstallableFilterType, placeholder } from "./components/filter";
import { preferences } from "./preferences";

export default function Main(): JSX.Element {
  const [filter, setFilter] = useState(InstallableFilterType.all);
  const { isLoading, data, revalidate } = useCachedPromise(() => brewFetchOutdated(preferences.greedyUpgrades));

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
  searchBarAccessory?: JSX.Element;
  filterType: InstallableFilterType;
  onAction: () => void;
}

function OutdatedList(props: OutdatedListProps) {
  const formulae = props.filterType != InstallableFilterType.casks ? (props.outdated?.formulae ?? []) : [];
  const casks = props.filterType != InstallableFilterType.formulae ? (props.outdated?.casks ?? []) : [];

  return (
    <List
      searchBarPlaceholder={placeholder(props.filterType)}
      searchBarAccessory={props.searchBarAccessory}
      isLoading={props.isLoading}
    >
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
    </List>
  );
}
