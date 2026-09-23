import React, { useState } from "react";
import { ActionPanel, Icon, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import {
  brewFormatVersion,
  brewInstalledDate,
  brewIsInstalled,
  brewIsOutdated,
  brewName,
  brewHost,
  Cask,
  Formula,
  preferences,
} from "../utils";
import { CaskActionPanel, FormulaActionPanel, PagingSection } from "./actionPanels";
import { installStateIcon, STATUS_COLOR, UNINSTALLABLE_COLOR, UPDATE_AVAILABLE_COLOR } from "./palette";
import { FormulaListItemDetail, CaskListItemDetail } from "./listItemDetail";
import { hasNextPage, pageRangeCompact, pageRangeSummary } from "../utils/paging";
import { isUnusedDependency } from "../utils/installed";
import { uninstallableReason } from "../utils/brew/installability";

export interface FormulaListProps {
  isLoading: boolean;
  formulae: Formula[];
  /** Formulae pulled in by something else. Installed-list only. */
  dependencies?: Formula[];
  casks: Cask[];
  pinnedFormulae?: Formula[];
  pinnedCasks?: Cask[];
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
  /**
   * How many matched in total, before the caller's window narrowed the arrays
   * above. Only Search passes it: Show Installed renders every installed
   * package and the outdated surfaces render the whole outdated set, so neither
   * is ever windowed.
   */
  totals?: { formulae: number; casks: number };
  /** Page navigation, when the matches span more than one page. */
  paging?: PagingProps;
  /**
   * Every name something installed depends on (`brew leaves`). Only the
   * Dependencies section passes it on, so no other row evaluates "Unused".
   */
  dependedOn?: ReadonlySet<string>;
}

/**
 * Moving a fixed-size WINDOW over the results, rather than growing the list.
 *
 * Passed as one object through each hop instead of five loose callbacks: the
 * actions have to reach every row's panel, and threading them individually
 * through FormulaList → list item → action panel → ViewSection is five
 * prop edits per hop for no gain.
 */
export interface PagingProps {
  /** Zero-based. */
  page: number;
  totalPages: number;
  pageSize: number;
  /** Clamped by the owner; callers hand it a raw target index. */
  goToPage: (page: number) => void;
}

export function FormulaList(props: FormulaListProps) {
  const formulae = props.formulae;
  const casks = props.casks;
  const pinnedFormulae = props.pinnedFormulae ?? [];
  const pinnedCasks = props.pinnedCasks ?? [];
  const dependencies = props.dependencies ?? [];
  const hasResults =
    formulae.length > 0 ||
    dependencies.length > 0 ||
    casks.length > 0 ||
    pinnedFormulae.length > 0 ||
    pinnedCasks.length > 0;
  const showMetadataPanel = props.showMetadataPanel ?? false;

  // Raycast constructs the detail element for every row, so the panel needs to
  // know which one is actually on screen before it fetches anything for it.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // A pin is an explicit user decision, so surfacing it first is the default.
  const pinnedFirst = preferences.pinnedFirst;

  // Every row in every section takes the same display props; only `key`, `id`,
  // the item itself and `dependedOn` differ per call site.
  const rowProps = {
    selectedId,
    isInstalled: props.isInstalled,
    onAction: props.onAction,
    showMetadataPanel,
    onToggleSidebar: props.onToggleSidebar,
    sortByPopularity: props.sortByPopularity,
    onToggleSort: props.onToggleSort,
    showDescription: props.showDescription,
    onToggleDescription: props.onToggleDescription,
    showInstalledDate: props.showInstalledDate,
    paging: props.paging,
  };
  // `CaskListItem` takes no dependency filter, so formula rows get their own object.
  const formulaRowProps = { ...rowProps, showDependenciesFilter: props.showDependenciesFilter };
  // Pinned Formulae is the one section that has never offered the popularity
  // sort. Kept that way rather than changed silently by the shared spread.
  const pinnedFormulaRowProps = { ...formulaRowProps, sortByPopularity: undefined, onToggleSort: undefined };

  const pageFooter = (kind: "formula" | "cask", shown: number, total: number) =>
    props.paging && hasNextPage(props.paging.page, props.paging.totalPages) && total > shown ? (
      <PageFooterItem
        shown={shown}
        total={total}
        kind={kind}
        showMetadataPanel={showMetadataPanel}
        paging={props.paging}
      />
    ) : null;

  const formulaeSection = formulae.length > 0 && (
    <List.Section title="Formulae">
      {formulae.map((formula) => (
        <FormulaListItem
          key={`formula-${formula.name}`}
          id={`formula-${formula.name}`}
          formula={formula}
          {...formulaRowProps}
        />
      ))}
      {pageFooter("formula", formulae.length, props.totals?.formulae ?? 0)}
    </List.Section>
  );
  const dependenciesSection = dependencies.length > 0 && (
    <List.Section title="Dependencies" subtitle={`${dependencies.length}`}>
      {dependencies.map((formula) => (
        <FormulaListItem
          key={`dependency-${formula.name}`}
          id={`dependency-${formula.name}`}
          formula={formula}
          dependedOn={props.dependedOn}
          {...formulaRowProps}
        />
      ))}
    </List.Section>
  );
  const casksSection = casks.length > 0 && (
    <List.Section title="Casks">
      {casks.map((cask) => (
        <CaskListItem key={`cask-${cask.token}`} id={`cask-${cask.token}`} cask={cask} {...rowProps} />
      ))}
      {pageFooter("cask", casks.length, props.totals?.casks ?? 0)}
    </List.Section>
  );
  const pinnedFormulaeSection = pinnedFormulae.length > 0 && (
    <List.Section title="Pinned Formulae" subtitle={`${pinnedFormulae.length}`}>
      {pinnedFormulae.map((formula) => (
        <FormulaListItem
          key={`pinned-formula-${formula.name}`}
          id={`pinned-formula-${formula.name}`}
          formula={formula}
          {...pinnedFormulaRowProps}
        />
      ))}
    </List.Section>
  );
  const pinnedCasksSection = pinnedCasks.length > 0 && (
    <List.Section title="Pinned Casks" subtitle={`${pinnedCasks.length}`}>
      {pinnedCasks.map((cask) => (
        <CaskListItem key={`pinned-cask-${cask.token}`} id={`pinned-cask-${cask.token}`} cask={cask} {...rowProps} />
      ))}
    </List.Section>
  );

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
      {pinnedFirst ? (
        <>
          {pinnedFormulaeSection}
          {pinnedCasksSection}
          {formulaeSection}
          {dependenciesSection}
          {casksSection}
        </>
      ) : (
        <>
          {formulaeSection}
          {dependenciesSection}
          {casksSection}
          {pinnedFormulaeSection}
          {pinnedCasksSection}
        </>
      )}
    </List>
  );
}

