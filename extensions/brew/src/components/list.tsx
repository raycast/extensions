import React from "react";
import { Color, Icon, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { brewFormatVersion, brewIsInstalled, brewName, Cask, Formula } from "../utils";
import { CaskActionPanel, FormulaActionPanel } from "./actionPanels";
import { FormulaListItemDetail, CaskListItemDetail } from "./listItemDetail";

const tertiaryTextColor: Color.Dynamic = {
  light: "#00000066",
  dark: "#FFFFFF66",
};

export interface FormulaListProps {
  isLoading: boolean;
  formulae: Formula[];
  casks: Cask[];
  searchBarPlaceholder: string;
  searchBarAccessory?: React.ComponentProps<typeof List>["searchBarAccessory"];
  onSearchTextChange?: (q: string) => void;
  isInstalled: (name: string) => boolean;
  onAction: () => void;
  filtering?: boolean;
  dataFetched?: boolean;
  showMetadataPanel?: boolean;
}

export function FormulaList(props: FormulaListProps) {
  const formulae = props.formulae;
  const casks = props.casks;
  const hasResults = formulae.length > 0 || casks.length > 0;
  const showMetadataPanel = props.showMetadataPanel ?? false;

  return (
    <List
      searchBarPlaceholder={props.searchBarPlaceholder}
      searchBarAccessory={props.searchBarAccessory}
      onSearchTextChange={props.onSearchTextChange}
      isLoading={props.isLoading}
      filtering={props.filtering ?? true}
      isShowingDetail={showMetadataPanel}
      throttle
    >
      {!hasResults && (props.isLoading || !props.dataFetched) && (
        <List.EmptyView
          icon={getProgressIcon(0.5)}
          title="Loading Packages"
          description="Fetching casks and formulae from Homebrew..."
        />
      )}
      {!hasResults && !props.isLoading && props.dataFetched && (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No Results" description="No packages found" />
      )}
      {formulae.length > 0 && (
        <List.Section title="Formulae">
          {formulae.map((formula) => (
            <FormulaListItem
              key={`formula-${formula.name}`}
              formula={formula}
              isInstalled={props.isInstalled}
              onAction={props.onAction}
              showMetadataPanel={showMetadataPanel}
            />
          ))}
          {formulae.isTruncated() && <MoreListItem />}
        </List.Section>
      )}
      {casks.length > 0 && (
        <List.Section title="Casks">
          {casks.map((cask) => (
            <CaskListItem
              key={`cask-${cask.token}`}
              cask={cask}
              isInstalled={props.isInstalled}
              onAction={props.onAction}
              showMetadataPanel={showMetadataPanel}
            />
          ))}
          {casks.isTruncated() && <MoreListItem />}
        </List.Section>
      )}
    </List>
  );
}

export function FormulaListItem(props: {
  formula: Formula;
  isInstalled: (name: string) => boolean;
  onAction: () => void;
  showMetadataPanel?: boolean;
}) {
  const formula = props.formula;
  const showMetadataPanel = props.showMetadataPanel ?? false;
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
      subtitle={showMetadataPanel ? undefined : formula.desc}
      accessories={showMetadataPanel ? undefined : [{ text: version }]}
      icon={tooltip ? { value: icon, tooltip } : icon}
      detail={
        showMetadataPanel ? <FormulaListItemDetail formula={formula} isInstalled={props.isInstalled} /> : undefined
      }
      actions={
        <FormulaActionPanel
          formula={formula}
          showDetails={!showMetadataPanel}
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
  showMetadataPanel?: boolean;
}) {
  const cask = props.cask;
  const showMetadataPanel = props.showMetadataPanel ?? false;
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
      subtitle={showMetadataPanel ? undefined : cask.desc}
      accessories={showMetadataPanel ? undefined : [{ text: version }]}
      icon={tooltip ? { value: icon, tooltip } : icon}
      detail={showMetadataPanel ? <CaskListItemDetail cask={cask} isInstalled={props.isInstalled} /> : undefined}
      actions={
        <CaskActionPanel
          cask={cask}
          showDetails={!showMetadataPanel}
          isInstalled={props.isInstalled}
          onAction={props.onAction}
        />
      }
    />
  );
}

export function MoreListItem() {
  return <List.Item title="" icon={Icon.Dot} />;
}
