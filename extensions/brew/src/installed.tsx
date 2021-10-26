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
import { Formula, brewFetchInstalled, brewFormatVersion } from "./brew";
import { FormulaActionPanel } from "./components/actionPanel";

function Main() {
  const [formulae, setFormulae] = useState<Formula[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoading) { return; }
    brewFetchInstalled(true)
      .then(formulae => {
        setFormulae(formulae);
        setIsLoading(false);
      })
      .catch(err => {
        console.log("brewFetchInstalled error:", err);
        showToast(ToastStyle.Failure, "Brew list failed");
        setFormulae([]);
        setIsLoading(false);
      });
  }, [isLoading]);

  function FormulaListItem(props: { formula: Formula }) {
    const formula = props.formula;
    const tintColor = formula.outdated ? Color.Red : Color.Green;

    return (
      <List.Item id={formula.name}
                 title={formula.name}
                 subtitle={formula.desc}
                 accessoryTitle={brewFormatVersion(formula)}
                 icon={ {source: Icon.Checkmark, tintColor: tintColor} }
                 actions={<FormulaActionPanel formula={formula} showDetails={true} onAction={() => {
                   setIsLoading(true);
                 }}
                 />}
      />
    );
  }

  function ForumulaList(props: { formulae: Formula[], isLoading: boolean }) {
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
