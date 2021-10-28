import { Color, Icon, List, ListSection } from "@raycast/api";
import { Cask, Formula } from "../brew";
import { brewFormatVersion, brewIsInstalled, brewName } from "../brew";
import { CaskActionPanel, FormulaActionPanel } from "./actionPanels";

export interface FormulaListProps {
  formulae: Formula[];
  casks: Cask[];
  searchBarPlaceholder: string,
  isLoading: boolean;
  onSearchTextChange?: (q: string) => void;
  onAction: () => void;
}

export function FormulaList(props: FormulaListProps) {
  return (
    <List searchBarPlaceholder={props.searchBarPlaceholder} isLoading={props.isLoading}>
      <ListSection title="Formulae">
        {props.formulae.map((formula) => (
          <FormulaListItem key={formula.name} formula={formula} onAction={props.onAction} />
        ))}
      </ListSection>
      <ListSection title="Casks" >
        {props.casks.map((cask) => (
          <CaskListItem key={cask.token} cask={cask} onAction={props.onAction} />
        ))}
      </ListSection>
    </List>
  );
}

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
      title={formula.name}
      subtitle={formula.desc}
      accessoryTitle={version}
      icon={ {source: Icon.Checkmark, tintColor: tintColor} }
      actions={<FormulaActionPanel formula={formula} showDetails={true} onAction={props.onAction} />}
    />
  );
}

export function CaskListItem(props: { cask: Cask, onAction: () => void }) {
  const cask = props.cask;
  let version = cask.versions.stable;
  let tintColor = Color.SecondaryText;

  if (brewIsInstalled(cask)) {
    version = brewFormatVersion(cask);
    tintColor = cask.outdated ? Color.Red : Color.Green;
  }

  return (
    <List.Item
      id={cask.token}
      title={brewName(cask)}
      subtitle={cask.desc}
      accessoryTitle={version}
      icon={ {source: Icon.Checkmark, tintColor: tintColor} }
      actions={<CaskActionPanel cask={cask} showDetails={true} onAction={props.onAction} />}
    />
  );
}