export function FormulaListItem(props: {
  /** Page navigation, forwarded into the row's action panel. */
  paging?: PagingProps;
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
  /** Passed only by the Dependencies section; drives the "Unused" tag. */
  dependedOn?: ReadonlySet<string>;
}) {
  const formula = props.formula;
  const showMetadataPanel = props.showMetadataPanel ?? false;
  let version = formula.versions.stable;

  const formulaOutdated = brewIsOutdated(formula);
  const installed = brewIsInstalled(formula);
  if (installed) {
    version = brewFormatVersion(formula);
  }

  const uninstallable = installed ? undefined : uninstallableReason(formula, brewHost);

  const icon = installStateIcon(installed, formulaOutdated, uninstallable);
  const accessories: List.Item.Accessory[] = [];
  if (installed && formulaOutdated) {
    accessories.push({ tag: { value: "Outdated", color: UPDATE_AVAILABLE_COLOR } });
  }
  // Guarded on presence, not size: only the Dependencies section passes this,
  // and an empty set is a real answer (a lone dependency nothing depends on),
  // not missing data. Undefined is the "installed data not loaded yet" case.
  if (props.dependedOn !== undefined && isUnusedDependency(formula, props.dependedOn)) {
    accessories.push({
      tag: { value: "Unused", color: STATUS_COLOR.muted },
      tooltip: "Nothing installed depends on this",
    });
  }
  if (uninstallable) {
    accessories.push({ tag: { value: "Can't Install", color: UNINSTALLABLE_COLOR }, tooltip: uninstallable });
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
          paging={props.paging}
        />
      }
    />
  );
}

export function CaskListItem(props: {
  /** Page navigation, forwarded into the row's action panel. */
  paging?: PagingProps;
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

  const uninstallable = installed ? undefined : uninstallableReason(cask, brewHost);

  const icon = installStateIcon(installed, caskOutdated, uninstallable);
  const accessories: List.Item.Accessory[] = [];
  if (installed && caskOutdated) {
    accessories.push({ tag: { value: "Outdated", color: UPDATE_AVAILABLE_COLOR } });
  }
  if (uninstallable) {
    accessories.push({ tag: { value: "Can't Install", color: UNINSTALLABLE_COLOR }, tooltip: uninstallable });
  }
  accessories.push({ text: version });
  pushAccessories(
    accessories,
    props.showInstalledDate ? brewInstalledDate(cask) : undefined,
    cask.installs,
    cask.pinned,
  );

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
          paging={props.paging}
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
 * - **Pin** — shown for any pinned package. Casks have been pinnable since
 *   Homebrew 5.1.12.
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

/**
 * Closes a windowed section: which slice is on screen, and how to move it.
 *
 * The earlier version of this row had an EMPTY title and a dot icon, which read
 * as a broken Load More control. It also wrote its full sentence regardless of
 * width, and with the metadata sidebar open the list column is under half the
 * window — so it clipped to "Showing 100 o… Keep typing to…", which says
 * nothing at all. With the sidebar open it now drops the noun and the hint and
 * keeps the numbers, which are the part that carries the meaning.
 */
function PageFooterItem(props: {
  shown: number;
  total: number;
  kind: "formula" | "cask";
  showMetadataPanel: boolean;
  paging: PagingProps;
}) {
  const { paging } = props;
  const offset = paging.page * paging.pageSize;
  const full = pageRangeSummary(offset, props.shown, props.total, props.kind);
  const compact = pageRangeCompact(offset, props.shown, props.total);
  const position = `Page ${paging.page + 1} of ${paging.totalPages}`;

  return (
    <List.Item
      icon={Icon.Ellipsis}
      title={props.showMetadataPanel ? compact : full}
      subtitle={props.showMetadataPanel ? undefined : position}
      accessories={props.showMetadataPanel ? undefined : [{ text: "↵ Next Page" }]}
      detail={
        props.showMetadataPanel ? (
          <List.Item.Detail
            markdown={`### ${full}\n\n${position}\n\nPress ⏎ for the next page, or keep typing to narrow the results.`}
          />
        ) : undefined
      }
      actions={
        <ActionPanel>
          <PagingSection paging={paging} />
        </ActionPanel>
      }
    />
  );
}
