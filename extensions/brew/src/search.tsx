/**
 * Search command for browsing and searching brew packages.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Action, ActionPanel, getPreferenceValues, Icon, LaunchProps, List, showToast, Toast } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useBrewInstalled } from "./hooks/useBrewInstalled";
import { useBrewSearch, isInstalled } from "./hooks/useBrewSearch";
import { usePopularityRanks } from "./hooks/usePopularityRanks";
import { InstallableFilterDropdown, InstallableFilterType, placeholder } from "./components/filter";
import { FormulaList } from "./components/list";
import { InstallFromTapAction } from "./components/actions";
import { ToggleSidebarAction } from "./components/actionPanels";
import { STATUS_COLOR, UP_TO_DATE_ICON } from "./components/palette";
import {
  brewIdentifier,
  brewIsTapped,
  closestPackages,
  getErrorMessage,
  installTargetFor,
  packageNameOf,
  parseTapName,
  searchLogger,
  tapOwner,
} from "./utils";
import { useTapPreflight } from "./hooks/useTapPreflight";
import { PAGE_SIZE, clampPage, pageCount, visibleTotal } from "./utils/paging";

/**
 * Format a number with commas (e.g., 8081 -> "8,081")
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * The sidebar for a third-party tap row in Search. The package is not in the
 * search index, so there is no record to show yet: say where it comes from
 * and who stands behind it, which is what the install confirmation asks about.
 */
function tapRowDetail(tap: string, name: string, note?: string) {
  const owner = tapOwner(tap);
  return (
    <List.Item.Detail
      markdown={[note, `**${name}** comes from **${tap}**, maintained by ${owner}, not Homebrew.`]
        .filter(Boolean)
        .join("\n\n")}
    />
  );
}

