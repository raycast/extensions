import {
  ActionPanel,
  ActionPanelItem,
  List,
  render,
  showToast,
  ToastStyle,
  OpenInBrowserAction,
  CopyToClipboardAction,
  Icon,
  Color,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { brewSearchFormula, brewListInstalled, brewInstall } from "./brew";

interface Dictionary<T> {
    [Key: string]: T;
}

/// Main

function Main() {
  const [formulas, setFormulas] = useState([]);
  const [installed, setInstalled] = useState(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(async () => {
    setIsLoading(true);
    try {
      let allInstalled = installed;
      if (allInstalled === undefined) {
        allInstalled = await listInstalled();
        setInstalled(allInstalled);
      }
      const formulas = await brewSearchFormula(query);
      updateInstalled(formulas, allInstalled);
      setFormulas(formulas);
      console.log("formulas:", formulas[0]);
    } catch (err) {
      console.log("brewSearchFormula error:", err);
      showToast(ToastStyle.Failure, "Package search error", err);
    }
    setIsLoading(false);
  }, [query]);

  function FormulaListItem(props: { formula: Formula }) {
    const formula = props.formula;
    let version = formula.versions.stable;
    let tintColor = Color.SecondaryText;
    if (formula.installed[0]) {
      version = formula.installed[0].version;
      tintColor = Color.Green;
    }
    return (
      <List.Item
        id={formula.name}
        title={formula.full_name}
        subtitle={formula.desc}
        accessoryTitle={version}
        icon={ {source: Icon.Checkmark, tintColor: tintColor} }
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <ActionPanelItem title="Install"
                               icon={Icon.Plus}
                               shortcut={{ modifiers:["cmd"], key: "i" }}
                               onAction={async () => {
                                 await install(formula);
                                 // TODO: Need to handle error case...
                                 let allInstalled = installed;
                                 allInstalled[formula.name] = formula;
                                 // TODO: Not sure this is triggering a reload?
                                 // And formula is also not recognised as installed (also fish).
                                 setInstalled(allInstalled);
                               }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <OpenInBrowserAction url={formula.homepage} />
              <CopyToClipboardAction title="Copy URL" content={formula.homepage} />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  function ForumulaList(props: { formulas: Formula[], isLoading: bool, onSearchTextChange: () => void }) {
    const results = props.formulas ? props.formulas.slice(0, 200) : [];
    return (
      <List searchBarPlaceholder="Search formula by name..." isLoading={props.isLoading} onSearchTextChange={props.onSearchTextChange} >
        {results.map((formula) => (
          <FormulaListItem key={formula.name} formula={formula} />
        ))}
      </List>
    );
  }

  console.log("Render FormulaList");
  return <ForumulaList formulas={formulas} isLoading={isLoading} onSearchTextChange={setQuery} />;
}

async function main() {
  render(<Main />);
}
main();

/// Private

async function install(formula: Formula) {
  showToast(ToastStyle.Animated, `Installing ${formula.full_name}`);
  try {
    await brewInstall(formula);
    formula.installed = {version: formula.versions.stable};
    showToast(ToastStyle.Success, `Installed ${formula.full_name}`);
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Install failed");
  }
}

async function listInstalled(): Dictionary<Formula> {
  const installed = await brewListInstalled();
  let dict = {};
  for (f in installed) {
    dict[f.name] = f;
  }
  return dict;
}

function updateInstalled(formulas: Formula[], installed: Dictionary<Formula>) {
  console.log("updateInstalled", formulas.length, installed.length);
  for (formula in formulas) {
    if (installed[formula.name]) {
      formula.installed == installed[formula.name].installed;
    }
  }
}
