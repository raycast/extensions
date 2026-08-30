import React, { useState } from "react";
import { Icon, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import {
  brewFormatVersion,
  brewInstalledDate,
  brewIsInstalled,
  brewIsOutdated,
  brewName,
  Cask,
  Formula,
} from "../utils";
import { CaskActionPanel, FormulaActionPanel } from "./actionPanels";
import { installStateIcon, UPDATE_AVAILABLE_COLOR } from "./packageIcons";
import { FormulaListItemDetail, CaskListItemDetail } from "./listItemDetail";

export interface FormulaListProps {
  isLoading: boolean;
  formulae: Formula[];
  casks: Cask[];
  pinnedFormulae?: Formula[];
  searchBarPlaceholder: string;
  searchBarAccessory?: React.ComponentProps<typeof List>["searchBarAccessory"];
  searchText?: string;
  onSearchTextChange?: (q: string) => void;
  isInstalled: (name: string) => boolean;
  onAction: () => void;
  filtering?: boolean;
  dataFetched?: boolean;
  showMetadataPanel?: boolean;
  onToggleSidebar?: () => void;
  /** Whether results are ordered by install count (search view only). */
  sortByPopularity?: boolean;
  onToggleSort?: () => void;
  /** When false, the detail panel drops its markdown and is metadata only. */
  showDescription?: boolean;
  onToggleDescription?: () => void;
  /**
   * Show when each package was installed. Installed-list only: it is a local
   * fact about this machine, not a property of the package being searched for.
   */
  showInstalledDate?: boolean;
  /** Offer Hide Dependencies. Installed-list only — see FormulaActionPanel. */
  showDependenciesFilter?: boolean;
}

export function FormulaList(props: FormulaListProps) {
  const formulae = props.formulae;
  const casks = props.casks;
  const pinnedFormulae = props.pinnedFormulae ?? [];
  const hasResults = formulae.length > 0 || casks.length > 0 || pinnedFormulae.length > 0;
  const showMetadataPanel = props.showMetadataPanel ?? false;

  // Raycast constructs the detail element for every row, so the panel needs to
  // know which one is actually on screen before it fetches anything for it.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <List
      searchBarPlaceholder={props.searchBarPlaceholder}
      onSelectionChange={setSelectedId}
      searchBarAccessory={props.searchBarAccessory}
      searchText={props.searchText}
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
              id={`formula-${formula.name}`}
              selectedId={selectedId}
              formula={formula}
              isInstalled={props.isInstalled}
              onAction={props.onAction}
              showMetadataPanel={showMetadataPanel}
              onToggleSidebar={props.onToggleSidebar}
              sortByPopularity={props.sortByPopularity}
              onToggleSort={props.onToggleSort}
              showDescription={props.showDescription}
              onToggleDescription={props.onToggleDescription}
              showInstalledDate={props.showInstalledDate}
              showDependenciesFilter={props.showDependenciesFilter}
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
              id={`cask-${cask.token}`}
              selectedId={selectedId}
              cask={cask}
              isInstalled={props.isInstalled}
              onAction={props.onAction}
              showMetadataPanel={showMetadataPanel}
              onToggleSidebar={props.onToggleSidebar}
              sortByPopularity={props.sortByPopularity}
              onToggleSort={props.onToggleSort}
              showDescription={props.showDescription}
              onToggleDescription={props.onToggleDescription}
              showInstalledDate={props.showInstalledDate}
            />
          ))}
          {casks.isTruncated() && <MoreListItem />}
        </List.Section>
      )}
      {pinnedFormulae.length > 0 && (
        <List.Section title="Pinned Formulae" subtitle={`${pinnedFormulae.length}`}>
          {pinnedFormulae.map((formula) => (
            <FormulaListItem
              key={`pinned-formula-${formula.name}`}
              id={`pinned-formula-${formula.name}`}
              selectedId={selectedId}
              formula={formula}
              isInstalled={props.isInstalled}
              onAction={props.onAction}
              showMetadataPanel={showMetadataPanel}
              onToggleSidebar={props.onToggleSidebar}
              showDescription={props.showDescription}
              onToggleDescription={props.onToggleDescription}
              showInstalledDate={props.showInstalledDate}
              showDependenciesFilter={props.showDependenciesFilter}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export function FormulaListItem(props: {
  id?: string;
  selectedId?: string | null;
  formula: Formula;
  isInstalled: (name: string) => boolean;
  onAction: () => void;
  showMetadataPanel?: boolean;
  onToggleSidebar?: () => void;
  sortByPopularity?: boolean;
  onToggleSort?: () => void;
  showDescription?: boolean;
  onToggleDescription?: () => void;
  showInstalledDate?: boolean;
  showDependenciesFilter?: boolean;
}) {
  const formula = props.formula;
  const showMetadataPanel = props.showMetadataPanel ?? false;
  let version = formula.versions.stable;

  const formulaOutdated = brewIsOutdated(formula);
  const installed = brewIsInstalled(formula);
  if (installed) {
    version = brewFormatVersion(formula);
  }

  const icon = installStateIcon(installed, formulaOutdated);
  const accessories: List.Item.Accessory[] = [];
  if (installed && formulaOutdated) {
    accessories.push({ tag: { value: "Outdated", color: UPDATE_AVAILABLE_COLOR } });
  }
  accessories.push({ text: version });
  pushAccessories(
    accessories,
    props.showInstalledDate ? brewInstalledDate(formula) : undefined,
    formula.installs,
    formula.pinned,
  );

  return (
    <List.Item
      id={props.id}
      title={formula.name}
      subtitle={showMetadataPanel ? undefined : formula.desc}
      accessories={showMetadataPanel ? undefined : accessories}
      icon={icon}
      detail={
        showMetadataPanel ? (
          <FormulaListItemDetail
            formula={formula}
            isInstalled={props.isInstalled}
            isSelected={props.id != undefined && props.id === props.selectedId}
            showDescription={props.showDescription}
          />
        ) : undefined
      }
      actions={
        <FormulaActionPanel
          formula={formula}
          isInstalled={props.isInstalled}
          onAction={props.onAction}
          onToggleSidebar={props.onToggleSidebar}
          sortByPopularity={props.sortByPopularity}
          onToggleSort={props.onToggleSort}
          showDescription={props.showDescription}
          onToggleDescription={props.onToggleDescription}
          metadataPanelVisible={showMetadataPanel}
          showDependenciesFilter={props.showDependenciesFilter}
        />
      }
    />
  );
}

export function CaskListItem(props: {
  id?: string;
  selectedId?: string | null;
  cask: Cask;
  isInstalled: (name: string) => boolean;
  onAction: () => void;
  showMetadataPanel?: boolean;
  onToggleSidebar?: () => void;
  sortByPopularity?: boolean;
  onToggleSort?: () => void;
  showDescription?: boolean;
  onToggleDescription?: () => void;
  showInstalledDate?: boolean;
}) {
  const cask = props.cask;
  const showMetadataPanel = props.showMetadataPanel ?? false;
  let version = cask.version;

  const caskOutdated = brewIsOutdated(cask);
  const installed = brewIsInstalled(cask);
  if (installed) {
    version = brewFormatVersion(cask);
  }

  const icon = installStateIcon(installed, caskOutdated);
  const accessories: List.Item.Accessory[] = [];
  if (installed && caskOutdated) {
    accessories.push({ tag: { value: "Outdated", color: UPDATE_AVAILABLE_COLOR } });
  }
  accessories.push({ text: version });
  pushAccessories(accessories, props.showInstalledDate ? brewInstalledDate(cask) : undefined, cask.installs, false);

  return (
    <List.Item
      id={props.id}
      title={brewName(cask)}
      subtitle={showMetadataPanel ? undefined : cask.desc}
      accessories={showMetadataPanel ? undefined : accessories}
      icon={icon}
      detail={
        showMetadataPanel ? (
          <CaskListItemDetail
            cask={cask}
            isInstalled={props.isInstalled}
            isSelected={props.id != undefined && props.id === props.selectedId}
            showDescription={props.showDescription}
          />
        ) : undefined
      }
      actions={
        <CaskActionPanel
          cask={cask}
          isInstalled={props.isInstalled}
          onAction={props.onAction}
          onToggleSidebar={props.onToggleSidebar}
          sortByPopularity={props.sortByPopularity}
          onToggleSort={props.onToggleSort}
          showDescription={props.showDescription}
          onToggleDescription={props.onToggleDescription}
          metadataPanelVisible={showMetadataPanel}
        />
      }
    />
  );
}

const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/**
 * Trailing accessories, in order: version (already pushed), install date,
 * 30-day installs, pin.
 *
 * Each is conditional on its data existing:
 *
 * - **Install date** — only for installed packages, and only in the Installed
 *   list (see `showInstalledDate`).
 * - **Install count** — ONLY APPEARS WHILE THE POPULARITY SORT IS ON. The count
 *   comes from the bulk 30-day rankings, which are ~2.6MB and are downloaded
 *   only when that sort is enabled; `brewSearch` stamps `installs` onto results
 *   in that case alone. Showing it unconditionally would mean every user paid
 *   for that download on first search, so the count rides along with the sort
 *   rather than being always-on.
 * - **Pin** — formulae only; casks cannot be pinned.
 */
function pushAccessories(
  accessories: List.Item.Accessory[],
  installedDate: Date | undefined,
  installs: number | undefined,
  pinned: boolean,
): void {
  if (installedDate) {
    accessories.push({ date: installedDate, tooltip: `Installed ${installedDate.toLocaleString()}` });
  }
  if (installs != undefined) {
    accessories.push({
      icon: Icon.ArrowDown,
      text: compactNumber.format(installs),
      tooltip: `${installs.toLocaleString()} installs in the last 30 days`,
    });
  }
  if (pinned) {
    accessories.push({ icon: Icon.Tack, tooltip: "Pinned" });
  }
}

export function MoreListItem() {
  return <List.Item title="" icon={Icon.Dot} />;
}
