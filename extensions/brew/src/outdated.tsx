import {
  Color,
  Icon,
  List,
  ListSection,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { OutdatedFormula, brewFetchOutdated } from "./brew";
import { OutdatedActionPanel } from "./components/actionPanel";

interface State {
  outdated: OutdatedFormula[];
  isLoading: boolean;
}

export default function Main() {
  const [state, setState] = useState<State>({outdated: [], isLoading: true});

  useEffect(() => {
    if (!state.isLoading) { return; }
    brewFetchOutdated()
    .then(outdated => {
      setState({outdated: outdated, isLoading: false});
    })
    .catch (err => {
      console.log("brewFetchOutdated error:", err);
      showToast(ToastStyle.Failure, "Brew outdated failed");
      setState({outdated: [], isLoading: false});
    });
  }, [state]);


  return (
    <OutdatedList outdatedFormulae={state.outdated}
                  isLoading={state.isLoading}
                  onAction={() => {
                    setState((oldState) => ({...oldState, isLoading: true}));
                  }}
    />
  );
}

function OutdatedListItem(props: { outdated: OutdatedFormula, onAction: () => void }) {
  const outdated = props.outdated;
  let version = "";
  if (outdated.installed_versions.length > 0) {
    version = `${outdated.installed_versions[0]} -> ${outdated.current_version}`
  }

  return (
    <List.Item id={outdated.name}
               title={outdated.name}
               subtitle={outdated.pinned ? "Pinned" : ""}
               accessoryTitle={version}
               icon={ {source: Icon.Checkmark, tintColor: Color.Red} }
               actions={<OutdatedActionPanel outdated={outdated} onAction={props.onAction} />}
    />
  );
}

function OutdatedList(props: { outdatedFormulae: OutdatedFormula[], isLoading: boolean, onAction: () => void }) {
  return (
    <List searchBarPlaceholder="Filter formulae by name..." isLoading={props.isLoading}>
      <ListSection title="Outdated">
        {
          props.outdatedFormulae.map((outdated) => (
            <OutdatedListItem key={outdated.name} outdated={outdated} onAction={props.onAction} />
          ))
        }
      </ListSection>
    </List>
  );
}