export default function SearchView(props: LaunchProps<{ arguments: Arguments.Search }>) {
  const [searchText, setSearchText] = useState(props.arguments.search ?? "");
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState(InstallableFilterType.all);
  const [sortByPopularity, setSortByPopularity] = useCachedState("sort-by-popularity", false);
  const [showDescription, setShowDescription] = useCachedState("show-description", true);
  const { showMetadataPanel } = getPreferenceValues<Preferences.Search>();
  // The preference is the default. The action's choice is remembered with the
  // preference it overrode, and a changed preference discards it.
  const [sidebar, setSidebar] = useCachedState("show-sidebar-search", {
    preference: showMetadataPanel,
    show: showMetadataPanel,
  });
  const showDetails = sidebar.preference === showMetadataPanel ? sidebar.show : showMetadataPanel;
  useEffect(() => {
    // Drop a choice made under a different preference, or returning to that
    // preference would bring it back.
    if (sidebar.preference !== showMetadataPanel)
      setSidebar({ preference: showMetadataPanel, show: showMetadataPanel });
  }, [sidebar.preference, showMetadataPanel]);

  // Install rankings for the whole index, loaded only when the sort is on.
  const {
    isLoading: isLoadingRanks,
    data: ranks,
    revalidate: revalidateRanks,
    version: ranksVersion,
  } = usePopularityRanks(sortByPopularity);

  // The toggle is on well before the ~3MB download lands. Until it does, the
  // list is still relevance-ordered, so only the *applied* state may describe
  // the ordering — the action title still reflects the toggle, since that is
  // what pressing it does next.
  const sortApplied = sortByPopularity && ranks != undefined;

  const { isLoading: isLoadingInstalled, data: installed, revalidate: revalidateInstalled } = useBrewInstalled();

  // useBrewSearch automatically applies installed status via useMemo
  // whenever either search results or installed data changes
  const {
    isLoading: isLoadingSearch,
    hasCacheFiles,
    loadingState,
    data: results,
    indexTotals,
    downloadProgressRef,
  } = useBrewSearch({
    searchText,
    limit: PAGE_SIZE,
    // The RAW page, deliberately: `currentPage` below is clamped against totals
    // that only exist once this fetch returns, so it cannot feed the fetch that
    // produces them. The clamp is reconciled back into state by the effect
    // below instead.
    offset: page * PAGE_SIZE,
    installed,
    ranks: sortByPopularity ? ranks : undefined,
    ranksVersion,
    onCacheCleared: revalidateRanks,
  });

  const formulae = filter != InstallableFilterType.casks ? (results?.formulae ?? []) : [];
  const casks = filter != InstallableFilterType.formulae ? (results?.casks ?? []) : [];

  const pagedTotal = visibleTotal(results?.totals, {
    formulae: filter != InstallableFilterType.casks,
    casks: filter != InstallableFilterType.formulae,
  });
  const totalPages = pageCount(pagedTotal);
  // Clamped on read as well as on write: narrowing the filter can strand the
  // current page past the end while the previous totals are still on screen.
  const currentPage = clampPage(page, pagedTotal);

  // Reconcile a page index that the arriving totals say is out of range. The
  // fetch above used the raw `page`, so without this the window sits past the
  // end of the results — an empty list, with both sections absent and therefore
  // no footer and no row whose panel carries Previous Page. That is a dead end
  // the user cannot leave except by retyping the query.
  //
  // Guarded on `totals` being present: absent totals mean "not known yet", and
  // clamping against them would reset the page on every transient.
  useEffect(() => {
    if (results?.totals && currentPage !== page) {
      setPage(currentPage);
    }
  }, [results?.totals, currentPage, page]);

  const goToPage = useCallback(
    (next: number) => {
      setPage(clampPage(next, pagedTotal));
    },
    [pagedTotal],
  );

  const paging =
    totalPages > 1
      ? {
          page: currentPage,
          totalPages,
          pageSize: PAGE_SIZE,
          goToPage,
        }
      : undefined;

  // Memoize isInstalled callback to avoid creating a new function every render
  const isInstalledCallback = useCallback((name: string) => isInstalled(name, installed), [installed]);

  // A pasted qualified name (`user/repo/name`, or a whole install-page line)
  // names a package the search index cannot have: it covers homebrew/core and
  // homebrew/cask only. Offer it as one row above the results.
  const tapTarget = useMemo(() => {
    const target = parseTapName(searchText);
    return target?.package ? { ...target, package: target.package } : undefined;
  }, [searchText]);
  /** `cask` undefined: either kind, as an unflagged pasted name may be either. */
  const installedFromTap = (tap: string, fullName: string, cask?: boolean) =>
    installed !== undefined &&
    [...(cask === true ? [] : installed.formulae.values()), ...(cask === false ? [] : installed.casks.values())].some(
      (item) => item.tap === tap && brewIdentifier(item) === fullName,
    );
  const tapPackageInstalled =
    tapTarget !== undefined && installedFromTap(tapTarget.tap, tapTarget.package, tapTarget.cask || undefined);
  // An added tap is read where it is, by brew: its remote may not be the
  // GitHub repository the check would read, so the check is for taps not yet added.
  // The answer names its tap: `usePromise` keeps the last data while the next
  // tap is asked about, and one tap's answer must never stand for another's.
  // Asked as the user types, so a superseded `tap-info` is canceled, and a
  // failure (a brew lock, say) is logged rather than toasted: without an answer
  // the row simply skips the check, as it does for an added tap.
  const tapStatusAbortable = useRef<AbortController>(null);
  const { data: tapStatus } = usePromise(
    async (tap: string) => ({ tap, added: await brewIsTapped(tap, tapStatusAbortable.current?.signal) }),
    [tapTarget?.tap ?? ""],
    {
      execute: tapTarget !== undefined && !tapPackageInstalled,
      abortable: tapStatusAbortable,
      onError: (err) => searchLogger.warn("Couldn't tell whether the tap is added", { error: getErrorMessage(err) }),
    },
  );
  const tapNotAdded = tapStatus !== undefined && tapStatus.tap === tapTarget?.tap && !tapStatus.added;
  const tapName = tapTarget && packageNameOf(tapTarget);
  // Is that package really in that tap? Checked with a git read before the tap
  // is added, so a typo offers the tap's real packages instead of failing after
  // the tap is added. Any other answer keeps the single row. An installed
  // package needs no check: its tap is already added.
  const { preflight: tapPreflight } = useTapPreflight(
    tapPackageInstalled || !tapNotAdded ? undefined : tapTarget,
    searchText,
  );
  const toggleSidebar = () => setSidebar({ preference: showMetadataPanel, show: !showDetails });
  const viewSection = (
    <ActionPanel.Section title="View">
      <ToggleSidebarAction showing={showDetails} onToggleSidebar={toggleSidebar} />
    </ActionPanel.Section>
  );
  const missing =
    typeof tapPreflight === "object" && tapPreflight.kind === "missing-package" ? tapPreflight : undefined;
  const suggestions = useMemo(() => (missing ? closestPackages(missing.contents, missing.package) : []), [missing]);

  // Track toast reference for updating progress
  const initToastRef = useRef<Toast | null>(null);
  const isCreatingToastRef = useRef(false);
  const hasShownCompletionToast = useRef(false);
  // Track max progress seen to avoid jumps backwards
  const maxCasksPercentRef = useRef(0);
  const maxFormulaePercentRef = useRef(0);

  const phase = loadingState.phase;

  // Show initializing toast on cold start (no cache files)
  useEffect(() => {
    // Only show on cold start when we're still loading
    // Once completion toast has been shown, never show init toast again
    if (hasCacheFiles !== false || phase === "complete" || hasShownCompletionToast.current) {
      // Hide toast if it exists and we're done
      if (initToastRef.current) {
        initToastRef.current.hide();
        initToastRef.current = null;
      }
      // Reset max progress tracking for next cold start
      if (phase === "complete") {
        maxCasksPercentRef.current = 0;
        maxFormulaePercentRef.current = 0;
      }
      return;
    }

    if (!initToastRef.current && !isCreatingToastRef.current) {
      // Create the toast (prevent duplicate creation while promise is pending)
      isCreatingToastRef.current = true;
      showToast({
        style: Toast.Style.Animated,
        title: "Initializing...",
      }).then((toast) => {
        initToastRef.current = toast;
        isCreatingToastRef.current = false;
      });
    }

    // Poll progress ref to update toast without triggering re-renders
    const interval = setInterval(() => {
      if (!initToastRef.current) return;

      const progress = downloadProgressRef.current;
      const casksPercent = progress.casksProgress?.percent ?? 0;
      const formulaePercent = progress.formulaeProgress?.percent ?? 0;

      maxCasksPercentRef.current = Math.max(maxCasksPercentRef.current, Math.max(0, Math.min(100, casksPercent)));
      maxFormulaePercentRef.current = Math.max(
        maxFormulaePercentRef.current,
        Math.max(0, Math.min(100, formulaePercent)),
      );

      const combinedPercent = Math.round((maxCasksPercentRef.current + maxFormulaePercentRef.current) / 2);
      initToastRef.current.message = combinedPercent > 0 ? `${combinedPercent}%` : undefined;
    }, 250);

    return () => clearInterval(interval);
  }, [hasCacheFiles, phase]);

  // Show completion toast only on cold start when fully complete
  useEffect(() => {
    if (phase === "complete" && !hasShownCompletionToast.current && results && hasCacheFiles === false) {
      hasShownCompletionToast.current = true;
      const totalFormulae = indexTotals?.formulae || 0;
      const totalCasks = indexTotals?.casks || 0;
      showToast({
        style: Toast.Style.Success,
        title: "Package Index Ready",
        message: `${formatNumber(totalFormulae)} formulae and ${formatNumber(totalCasks)} casks loaded`,
      });
    }
  }, [phase, results, indexTotals, hasCacheFiles]);

  return (
    <FormulaList
      leadingSection={
        tapTarget && missing ? (
          <List.Section title={`${tapTarget.tap} Has No ${missing.package}`}>
            {suggestions.map((item) => {
              const isInstalled = installedFromTap(tapTarget.tap, `${tapTarget.tap}/${item.name}`, item.cask);
              return (
                <List.Item
                  key={`${item.cask ? "cask" : "formula"}:${item.name}`}
                  id={`install-from-tap:${item.cask ? "cask" : "formula"}:${item.name}`}
                  title={item.name}
                  subtitle={showDetails ? undefined : `${item.cask ? "cask " : ""}from ${tapTarget.tap}`}
                  detail={tapRowDetail(
                    tapTarget.tap,
                    item.name,
                    `**${tapTarget.tap}** has no package named **${missing.package}**.`,
                  )}
                  icon={isInstalled ? UP_TO_DATE_ICON : Icon.Plus}
                  // Kept beside the sidebar on purpose: the row is a package
                  // name and one short tag, so nothing truncates (Chris, 2026-11-14).
                  accessories={isInstalled ? [{ tag: { value: "Installed", color: STATUS_COLOR.ok } }] : undefined}
                  actions={
                    <ActionPanel>
                      {!isInstalled && (
                        <InstallFromTapAction
                          target={installTargetFor(tapTarget, item.name, item.cask)}
                          onAction={() => revalidateInstalled()}
                        />
                      )}
                      {viewSection}
                    </ActionPanel>
                  }
                />
              );
            })}
            {suggestions.length === 0 && (
              // A tap that only adds brew commands has nothing to suggest.
              <List.Item
                id="install-from-tap:none"
                title="No formulae or casks"
                subtitle={showDetails ? undefined : `${tapTarget.tap} only adds brew commands`}
                detail={tapRowDetail(
                  tapTarget.tap,
                  missing.package,
                  `**${tapTarget.tap}** has no package named **${missing.package}**, and no formulae or casks at all.`,
                )}
                icon={Icon.Terminal}
                actions={<ActionPanel>{viewSection}</ActionPanel>}
              />
            )}
          </List.Section>
        ) : (
          tapTarget && (
            <List.Section title="Third-Party Tap">
              <List.Item
                id="install-from-tap"
                title={tapName ?? tapTarget.package}
                subtitle={showDetails ? undefined : `from ${tapTarget.tap}`}
                detail={tapRowDetail(tapTarget.tap, tapName ?? tapTarget.package)}
                icon={tapPackageInstalled ? UP_TO_DATE_ICON : Icon.Plus}
                accessories={
                  tapPackageInstalled ? [{ tag: { value: "Installed", color: STATUS_COLOR.ok } }] : undefined
                }
                actions={
                  <ActionPanel>
                    {!tapPackageInstalled && (
                      <InstallFromTapAction target={tapTarget} onAction={() => revalidateInstalled()} />
                    )}
                    <Action.CopyToClipboard title="Copy Package Name" content={tapTarget.package} />
                    {viewSection}
                  </ActionPanel>
                }
              />
            </List.Section>
          )
        )
      }
      formulae={formulae}
      casks={casks}
      searchText={searchText}
      searchBarPlaceholder={placeholder(filter, sortApplied)}
      searchBarAccessory={
        <InstallableFilterDropdown
          onSelect={(next) => {
            // Page 86 of Formulae is not page 86 of Casks. Narrowing the filter
            // changes which totals apply, so the page index stops meaning
            // anything — start the new selection at its first page.
            setFilter(next);
            setPage(0);
          }}
        />
      }
      isLoading={(isLoadingInstalled && !installed) || isLoadingSearch || isLoadingRanks}
      onSearchTextChange={(next) => {
        const trimmed = next.trim();
        if (trimmed === searchText) {
          return;
        }
        // Page 12 of the old query means nothing for the new one, and both
        // updates must land in the same commit or the hook fetches a window
        // into results that no longer exist.
        setSearchText(trimmed);
        setPage(0);
      }}
      filtering={false}
      isInstalled={isInstalledCallback}
      onAction={() => revalidateInstalled()}
      dataFetched={loadingState.phase === "complete"}
      showMetadataPanel={showDetails}
      onToggleSidebar={toggleSidebar}
      showDescription={showDescription}
      onToggleDescription={() => setShowDescription((current) => !current)}
      sortByPopularity={sortByPopularity}
      onToggleSort={() => {
        setSortByPopularity((current) => !current);
        setPage(0);
      }}
      totals={results?.totals}
      paging={paging}
    />
  );
}
