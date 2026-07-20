/**
 * Shared list scaffolding for Search / Installed / Upgradable: index wiring,
 * operation gate, selection + details (with prefetch ring), duplicate-name
 * version display, empty states with actions, and the operating-row section.
 *
 * Performance contract: sections are derived from [index, searchText] ONLY —
 * the per-second gate tick must never re-rank the 13k-row catalog (and the
 * details cache filling in must not reorder the list under the user). The
 * operating-row pull is a separate cheap pass keyed on a primitive.
 */

import { useMemo, useState } from "react";

import { Action, ActionPanel, Icon, List } from "@raycast/api";

import { type PackageIndex } from "../core/index-store";
import { type OperationGate, type PackageTarget } from "../core/operations";
import { useDetails } from "../hooks/useDetails";
import { useIndex, type UseIndexOptions } from "../hooks/useIndex";
import { useOperation } from "../hooks/useOperation";
import { buildLookups, duplicateNameSet, makeItemId, type IndexLookups, type PackageInfo } from "../utils/packages";

import { PackageActions, type ViewKind } from "./PackageActions";
import { PackageListItem, toDetailTarget } from "./PackageListItem";

interface ListSection {
  id: string;
  title?: string;
  subtitle?: string;
  rows: PackageInfo[];
}

interface EmptyState {
  title: string;
  description?: string;
  icon: Icon;
}

interface PackageListViewProps {
  viewKind: ViewKind;
  searchBarPlaceholder: string;
  indexOptions?: UseIndexOptions;
  /** Derive the visible sections from the index. */
  buildSections: (index: PackageIndex, lookups: IndexLookups, searchText: string) => ListSection[];
  emptyState: (hasIndex: boolean, searchText: string) => EmptyState;
  /** Bulk targets offered in the action panel. */
  bulkTargets?: (
    index: PackageIndex,
    lookups: IndexLookups,
  ) => {
    upgradeAllTargets?: PackageTarget[];
    uninstallAllTargets?: PackageTarget[];
  };
  /** Pull the row an operation is working on into its own top section. */
  pullOperatingRow?: boolean;
}

/** Stable primitive key for the row an operation is currently working on. */
function operatingKeyOf(gate: OperationGate): string | null {
  if (gate.status !== "busy" || !gate.opState?.target) {
    return null;
  }
  return makeItemId(gate.opState.target);
}

function PackageListView({
  viewKind,
  searchBarPlaceholder,
  indexOptions,
  buildSections,
  emptyState,
  bulkTargets,
  pullOperatingRow,
}: PackageListViewProps) {
  const { index, isLoading, isRefreshing, wingetAvailable, updateIndex } = useIndex(indexOptions);
  const { gate, launchDetached, runInline, cancelActive } = useOperation();
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const lookups = useMemo(() => (index ? buildLookups(index) : null), [index]);

  // Heavy derivation: independent of the operation gate by contract.
  const baseSections = useMemo(() => {
    if (!index || !lookups) {
      return [];
    }
    return buildSections(index, lookups, searchText).filter((section) => section.rows.length > 0);
  }, [index, lookups, searchText, buildSections]);

  // Cheap pass: keyed on a primitive so it runs only when the target changes.
  const operatingKey = pullOperatingRow ? operatingKeyOf(gate) : null;
  const sections = useMemo(() => {
    if (!operatingKey) {
      return baseSections;
    }
    for (const section of baseSections) {
      const operating = section.rows.find((row) => makeItemId(row) === operatingKey);
      if (operating) {
        return [
          { id: "operating", title: "Working On", rows: [operating] },
          ...baseSections.map((s) => ({
            ...s,
            rows: s.rows.filter((row) => makeItemId(row) !== operatingKey),
          })),
        ].filter((section) => section.rows.length > 0);
      }
    }
    return baseSections;
  }, [baseSections, operatingKey]);

  const allRows = useMemo(() => sections.flatMap((section) => section.rows), [sections]);
  const duplicateNames = useMemo(() => duplicateNameSet(allRows), [allRows]);

  // List.Item ids must be unique: same (source,id) can appear twice when two
  // versions are installed side by side. Disambiguate ONLY those — including
  // the version in every id would reset selection after each upgrade.
  const itemIds = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of allRows) {
      const key = makeItemId(row);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const ids = new Map<PackageInfo, string>();
    for (const row of allRows) {
      const key = makeItemId(row);
      ids.set(row, (counts.get(key) ?? 1) > 1 ? `${key}|${row.installedVersion ?? row.version}` : key);
    }
    return ids;
  }, [allRows]);

  const selectedPkg = useMemo(
    () => (selectedId ? allRows.find((row) => itemIds.get(row) === selectedId) : undefined),
    [selectedId, allRows, itemIds],
  );

  const neighbors = useMemo(() => {
    if (!selectedPkg) {
      return [];
    }
    const idx = allRows.indexOf(selectedPkg);
    const ring = [];
    for (let offset = 1; offset <= 5; offset++) {
      if (allRows[idx + offset]) ring.push(toDetailTarget(allRows[idx + offset]!));
      if (allRows[idx - offset]) ring.push(toDetailTarget(allRows[idx - offset]!));
    }
    return ring;
  }, [selectedPkg, allRows]);

  const { details, isLoading: detailsLoading } = useDetails(
    selectedPkg ? toDetailTarget(selectedPkg) : undefined,
    neighbors,
  );

  const bulk = useMemo(
    () => (index && lookups && bulkTargets ? bulkTargets(index, lookups) : {}),
    [index, lookups, bulkTargets],
  );

  const hasIndex = !!index && index.packages.length + index.installed.length > 0;
  const empty = emptyState(hasIndex, searchText);

  if (wingetAvailable === false) {
    return (
      <List>
        <List.EmptyView
          title="WinGet Not Found"
          description="Install 'App Installer' from the Microsoft Store, then restart Raycast"
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action.Open
                title="Open Microsoft Store"
                icon={Icon.Store}
                target="ms-windows-store://pdp/?ProductId=9NBLGGH4NNS1"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading || isRefreshing}
      searchBarPlaceholder={searchBarPlaceholder}
      onSearchTextChange={setSearchText}
      isShowingDetail={allRows.length > 0}
      onSelectionChange={setSelectedId}
    >
      {allRows.length === 0 && (
        <List.EmptyView
          title={empty.title}
          description={empty.description}
          icon={empty.icon}
          actions={
            <ActionPanel>
              <Action title="Update Package Index" icon={Icon.ArrowClockwise} onAction={() => void updateIndex()} />
            </ActionPanel>
          }
        />
      )}
      {sections.map((section) => (
        <List.Section key={section.id} title={section.title} subtitle={section.subtitle}>
          {section.rows.map((pkg) => (
            <PackageListItem
              key={itemIds.get(pkg) ?? makeItemId(pkg)}
              itemId={itemIds.get(pkg) ?? makeItemId(pkg)}
              pkg={pkg}
              viewKind={viewKind}
              gate={gate}
              duplicateNames={duplicateNames}
              isSelected={selectedPkg === pkg}
              details={details}
              detailsLoading={detailsLoading}
              actions={
                <PackageActions
                  pkg={pkg}
                  viewKind={viewKind}
                  gate={gate}
                  ops={{ launchDetached, runInline, cancelActive }}
                  onUpdateIndex={() => void updateIndex()}
                  homepage={details?.homepage}
                  moniker={details?.moniker}
                  upgradeAllTargets={bulk.upgradeAllTargets}
                  uninstallAllTargets={bulk.uninstallAllTargets}
                />
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

export { PackageListView, type ListSection };
