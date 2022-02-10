import { Color, Icon, List, ListSection } from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast } from "./utils";
import { OutdatedResults, OutdatedCask, OutdatedFormula, brewFetchOutdated } from "./brew";
import { OutdatedActionPanel } from "./components/actionPanels";
import { preferences } from "./preferences";

interface State {
  outdated?: OutdatedResults;
  isLoading: boolean;
}

export default function Main(): JSX.Element {
  const [state, setState] = useState<State>({ isLoading: true });

  useEffect(() => {
    if (!state.isLoading) {
      return;
    }
    brewFetchOutdated(preferences.greedyUpgrades)
      .then((outdated) => {
        setState({ outdated: outdated, isLoading: false });
      })
      .catch((err) => {
        showFailureToast("Brew outdated failed", err);
        setState({ isLoading: false });
      });
  }, [state]);

  return (
    <OutdatedList
      outdated={state.outdated}
      isLoading={state.isLoading}
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

function OutdatedList(props: { outdated?: OutdatedResults; isLoading: boolean; onAction: () => void }) {
  const formulae = props.outdated?.formulae ?? [];
  const casks = props.outdated?.casks ?? [];

  return (
    <List searchBarPlaceholder={"Filter formulae by name" + String.ellipsis} isLoading={props.isLoading}>
      <ListSection title="Formulae">
        {formulae.map((formula) => (
          <OutdatedFormulaeListItem key={formula.name} outdated={formula} onAction={props.onAction} />
        ))}
      </ListSection>
      <ListSection title="Casks">
        {casks.map((cask) => (
          <OutdatedCaskListItem key={cask.name} outdated={cask} onAction={props.onAction} />
        ))}
      </ListSection>
    </List>
  );
}
