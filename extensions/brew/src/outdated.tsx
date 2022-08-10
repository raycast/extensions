import { Color, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast } from "./utils";
import { OutdatedResults, OutdatedCask, OutdatedFormula, brewFetchOutdated } from "./brew";
import { OutdatedActionPanel } from "./components/actionPanels";
import { InstallableFilterDropdown, InstallableFilterType } from "./components/filter";
import { preferences } from "./preferences";

interface State {
  outdated?: OutdatedResults;
  isLoading: boolean;
  filter: InstallableFilterType;
}

export default function Main(): JSX.Element {
  const [state, setState] = useState<State>({ isLoading: true, filter: InstallableFilterType.all });

  useEffect(() => {
    if (!state.isLoading) {
      return;
    }
    brewFetchOutdated(preferences.greedyUpgrades)
      .then((outdated) => {
        setState((oldState) => ({ ...oldState, outdated: outdated, isLoading: false }));
      })
      .catch((err) => {
        showFailureToast("Brew outdated failed", err);
        setState({ isLoading: false, filter: InstallableFilterType.all });
      });
  }, [state]);

  return (
    <OutdatedList
      outdated={state.outdated}
      isLoading={state.isLoading}
      filterType={state.filter}
      searchBarAccessory={
        <InstallableFilterDropdown
          onSelect={(filterType) => {
            setState((oldState) => ({ ...oldState, filter: filterType }));
          }}
        />
      }
      onAction={() => {
        setState((oldState) => ({ ...oldState, isLoading: true }));
      }}
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
      accessoryTitle={version}
      icon={{ source: Icon.Checkmark, tintColor: Color.Red }}
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
      accessoryTitle={version}
      icon={{ source: Icon.Checkmark, tintColor: Color.Red }}
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
  const formulae = props.filterType != InstallableFilterType.casks ? props.outdated?.formulae ?? [] : [];
  const casks = props.filterType != InstallableFilterType.formulae ? props.outdated?.casks ?? [] : [];

  return (
    <List
      searchBarPlaceholder={"Filter formulae by name" + String.ellipsis}
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
