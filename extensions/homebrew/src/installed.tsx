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

function Main() {
  const [formulas, setFormulas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(async () => {
    setIsLoading(true);
    try {
      setFormulas(await brewListInstalled());
    } catch (err) {
      console.log("brewListInstalled error:", err);
      showToast(ToastStyle.Failure, "Brew list failed");
    }
    setIsLoading(false);
  }, []);

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

  function ForumulaList(props: { formulas: Formula[], isLoading: bool }) {
    return (
      <List searchBarPlaceholder="Filter formula by name..." isLoading={props.isLoading}>
        <ListSection title="Installed">
          {
            props.formulas.map((formula) => (
              <FormulaListItem key={formula.name} formula={formula} />
            ))
          }
        </ListSection>
      </List>
    );
  }

  return <ForumulaList formulas={formulas} isLoading={isLoading} />
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
