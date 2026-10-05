import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Grid,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import os from "node:os";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cleanCandidates, freshRetryTargets, type LatestScan } from "./cleanup";
import {
  CandidateDetail,
  CandidateListDetail,
  fileLink,
  iconFor,
  providerIcon,
  riskColor,
  riskLabel,
} from "./components/CandidateDetail";
import { CleanupHistory, CleanupReport } from "./components/CleanupHistory";
import { ExcludedItems } from "./components/ExcludedItems";
import { ProjectRootsForm } from "./components/ProjectRootsForm";
import { isAbortError } from "./lib/async";
import { formatBytes } from "./lib/format";
import { scanAll } from "./providers";
import { emptySelectionTouches, mergeScanSelection, type SelectionTouches } from "./selection";
import { readExcludedItems, readProjectRoots, recordCleanupRun, writeExcludedItems } from "./storage";
import type { CleanupCandidate, ExcludedItem, ProtectedItem, RiskLevel, ScanIssue } from "./types";

function CandidateActions({
  candidate,
  isSelected,
  selectedCount,
  toggle,
  keep,
  manageExcludedItems,
  cleanSelection,
  refresh,
  isLoading,
  cancelScan,
  selectSafe,
  selectLarge,
  clearSelection,
  roots,
  configure,
  isCleaning,
  cancelCleanup,
  cycleSort,
  sortMode,
  viewMode,
  setViewMode,
}: {
  candidate: CleanupCandidate;
  isSelected: boolean;
  selectedCount: number;
  toggle: () => void;
  keep: () => Promise<void>;
  manageExcludedItems: () => void;
  cleanSelection: () => Promise<void>;
  refresh: () => void;
  isLoading: boolean;
  cancelScan: () => void;
  selectSafe: () => void;
  selectLarge: () => void;
  clearSelection: () => void;
  roots: string[];
  configure: (roots: string[]) => void;
  isCleaning: boolean;
  cancelCleanup: () => void;
  cycleSort: () => void;
  sortMode: "size" | "age" | "name";
  viewMode: "list" | "cards";
  setViewMode: (mode: "list" | "cards") => void;
}) {
  return (
    <ActionPanel>
      {isCleaning ? (
        <Action title="Cancel Cleanup" icon={Icon.Stop} onAction={cancelCleanup} />
      ) : (
        <Action
          title={isSelected ? "Unselect Item" : "Select Item"}
          icon={isSelected ? Icon.Circle : Icon.CheckCircle}
          shortcut={isSelected ? { modifiers: ["ctrl"], key: "h" } : { modifiers: ["ctrl"], key: "l" }}
          onAction={toggle}
        />
      )}
      <Action.Push title="View Item Details" icon={Icon.Eye} target={<CandidateDetail candidate={candidate} />} />
      {!isCleaning ? <Action title="Keep Item (Exclude from Cleanup)" icon={Icon.Shield} onAction={keep} /> : null}
      {isLoading ? (
        <Action title="Cancel Scan" icon={Icon.Stop} onAction={cancelScan} />
      ) : !isCleaning && selectedCount > 0 ? (
        <Action
          title="Clean Selected Items"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
          onAction={cleanSelection}
        />
      ) : null}
      {!isCleaning ? (
        <>
          <Action title="Preset: Safe Items" icon={Icon.CheckCircle} onAction={selectSafe} />
          <Action title="Preset: Large Review Items" icon={Icon.HardDrive} onAction={selectLarge} />
          <Action title="Clear Selection" icon={Icon.Circle} onAction={clearSelection} />
          <Action
            title={`Sort by ${sortMode === "size" ? "Age" : sortMode === "age" ? "Name" : "Size"}`}
            icon={Icon.List}
            onAction={cycleSort}
          />
          <Action
            title={viewMode === "list" ? "Show Cards" : "Show List"}
            icon={viewMode === "list" ? Icon.AppWindowGrid3x3 : Icon.List}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            onAction={() => setViewMode(viewMode === "list" ? "cards" : "list")}
          />
        </>
      ) : null}
      {candidate.path ? (
        <>
          <Action.ShowInFinder path={candidate.path} />
          <Action.CopyToClipboard
            title="Copy Path"
            content={candidate.path}
            shortcut={Keyboard.Shortcut.Common.CopyPath}
          />
        </>
      ) : null}
      {!isCleaning ? (
        <Action
          title="Refresh Scan"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={refresh}
        />
      ) : null}
      {!isCleaning ? (
        <Action.Push
          title="Configure Project Roots"
          icon={Icon.Gear}
          target={<ProjectRootsForm initialRoots={roots} onSave={configure} />}
        />
      ) : null}
      <Action.Push title="View Cleanup History" icon={Icon.Clock} target={<CleanupHistory />} />
      <Action title="Manage Kept Items" icon={Icon.Shield} onAction={manageExcludedItems} />
    </ActionPanel>
  );
}

