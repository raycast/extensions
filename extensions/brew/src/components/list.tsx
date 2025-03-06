import { Color, Icon, List } from "@raycast/api";
import { brewFormatVersion, brewIsInstalled, brewName, Cask, Formula } from "../brew";
import { CaskActionPanel, FormulaActionPanel } from "./actionPanels";

const tertiaryTextColor: Color.Dynamic = {
  light: "#00000066",
  dark: "#FFFFFF66",
};

export interface FormulaListProps {
  isLoading: boolean;
  formulae: Formula[];
  casks: Cask[];
  searchBarPlaceholder: string;
  searchBarAccessory?: JSX.Element;
  onSearchTextChange?: (q: string) => void;
  isInstalled: (name: string) => boolean;
  onAction: () => void;
}

export function FormulaList(props: FormulaListProps): JSX.Element {
  const formulae = props.formulae;
  const casks = props.casks;
  return (
    <List
      searchBarPlaceholder={props.searchBarPlaceholder}
      searchBarAccessory={props.searchBarAccessory}
      onSearchTextChange={props.onSearchTextChange}
      isLoading={props.isLoading}
    >
      <List.Section title="Formulae">
        {formulae.map((formula) => (
          <FormulaListItem
            key={`formula-${formula.name}`}
            formula={formula}
            isInstalled={props.isInstalled}
            onAction={props.onAction}
          />
        ))}
        {formulae.isTruncated() && <MoreListItem />}
      </List.Section>
      <List.Section title="Casks">
        {props.casks.map((cask) => (
          <CaskListItem
            key={`cask-${cask.token}`}
            cask={cask}
            isInstalled={props.isInstalled}
            onAction={props.onAction}
          />
        ))}
        {casks.isTruncated() && <MoreListItem />}
      </List.Section>
    </List>
  );
}

export function FormulaListItem(props: {
  formula: Formula;
  isInstalled: (name: string) => boolean;
  onAction: () => void;
}): JSX.Element {
  const formula = props.formula;
  let version = formula.versions.stable;
  let tintColor: Color.ColorLike = tertiaryTextColor;
  let tooltip: string | undefined = undefined;
  let iconMark: Icon = Icon.Circle;

  if (brewIsInstalled(formula)) {
    version = brewFormatVersion(formula);
    tintColor = formula.outdated ? Color.Red : Color.Green;
    iconMark = Icon.CheckCircle;
    tooltip = formula.outdated ? "Outdated" : "Up to date";
  }

  const icon = { source: iconMark, tintColor: tintColor };

  return (
    <List.Item
      title={formula.name}
      subtitle={formula.desc}
      accessories={[{ text: version }]}
      icon={tooltip ? { value: icon, tooltip } : icon}
      actions={
        <FormulaActionPanel
          formula={formula}
          showDetails={true}
          isInstalled={props.isInstalled}
          onAction={props.onAction}
        />
      }
    />
  );
}

export function CaskListItem(props: {
  cask: Cask;
  isInstalled: (name: string) => boolean;
  onAction: () => void;
}): JSX.Element {
  const cask = props.cask;
  let version = cask.version;
  let tintColor: Color.ColorLike = tertiaryTextColor;
  let tooltip: string | undefined = undefined;
  let iconMark: Icon = Icon.Circle;

  if (brewIsInstalled(cask)) {
    version = brewFormatVersion(cask);
    tintColor = cask.outdated ? Color.Red : Color.Green;
    iconMark = Icon.CheckCircle;
    tooltip = cask.outdated ? "Outdated" : "Up to date";
  }

  const icon = { source: iconMark, tintColor: tintColor };

  return (
    <List.Item
      title={brewName(cask)}
      subtitle={cask.desc}
      accessories={[{ text: version }]}
      icon={tooltip ? { value: icon, tooltip } : icon}
      actions={
        <CaskActionPanel cask={cask} showDetails={true} isInstalled={props.isInstalled} onAction={props.onAction} />
      }
    />
  );
}

export function MoreListItem(): JSX.Element {
  return <List.Item title="" icon={Icon.Dot} />;
}
