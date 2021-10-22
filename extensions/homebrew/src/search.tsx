import {
  Color,
  Icon,
  List,
  render,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { brewSearchFormula, brewFetchInstalled, brewIsInstalled } from "./brew";
import { FormulaActionPanel } from "./components";

/// Main

function Main() {
  const [formulae, setFormulae] = useState([]);
  const [installed, setInstalled] = useState(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(async () => {
    setIsLoading(true);
    if (installed == undefined) {
      setInstalled(await listInstalled());
      return;
    }
    try {
      const formulae = await brewSearchFormula(query.trim());
      await updateInstalled(formulae, installed);
      setFormulae(formulae);
    } catch (err) {
      setFormulae([]);
      showToast(ToastStyle.Failure, "Package search error", err);
      console.log("brewSearchFormula error:", err);
    }
    setIsLoading(false);
  }, [query, installed]);

  function FormulaListItem(props: { formula: Formula }) {
    const formula = props.formula;
    let version = formula.versions.stable;
    let tintColor = Color.SecondaryText;

    if (brewIsInstalled(formula)) {
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
        actions={<FormulaActionPanel formula={formula} installCallback={() => {
          setFormulae([...formulae]);
        }}
        />}
      />
    );
  }

  function ForumulaList(props: { formulae: Formula[], isLoading: bool, onSearchTextChange: () => void }) {
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

async function listInstalled(): Map<string, Formula> {
  const installed = await brewFetchInstalled(true);
  const dict = new Map<string, Formula>();
  for (const formula of installed) {
    dict.set(formula.name, formula);
  }
  return dict;
}

async function updateInstalled(formulae: Formula[], installed: Map<string, Formula>) {
  for (formula of formulae) {
    const info = installed.get(formula.name);
    formula.installed = info ? info.installed : [];
  }
}