function Dashboard({
  roots,
  setRoots,
  initialExcludedItems,
}: {
  roots: string[];
  setRoots: (roots: string[]) => void;
  initialExcludedItems: ExcludedItem[];
}) {
  const preferences = getPreferenceValues<Preferences>();
  const { push } = useNavigation();
  const homeDirectory = os.homedir();
  const [candidates, setCandidates] = useState<CleanupCandidate[]>([]);
  const [issues, setIssues] = useState<ScanIssue[]>([]);
  const [protectedItems, setProtectedItems] = useState<ProtectedItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectionTouches = useRef<SelectionTouches>(emptySelectionTouches());
  const latestScan = useRef<LatestScan>({ state: "scanning" });
  const [excludedItems, setExcludedItems] = useState(initialExcludedItems);
  const excludedItemsRef = useRef(initialExcludedItems);
  const [isLoading, setIsLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);
  const [riskFilter, setRiskFilter] = useState<"all" | RiskLevel>("all");
  const [sortMode, setSortMode] = useState<"size" | "age" | "name">("size");
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [searchText, setSearchText] = useState("");
  const [scanVersion, setScanVersion] = useState(0);
  const scanController = useRef<AbortController | undefined>(undefined);
  const cleanupController = useRef<AbortController | undefined>(undefined);
  const excludedIds = useMemo(() => new Set(excludedItems.map((item) => item.id)), [excludedItems]);

  const context = useMemo(
    () => ({ homeDirectory, projectRoots: roots, extraPath: preferences.extraPath }),
    [homeDirectory, preferences.extraPath, roots],
  );

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    scanController.current?.abort();
    scanController.current = controller;
    setIsLoading(true);
    setCandidates([]);
    setIssues([]);
    setProtectedItems([]);
    setSelected(new Set());
    selectionTouches.current = emptySelectionTouches();
    latestScan.current = { state: "scanning" };
    scanAll({ ...context, signal: controller.signal }, (partial) => {
      if (!active) return;
      setCandidates(partial.candidates);
      setIssues(partial.issues);
      setProtectedItems(partial.protectedItems ?? []);
    })
      .then((result) => {
        if (!active) return;
        setCandidates(result.candidates);
        setIssues(result.issues);
        setProtectedItems(result.protectedItems ?? []);
        latestScan.current = { state: "complete", candidates: result.candidates };
        const keptIds = new Set(excludedItemsRef.current.map((item) => item.id));
        setSelected((current) => mergeScanSelection(current, result.candidates, keptIds, selectionTouches.current));
      })
      .catch(async (error) => {
        if (active) latestScan.current = { state: "unavailable" };
        if (active && !isAbortError(error))
          await showToast({ style: Toast.Style.Failure, title: "Scan failed", message: (error as Error).message });
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [context, scanVersion]);

  const refresh = useCallback(() => setScanVersion((version) => version + 1), []);
  const cancelScan = useCallback(() => {
    scanController.current?.abort();
    setIsLoading(false);
  }, []);
  const cancelCleanup = useCallback(() => cleanupController.current?.abort(), []);
  const selectedCandidates = candidates.filter(
    (candidate) => selected.has(candidate.id) && !excludedIds.has(candidate.id),
  );

  async function keepCandidate(candidate: CleanupCandidate) {
    if (excludedItemsRef.current.some((item) => item.id === candidate.id)) return;
    const next: ExcludedItem[] = [
      ...excludedItemsRef.current,
      {
        id: candidate.id,
        title: candidate.title,
        subtitle: candidate.subtitle,
        providerId: candidate.providerId,
        path: candidate.path,
        addedAt: new Date().toISOString(),
      },
    ];
    try {
      await writeExcludedItems(next);
      excludedItemsRef.current = next;
      setExcludedItems(next);
      setSelected((current) => new Set([...current].filter((id) => id !== candidate.id)));
      await showToast({ style: Toast.Style.Success, title: "Item kept out of cleanup" });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not keep item", message: (error as Error).message });
    }
  }

  async function allowExcludedItem(id: string): Promise<boolean> {
    const next = excludedItemsRef.current.filter((item) => item.id !== id);
    try {
      await writeExcludedItems(next);
      excludedItemsRef.current = next;
      setExcludedItems(next);
      await showToast({ style: Toast.Style.Success, title: "Item can be selected again" });
      return true;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not update kept items",
        message: (error as Error).message,
      });
      return false;
    }
  }

  function manageExcludedItems() {
    push(<ExcludedItems initialItems={excludedItemsRef.current} onAllow={allowExcludedItem} />);
  }

  async function runCleanup(targets: CleanupCandidate[], notice?: string) {
    if (cleanupController.current) return;
    let savedKeptItems: ExcludedItem[];
    try {
      savedKeptItems = await readExcludedItems();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not verify kept items",
        message: (error as Error).message,
      });
      return;
    }
    const keptIds = new Set([...excludedItemsRef.current, ...savedKeptItems].map((item) => item.id));
    if (targets.some((candidate) => keptIds.has(candidate.id))) {
      await showToast({ style: Toast.Style.Failure, title: "A kept item cannot be cleaned" });
      return;
    }
    if (targets.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No cleanup items selected" });
      return;
    }
    const permanent = targets.filter((candidate) => candidate.cleanupPolicy === "command").length;
    const trashBytes = targets
      .filter((candidate) => candidate.cleanupPolicy === "trash")
      .reduce((sum, candidate) => sum + (candidate.bytes ?? 0), 0);
    const currentFootprint = targets.reduce((sum, candidate) => sum + (candidate.bytes ?? 0), 0);
    const confirmed = await confirmAlert({
      title: `Clean ${targets.length} selected item${targets.length === 1 ? "" : "s"}?`,
      message: `${notice ? `${notice} ` : ""}The known selected footprint is ${formatBytes(currentFootprint)}. ${formatBytes(trashBytes)} will move to Trash and only frees disk space after Trash is emptied. ${permanent} native cleanup command${permanent === 1 ? " is" : "s are"} permanent and will determine its own reclaimable amount.`,
      primaryAction: { title: "Clean Selected", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const controller = new AbortController();
    cleanupController.current = controller;
    setIsCleaning(true);
    const startedAt = new Date();
    const toast = await showToast({ style: Toast.Style.Animated, title: "Cleaning selected items…" });
    try {
      const results = await cleanCandidates(
        targets,
        { ...context, excludedCandidateIds: keptIds, signal: controller.signal },
        (completed, count) => {
          toast.message = `${completed} of ${count}`;
        },
      );
      const failures = results.filter((result) => result.status === "failed");
      const cancelled = results.filter((result) => result.status === "cancelled");
      toast.style = failures.length === 0 && cancelled.length === 0 ? Toast.Style.Success : Toast.Style.Failure;
      toast.title =
        cancelled.length > 0
          ? "Cleanup cancelled"
          : failures.length === 0
            ? "Cleanup completed"
            : "Cleanup completed with failures";
      toast.message =
        failures.length > 0
          ? `${failures.length} failed`
          : cancelled.length > 0
            ? `${cancelled.length} cancelled`
            : undefined;
      const run = await recordCleanupRun(targets, results, startedAt, new Date());
      const failedIds = new Set(failures.map((failure) => failure.candidateId));
      const failedTargets = targets.filter((candidate) => failedIds.has(candidate.id));
      latestScan.current = { state: "scanning" };
      push(
        <CleanupReport run={run} onRetry={failedTargets.length > 0 ? () => retryFailed(failedTargets) : undefined} />,
      );
      refresh();
    } finally {
      cleanupController.current = undefined;
      setIsCleaning(false);
    }
  }

  async function retryFailed(failedTargets: CleanupCandidate[]) {
    const retry = freshRetryTargets(failedTargets, latestScan.current);
    if (retry.status === "scanning") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Scan still refreshing",
        message: "Retry after the scan finishes so changed items are revalidated",
      });
      return;
    }
    if (retry.status === "unavailable") {
      refresh();
      await showToast({
        style: Toast.Style.Success,
        title: "Scan restarted",
        message: "Retry after the scan finishes so changed items are revalidated",
      });
      return;
    }
    const missingTitles = retry.missing.map((candidate) => candidate.title).join(", ");
    if (retry.status === "missing") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed items no longer found in the latest scan",
        message: missingTitles,
      });
      return;
    }
    const skipped = retry.missing.length;
    await runCleanup(
      retry.candidates,
      skipped > 0
        ? `${skipped} failed item${skipped === 1 ? " is" : "s are"} no longer in the latest scan and will be skipped: ${missingTitles}.`
        : undefined,
    );
  }

  async function cleanSelection() {
    await runCleanup(selectedCandidates);
  }

  const sections = useMemo(() => {
    const grouped = new Map<string, CleanupCandidate[]>();
    const visibleCandidates = candidates
      .filter((candidate) => !excludedIds.has(candidate.id) && (riskFilter === "all" || candidate.risk === riskFilter))
      .sort((left, right) => {
        if (sortMode === "name") return left.title.localeCompare(right.title);
        if (sortMode === "age")
          return (left.modifiedAt?.getTime() ?? Infinity) - (right.modifiedAt?.getTime() ?? Infinity);
        return (right.bytes ?? -1) - (left.bytes ?? -1);
      });
    for (const candidate of visibleCandidates) {
      grouped.set(candidate.section, [...(grouped.get(candidate.section) ?? []), candidate]);
    }
    return grouped;
  }, [candidates, excludedIds, riskFilter, sortMode]);

  function toggle(id: string) {
    selectionTouches.current.ids.add(id);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectSafe = useCallback(() => {
    selectionTouches.current.all = true;
    setSelected(
      new Set(
        candidates
          .filter((candidate) => candidate.risk === "safe" && !excludedIds.has(candidate.id))
          .map((candidate) => candidate.id),
      ),
    );
  }, [candidates, excludedIds]);
  const clearSelection = useCallback(() => {
    selectionTouches.current.all = true;
    setSelected(new Set());
  }, []);
  const selectLarge = useCallback(() => {
    selectionTouches.current.all = true;
    setSelected(
      new Set(
        candidates
          .filter(
            (candidate) =>
              !excludedIds.has(candidate.id) && candidate.risk !== "high" && (candidate.bytes ?? 0) >= 1024 ** 3,
          )
          .map((candidate) => candidate.id),
      ),
    );
  }, [candidates, excludedIds]);
  const cycleSort = useCallback(
    () => setSortMode((current) => (current === "size" ? "age" : current === "age" ? "name" : "size")),
    [],
  );

  const selectedBytes = selectedCandidates.reduce((sum, candidate) => sum + (candidate.bytes ?? 0), 0);
  const knownFootprint = selectedCandidates.some((candidate) => candidate.bytes !== undefined)
    ? formatBytes(selectedBytes)
    : "Size unavailable";
  const navigationTitle = selected.size ? `${selected.size} selected · ${knownFootprint}` : "Developer Cleaner";
  const availableCandidateCount = candidates.filter((candidate) => !excludedIds.has(candidate.id)).length;
  const emptyTitle = isLoading
    ? "Scanning developer data…"
    : candidates.length > 0 && availableCandidateCount === 0
      ? "All discovered items are kept"
      : availableCandidateCount > 0
        ? "No matching items"
        : "Nothing to clean";
  const emptyDescription =
    candidates.length > 0 && availableCandidateCount === 0
      ? "Manage kept items to allow any of them back into cleanup."
      : availableCandidateCount > 0
        ? "Try another search or risk filter."
        : issues.length > 0
          ? issues.map((issue) => issue.message).join("\n")
          : "Refresh the scan or configure another project root.";
  const manageExcludedAction = <Action title="Manage Kept Items" icon={Icon.Shield} onAction={manageExcludedItems} />;
  const viewAction = (
    <Action
      title={viewMode === "list" ? "Show Cards" : "Show List"}
      icon={viewMode === "list" ? Icon.AppWindowGrid3x3 : Icon.List}
      shortcut={{ modifiers: ["cmd"], key: "l" }}
      onAction={() => setViewMode(viewMode === "list" ? "cards" : "list")}
    />
  );
  const emptyActions = (
    <ActionPanel>
      {isCleaning ? (
        <Action title="Cancel Cleanup" icon={Icon.Stop} onAction={cancelCleanup} />
      ) : (
        <Action title="Refresh Scan" icon={Icon.ArrowClockwise} onAction={refresh} />
      )}
      {viewAction}
      {manageExcludedAction}
      {isLoading && !isCleaning ? <Action title="Cancel Scan" icon={Icon.Stop} onAction={cancelScan} /> : null}
      {!isCleaning ? (
        <Action.Push
          title="Configure Project Roots"
          icon={Icon.Gear}
          target={<ProjectRootsForm initialRoots={roots} onSave={setRoots} />}
        />
      ) : null}
      <Action.Push title="View Cleanup History" icon={Icon.Clock} target={<CleanupHistory />} />
    </ActionPanel>
  );
  const candidateActions = (candidate: CleanupCandidate) => (
    <CandidateActions
      candidate={candidate}
      isSelected={selected.has(candidate.id)}
      selectedCount={selected.size}
      toggle={() => toggle(candidate.id)}
      keep={() => keepCandidate(candidate)}
      manageExcludedItems={manageExcludedItems}
      cleanSelection={cleanSelection}
      refresh={refresh}
      isLoading={isLoading}
      cancelScan={cancelScan}
      selectSafe={selectSafe}
      selectLarge={selectLarge}
      clearSelection={clearSelection}
      roots={roots}
      configure={setRoots}
      isCleaning={isCleaning}
      cancelCleanup={cancelCleanup}
      cycleSort={cycleSort}
      sortMode={sortMode}
      viewMode={viewMode}
      setViewMode={setViewMode}
    />
  );

  if (viewMode === "cards") {
    return (
      <Grid
        isLoading={isLoading || isCleaning}
        navigationTitle={navigationTitle}
        columns={5}
        inset={Grid.Inset.Medium}
        filtering={true}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Search cleanup candidates"
        searchBarAccessory={
          <Grid.Dropdown
            tooltip="Filter by risk"
            value={riskFilter}
            onChange={(value) => setRiskFilter(value as "all" | RiskLevel)}
          >
            <Grid.Dropdown.Item title="All Risk Levels" value="all" />
            <Grid.Dropdown.Item title="Safe" value="safe" />
            <Grid.Dropdown.Item title="Review" value="review" />
            <Grid.Dropdown.Item title="High Risk" value="high" />
          </Grid.Dropdown>
        }
      >
        <Grid.EmptyView
          icon={Icon.HardDrive}
          title={emptyTitle}
          description={emptyDescription}
          actions={emptyActions}
        />
        {[...sections].map(([section, items]) => (
          <Grid.Section key={section} title={section} subtitle={String(items.length)}>
            {items.map((candidate) => (
              <Grid.Item
                key={candidate.id}
                id={candidate.id}
                title={candidate.title}
                subtitle={`${formatBytes(candidate.bytes)} · ${riskLabel(candidate.risk)}`}
                content={iconFor(candidate)}
                keywords={[candidate.providerId, candidate.subtitle, riskLabel(candidate.risk)]}
                accessory={
                  selected.has(candidate.id) ? { icon: Icon.CheckCircle, tooltip: "Selected for cleanup" } : undefined
                }
                actions={candidateActions(candidate)}
              />
            ))}
          </Grid.Section>
        ))}
        {issues.length > 0 ? (
          <Grid.Section title="Scan Warnings" subtitle={String(issues.length)}>
            {issues.map((issue, index) => (
              <Grid.Item
                key={`${issue.providerId}:${index}`}
                title={issue.providerId}
                subtitle={issue.message}
                content={{ source: Icon.Warning, tintColor: Color.Orange }}
                actions={
                  <ActionPanel>
                    {viewAction}
                    {manageExcludedAction}
                  </ActionPanel>
                }
              />
            ))}
          </Grid.Section>
        ) : null}
        {protectedItems.length > 0 ? (
          <Grid.Section title="Protected Runtimes" subtitle={String(protectedItems.length)}>
            {protectedItems.map((item) => (
              <Grid.Item
                key={item.id}
                title={item.title}
                subtitle={item.reason}
                content={providerIcon(item.providerId, { source: Icon.Shield, tintColor: Color.Green })}
                actions={
                  <ActionPanel>
                    {item.path ? <Action.ShowInFinder path={item.path} /> : null}
                    {viewAction}
                    {manageExcludedAction}
                  </ActionPanel>
                }
              />
            ))}
          </Grid.Section>
        ) : null}
      </Grid>
    );
  }

  return (
    <List
      isLoading={isLoading || isCleaning}
      isShowingDetail
      navigationTitle={navigationTitle}
      filtering={true}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search cleanup candidates"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by risk"
          value={riskFilter}
          onChange={(value) => setRiskFilter(value as "all" | RiskLevel)}
        >
          <List.Dropdown.Item title="All Risk Levels" value="all" />
          <List.Dropdown.Item title="Safe" value="safe" />
          <List.Dropdown.Item title="Review" value="review" />
          <List.Dropdown.Item title="High Risk" value="high" />
        </List.Dropdown>
      }
    >
      <List.EmptyView icon={Icon.HardDrive} title={emptyTitle} description={emptyDescription} actions={emptyActions} />
      {[...sections].map(([section, items]) => (
        <List.Section key={section} title={section} subtitle={String(items.length)}>
          {items.map((candidate) => {
            const isSelected = selected.has(candidate.id);
            return (
              <List.Item
                key={candidate.id}
                id={candidate.id}
                title={candidate.title}
                icon={iconFor(candidate)}
                keywords={[candidate.providerId, candidate.subtitle, riskLabel(candidate.risk)]}
                accessories={[
                  {
                    icon: candidate.cleanupPolicy === "command" ? Icon.Terminal : Icon.Trash,
                    tooltip: candidate.cleanupPolicy === "command" ? "Native cleanup command" : "Moves to Trash",
                  },
                  {
                    icon: { source: Icon.CircleFilled, tintColor: riskColor(candidate.risk) },
                    tooltip: `${riskLabel(candidate.risk)} · ${formatBytes(candidate.bytes)}`,
                  },
                  {
                    icon: isSelected ? { source: Icon.CheckCircle, tintColor: Color.Blue } : Icon.Circle,
                    tooltip: isSelected ? "Selected" : "Not selected",
                  },
                ]}
                detail={<CandidateListDetail candidate={candidate} isSelected={isSelected} />}
                actions={candidateActions(candidate)}
              />
            );
          })}
        </List.Section>
      ))}
      {issues.length > 0 ? (
        <List.Section title="Scan Warnings" subtitle={String(issues.length)}>
          {issues.map((issue, index) => (
            <List.Item
              key={`${issue.providerId}:${index}`}
              title={issue.providerId}
              keywords={[issue.message]}
              icon={{ source: Icon.Warning, tintColor: Color.Orange }}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Provider" text={issue.providerId} />
                      <List.Item.Detail.Metadata.Label title="Message" text={issue.message} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  {viewAction}
                  {manageExcludedAction}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
      {protectedItems.length > 0 ? (
        <List.Section title="Protected Runtimes" subtitle={String(protectedItems.length)}>
          {protectedItems.map((item) => (
            <List.Item
              key={item.id}
              title={item.title}
              keywords={[item.providerId, item.reason]}
              icon={providerIcon(item.providerId, { source: Icon.Shield, tintColor: Color.Green })}
              accessories={[{ icon: Icon.Lock, tooltip: "Protected from cleanup" }]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Reason" text={item.reason} />
                      <List.Item.Detail.Metadata.TagList title="Source">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={item.providerId}
                          icon={providerIcon(item.providerId, Icon.Box)}
                          color={Color.Green}
                        />
                      </List.Item.Detail.Metadata.TagList>
                      {item.path ? (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Link
                            title="Location"
                            text="Show in Finder"
                            target={fileLink(item.path)}
                          />
                        </>
                      ) : null}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                item.path ? (
                  <ActionPanel>
                    <Action.ShowInFinder path={item.path} />
                    {viewAction}
                    {manageExcludedAction}
                  </ActionPanel>
                ) : (
                  <ActionPanel>
                    {viewAction}
                    {manageExcludedAction}
                  </ActionPanel>
                )
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

class LoadFailure extends Error {
  constructor(
    readonly source: "roots" | "kept",
    cause: unknown,
  ) {
    super(cause instanceof Error ? cause.message : String(cause), { cause });
  }
}

function failLoading(source: LoadFailure["source"]): (error: unknown) => never {
  return (error) => {
    throw new LoadFailure(source, error);
  };
}

export default function Command() {
  const [roots, setRoots] = useState<string[] | undefined>();
  const [initialExcludedItems, setInitialExcludedItems] = useState<ExcludedItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<LoadFailure>();
  const [loadVersion, setLoadVersion] = useState(0);
  const reload = useCallback(() => setLoadVersion((version) => version + 1), []);

  useEffect(() => {
    let active = true;
    setIsReady(false);
    setLoadError(undefined);
    Promise.all([readProjectRoots().catch(failLoading("roots")), readExcludedItems().catch(failLoading("kept"))])
      .then(([storedRoots, storedExcludedItems]) => {
        if (!active) return;
        setRoots(storedRoots);
        setInitialExcludedItems(storedExcludedItems);
      })
      .catch((error) => {
        if (active) setLoadError(error instanceof LoadFailure ? error : new LoadFailure("kept", error));
      })
      .finally(() => {
        if (active) setIsReady(true);
      });
    return () => {
      active = false;
    };
  }, [loadVersion]);

  if (!isReady) return <List isLoading />;
  if (loadError)
    return (
      <List>
        <List.EmptyView
          icon={loadError.source === "roots" ? Icon.Folder : Icon.Shield}
          title={loadError.source === "roots" ? "Project Roots Unavailable" : "Kept Items Unavailable"}
          description={
            loadError.source === "roots"
              ? `${loadError.message}. Retry loading, or reset them to choose project directories again.`
              : `${loadError.message}. Cleanup is paused until these items can be loaded.`
          }
          actions={
            <ActionPanel>
              <Action title="Retry Loading" icon={Icon.ArrowClockwise} onAction={reload} />
              {loadError.source === "roots" ? (
                <Action.Push
                  title="Reset Project Roots"
                  icon={Icon.Folder}
                  target={<ProjectRootsForm onSave={reload} />}
                />
              ) : null}
            </ActionPanel>
          }
        />
      </List>
    );
  if (!roots) return <ProjectRootsForm onSave={setRoots} />;
  return <Dashboard roots={roots} setRoots={setRoots} initialExcludedItems={initialExcludedItems} />;
}
