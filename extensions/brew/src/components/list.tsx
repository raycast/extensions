import { Color, Icon, List, ListSection } from "@raycast/api";
import { Cask, Formula } from "../brew";
import { brewFormatVersion, brewIsInstalled, brewName } from "../brew";
import { CaskActionPanel, FormulaActionPanel } from "./actionPanels";

export interface FormulaListProps {
  formulae: Formula[];
  casks: Cask[];
  searchBarPlaceholder: string;
  isLoading: boolean;
  onSearchTextChange?: (q: string) => void;
  onAction: () => void;
}

export function FormulaList(props: FormulaListProps): JSX.Element {
  const formulae = props.formulae;
  const casks = props.casks;
  return (
    <List
      searchBarPlaceholder={props.searchBarPlaceholder}
      onSearchTextChange={props.onSearchTextChange}
      isLoading={props.isLoading}
    >
      <ListSection title="Formulae">
        {formulae.map((formula) => (
          <FormulaListItem key={`formula-${formula.name}`} formula={formula} onAction={props.onAction} />
        ))}
        {formulae.isTruncated() && <MoreListItem />}
      </ListSection>
      <ListSection title="Casks">
        {props.casks.map((cask) => (
          <CaskListItem key={`cask-${cask.token}`} cask={cask} onAction={props.onAction} />
        ))}
        {casks.isTruncated() && <MoreListItem />}
      </ListSection>
    </List>
  );
}

export function FormulaListItem(props: { formula: Formula; onAction: () => void }): JSX.Element {
  const formula = props.formula;
  let version = formula.versions.stable;
  let tintColor = Color.SecondaryText;

  if (brewIsInstalled(formula)) {
    version = brewFormatVersion(formula);
    tintColor = formula.outdated ? Color.Red : Color.Green;
  }

  return (
    <List.Item
      title={formula.name}
      subtitle={formula.desc}
      accessoryTitle={version}
      icon={{ source: Icon.Checkmark, tintColor: tintColor }}
      actions={<FormulaActionPanel formula={formula} showDetails={true} onAction={props.onAction} />}
    />
  );
}

export function CaskListItem(props: { cask: Cask; onAction: () => void }): JSX.Element {
  const cask = props.cask;
  let version = cask.version;
  let tintColor = Color.SecondaryText;

  if (brewIsInstalled(cask)) {
    version = brewFormatVersion(cask);
    tintColor = cask.outdated ? Color.Red : Color.Green;
  }

  return (
    <List.Item
      title={brewName(cask)}
      subtitle={cask.desc}
      accessoryTitle={version}
      icon={{ source: Icon.Checkmark, tintColor: tintColor }}
      actions={<CaskActionPanel cask={cask} showDetails={true} onAction={props.onAction} />}
    />
  );
}

export function MoreListItem(): JSX.Element {
  return <List.Item title="" icon={Icon.Dot} />;
}
