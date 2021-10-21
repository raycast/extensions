import {
  ActionPanel,
  ActionPanelItem,
  Color,
  CopyToClipboardAction,
  Icon,
  List,
  ListSection,
  OpenInBrowserAction,
  PushAction,
  render,
  ShowInFinderAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { brewInstalled, brewUninstall } from "./brew";
import { FormulaInfo } from "./components";

interface Installed {
  formulae: Formula[];
  isLoading: bool;
}

function Main() {
  const [installed, setInstalled] = useState({formulae: [], isLoading: true});

  useEffect(async () => {
    try {
      setInstalled({formulae: await brewInstalled(true), isLoading: false});
    } catch (err) {
      console.log("brewInstalled error:", err);
      showToast(ToastStyle.Failure, "Brew list failed");
      setInstalled({formulae: [], isLoading: false});
    }
  }, []); // trigger once

  function FormulaListItem(props: { formula: Formula }) {
    const formula = props.formula;
    const isInstalled = formula.installed.length > 0;
    const version = isInstalled ? formula.installed[0].version : "";
    return (
      <List.Item id={formula.name}
                 title={formula.name}
                 subtitle={formula.desc}
                 accessoryTitle={version}
                 icon={ {source: Icon.Checkmark, tintColor: Color.Green} }
                 actions={
                   <ActionPanel>
                     <ActionPanel.Section>
                       <ShowInFinderAction path={`/usr/local/bin/${formula.name}`} />
                       <PushAction title="Show Details" target={<FormulaInfo formula={formula} isInstalled={isInstalled} />} />
                       <OpenInBrowserAction url={formula.homepage} />
                       <CopyToClipboardAction title="Copy URL" content={formula.homepage} />
                     </ActionPanel.Section>
                     <ActionPanel.Section>
                       <ActionPanelItem title="Uninstall"
                                        icon={Icon.Trash}
                                        shortcut={{ modifiers:["ctrl"], key: "x" }}
                                        onAction={() => {
                                          uninstall(formula, setInstalled);
                                        }} />
                     </ActionPanel.Section>
                   </ActionPanel>
                 }
      />
    );
  }

  function ForumulaList(props: { installed: Installed }) {
    return (
      <List searchBarPlaceholder="Filter formula by name..." isLoading={props.installed.isLoading}>
        <ListSection title="Installed">
          {
            props.installed.formulae.map((formula) => (
              <FormulaListItem key={formula.name} formula={formula} />
            ))
          }
        </ListSection>
      </List>
    );
  }

  return <ForumulaList installed={installed} />
}

async function main() {
  render(<Main />);
}
main();

function uninstall(formula: Formula, setInstalled: () => void) {
  showToast(ToastStyle.Animated, `Uninstalling ${formula.full_name}`);
  return brewUninstall(formula)
    .then(brewInstalled)
    .then(formulae => {
      setInstalled({ formulae: formulae, isLoading: false });
      showToast(ToastStyle.Success, `Uninstalled ${formula.full_name}`);
    })
    .catch(error => {
      console.error(error);
      showToast(ToastStyle.Failure, "Uninstall failed");
    })
}
