import {
  Color,
  Icon,
  List,
  ListSection,
  render,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { OutdatedFormula, brewFetchOutdated } from "./brew";
import { OutdatedActionPanel } from "./components/actionPanel";

function Main() {
  const [outdatedFormulae, setOutdatedFormulae] = useState<OutdatedFormula[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoading) { return; }
    brewFetchOutdated()
    .then(outdated => {
      setOutdatedFormulae(outdated);
      setIsLoading(false);
    })
    .catch (err => {
      console.log("brewFetchOutdated error:", err);
      showToast(ToastStyle.Failure, "Brew outdated failed");
      setOutdatedFormulae([]);
      setIsLoading(false);
    });
  }, [isLoading]);

  function OutdatedListItem(props: { outdated: OutdatedFormula }) {
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
                 actions={<OutdatedActionPanel outdated={outdated} onAction={() => {
                   setIsLoading(true);
                 }}
                 />}
      />
    );
  }

  function OutdatedList(props: { outdatedFormulae: OutdatedFormula[], isLoading: boolean }) {
    return (
      <List searchBarPlaceholder="Filter formula by name..." isLoading={props.isLoading}>
        <ListSection title="Outdated">
          {
            props.outdatedFormulae.map((outdated) => (
              <OutdatedListItem key={outdated.name} outdated={outdated} />
            ))
          }
        </ListSection>
      </List>
    );
  }

  return <OutdatedList outdatedFormulae={outdatedFormulae} isLoading={isLoading} />
}

async function main() {
  render(<Main />);
}
main();
