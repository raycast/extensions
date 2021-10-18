import {
  ActionPanel,
  ActionPanelItem,
  List,
  ListSection,
  render,
  showToast,
  ToastStyle,
  OpenInBrowserAction,
  ShowInFinderAction,
  CopyToClipboardAction,
  Icon,
  Color,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { brewListInstalled, brewUninstall } from "./brew";

interface Installed {
  formulas: Formula[];
  isLoading: bool;
}

function Main() {
  const [installed, setInstalled] = useState({formulas: [], isLoading: true});

  useEffect(async () => {
    try {
      setInstalled({formulas: await brewListInstalled(), isLoading: false});
    } catch (err) {
      console.log("brewListInstalled error:", err);
      showToast(ToastStyle.Failure, "Brew list failed");
      setInstalled({formulas: [], isLoading: false});
    }
  }, []); // trigger once

  function FormulaListItem(props: { formula: Formula }) {
    const formula = props.formula;
    const version = formula.installed[0] ? formula.installed[0].version : "";
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
                       <OpenInBrowserAction url={formula.homepage} />
                       <CopyToClipboardAction title="Copy URL" content={formula.homepage} />
                     </ActionPanel.Section>
                     <ActionPanel.Section>
                       <ActionPanelItem title="Uninstall"
                                        icon={Icon.Trash}
                                        shortcut={{ modifiers:["ctrl"], key: "x" }}
                                        onAction={() => {
                                          uninstall(formula, setFormulas);
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
            props.installed.formulas.map((formula) => (
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

function uninstall(formula: Formula, setFormulas: () => void) {
  showToast(ToastStyle.Animated, `Uninstalling ${formula.full_name}`);
  return brewUninstall(formula)
    .then(brewListInstalled)
    .then(formulas => {
      setFormulas(formulas);
      showToast(ToastStyle.Success, `Uninstalled ${formula.full_name}`);
    })
    .catch(error => {
      console.error(error);
      showToast(ToastStyle.Failure, "Uninstall failed");
    })
}
