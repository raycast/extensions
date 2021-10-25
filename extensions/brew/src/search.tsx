import {
  Color,
  Icon,
  List,
  render,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Formula, brewSearchFormula, brewFetchInstalled, brewIsInstalled, brewFormatVersion } from "./brew";
import { FormulaActionPanel } from "./components/actionPanel";

/// Main

function Main() {
  const [formulae, setFormulae] = useState<Formula[]>([]);
  const [installed, setInstalled] = useState<Map<string, Formula> | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [query, setQuery] = useState<string>("");

  useEffect(() => {
    setIsLoading(true);
    if (installed == undefined) {
      listInstalled().then(setInstalled);
      return;
    }
    brewSearchFormula(query.trim())
    .then(formulae => {
      updateInstalled(formulae, installed);
      setFormulae(formulae);
      setIsLoading(false);
    })
    .catch (err => {
      setFormulae([]);
      setIsLoading(false);
      showToast(ToastStyle.Failure, "Package search error");
      console.log("brewSearchFormula error:", err);
    });
  }, [query, installed]);

  function FormulaListItem(props: { formula: Formula }) {
    const formula = props.formula;
    let version = formula.versions.stable;
    let tintColor = Color.SecondaryText;

    if (brewIsInstalled(formula)) {
      version = brewFormatVersion(formula);
      tintColor = formula.outdated ? Color.Red : Color.Green;
    }

    return (
      <List.Item
        id={formula.name}
        title={formula.full_name}
        subtitle={formula.desc}
        accessoryTitle={version}
        icon={ {source: Icon.Checkmark, tintColor: tintColor} }
        actions={<FormulaActionPanel formula={formula} showDetails={true} onAction={() => {
          setInstalled(undefined);
        }}
        />}
      />
    );
  }

  function ForumulaList(props: { formulae: Formula[], isLoading: boolean, onSearchTextChange: (query: string) => void }) {
    // Truncate results: otherwise we can run out of JS heap memory...
    const results = props.formulae.slice(0, 200);
    return (
      <List searchBarPlaceholder="Search formula by name..." isLoading={props.isLoading} onSearchTextChange={props.onSearchTextChange} >
        {results.map((formula) => (
          <FormulaListItem key={formula.name} formula={formula} />
        ))}
      </List>
    );
  }

  return <ForumulaList formulae={formulae} isLoading={isLoading} onSearchTextChange={setQuery} />;
}

async function main() {
  render(<Main />);
}
main();

/// Private

async function listInstalled(): Promise<Map<string, Formula>> {
  const installed = await brewFetchInstalled(true);
  const dict = new Map<string, Formula>();
  for (const formula of installed) {
    dict.set(formula.name, formula);
  }
  return dict;
}

function updateInstalled(formulae: Formula[], installed: Map<string, Formula>) {
  for (const formula of formulae) {
    const info = installed.get(formula.name);
    formula.installed = info?.installed ?? [];
    formula.outdated = info?.outdated ?? false;
    formula.pinned = info?.pinned ?? false;
  }
}
