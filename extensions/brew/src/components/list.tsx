import {
  Color,
  Icon,
  List,
  ListSection,
} from "@raycast/api";
import { Formula, brewIsInstalled, brewFormatVersion } from "../brew";
import { FormulaActionPanel } from "./actionPanel";

export function FormulaListItem(props: { formula: Formula, onAction: () => void }) {
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
      actions={<FormulaActionPanel formula={formula} showDetails={true} onAction={props.onAction} />}
    />
  );
}

interface FormulaListProps {
  formulae: Formula[];
  searchBarPlaceholder: string,
  isLoading: boolean;
  sectionTitle?: string;
  onSearchTextChange?: (q: string) => void;
  onAction: () => void;
}

export function FormulaList(props: FormulaListProps) {
  return (
    <List searchBarPlaceholder={props.searchBarPlaceholder} isLoading={props.isLoading}>
      <ListSection title={props.sectionTitle} >
        {props.formulae.map((formula) => (
          <FormulaListItem key={formula.name} formula={formula} onAction={props.onAction} />
        ))}
      </ListSection>
    </List>
  );
}
