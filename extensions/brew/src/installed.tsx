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
import { brewFetchInstalled, brewIsInstalled } from "./brew";
import FormulaActionPanel from "./components/actionPanel";

function Main() {
  const [formulae, setFormulae] = useState<Formula[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(async () => {
    setIsLoading(true);
    try {
      setFormulae(await brewFetchInstalled(true));
    } catch (err) {
      console.log("brewFetchInstalled error:", err);
      showToast(ToastStyle.Failure, "Brew list failed");
      setFormulae([]);
    }
    setIsLoading(false);
  }, []);

  function FormulaListItem(props: { formula: Formula }) {
    const formula = props.formula;
    let version = "";
    if (formula.installed.length > 0) {
      const installed_version = formula.installed[0];
      if (installed_version.installed_as_dependency) {
        version = `${installed_version.version} (D)`;
      } else {
        version = installed_version.version;
      }
    }

    return (
      <List.Item id={formula.name}
                 title={formula.name}
                 subtitle={formula.desc}
                 accessoryTitle={version}
                 icon={ {source: Icon.Checkmark, tintColor: Color.Green} }
                 actions={<FormulaActionPanel formula={formula} showDetails={true} onInstall={() => {
                   // Uninstall does not (currently) include dependencies, so just reload formulae.
                   setFormulae(formulae.filter(f => brewIsInstalled(f) ));
                 }}
                 />}
      />
    );
  }

  function ForumulaList(props: { formulae: Formulae[], isLoading: bool }) {
    return (
      <List searchBarPlaceholder="Filter formula by name..." isLoading={props.isLoading}>
        <ListSection title="Installed">
          {
            props.formulae.map((formula) => (
              <FormulaListItem key={formula.name} formula={formula} />
            ))
          }
        </ListSection>
      </List>
    );
  }

  return <ForumulaList formulae={formulae} isLoading={isLoading} />
}

async function main() {
  render(<Main />);
}
main();
