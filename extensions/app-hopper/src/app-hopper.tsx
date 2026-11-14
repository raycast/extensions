import { ActionPanel, Icon, List } from "@raycast/api";
import type { LaunchProps } from "@raycast/api";
import { useMemo } from "react";
import { useWindowSearch } from "./use-window-search";
import { useApplicationSearch } from "./use-application-search";
import { groupApplications } from "./app-groups";
import { useRuntimeEnvironment } from "./runtime-environment";
import { RuntimeSetupView } from "./runtime-setup";
import { SearchResultItem } from "./search-result-item";
import { createWindowActions, RefreshWindowsAction } from "./window-actions";

type CommandProps = Pick<LaunchProps<{ launchContext: { preview?: "loading" } }>, "launchContext">;

function emptySearchState(preparing: boolean, hasQuery: boolean) {
  if (preparing)
    return { title: "Getting things ready…", description: "Your apps, windows and browser tabs will appear here." };
  if (hasQuery) return { title: "No Results", description: "Try another app name, window title or URL." };
  return { title: "No Running Applications", description: "Open an app, then refresh the list." };
}

export default function Command({ launchContext }: CommandProps = {}) {
  const previewLoading = launchContext?.preview === "loading";
  const { status: runtimeStatus, revalidate: checkSetup } = useRuntimeEnvironment();
  const {
    windows,
    applications = [],
    applicationOrder = [],
    setWindows,
    metadataByPid,
    browserCounts,
    browserTabs,
    axWindowsByPid,
    isLoading,
    refreshWindows: reloadWindows,
  } = useWindowSearch(runtimeStatus.kind === "ready" && !previewLoading);
  const isCheckingSetup = previewLoading || runtimeStatus.kind === "checking";
  const isPreparing = isCheckingSetup || isLoading;

  const apps = useMemo(
    () =>
      (runtimeStatus.kind === "ready" || runtimeStatus.kind === "checking") && !previewLoading
        ? groupApplications(windows, metadataByPid, applicationOrder, applications)
        : [],
    [runtimeStatus.kind, previewLoading, windows, metadataByPid, applicationOrder, applications],
  );
  const rowData = { browserTabs, browserCounts, axWindowsByPid };
  const search = useApplicationSearch({ apps, data: rowData, onRefresh: reloadWindows });

  if (runtimeStatus.kind !== "ready" && !isCheckingSetup) {
    return <RuntimeSetupView status={runtimeStatus} onCheck={checkSetup} />;
  }

  const actions = createWindowActions(setWindows, search.refresh);
  const refreshAction = <RefreshWindowsAction onRefresh={search.refresh} />;
  const emptyState = emptySearchState(isPreparing, search.hasQuery);
  function renderSection(section: (typeof search.groups)[number]) {
    const items = section.items.map((row) => (
      <SearchResultItem
        key={row.item.id}
        row={row}
        data={rowData}
        actions={actions}
        searchText={search.listProps.searchText}
        actionsEnabled={!isCheckingSetup}
      />
    ));
    if (section.title)
      return (
        <List.Section key={section.id} title={section.title}>
          {items}
        </List.Section>
      );
    return items;
  }

  return (
    <List
      // Raycast hides EmptyView while its loading bar is active.
      isLoading={isPreparing && search.hasResults}
      filtering={false}
      {...search.listProps}
      searchBarPlaceholder="Search apps, windows, tabs or URLs..."
      searchBarAccessory={
        search.hasQuery ? undefined : (
          <List.Dropdown tooltip="Arrange Applications" {...search.arrangement}>
            <List.Dropdown.Item title="Recently Used" value="recent" />
            <List.Dropdown.Item title="Name A–Z" value="name" />
            <List.Dropdown.Item title="Browsers & Apps" value="type" />
            <List.Dropdown.Item title="By Space" value="space" />
          </List.Dropdown>
        )
      }
    >
      {!search.hasResults ? (
        <List.EmptyView
          icon={!isPreparing && search.hasQuery ? Icon.MagnifyingGlass : Icon.AppWindow}
          {...emptyState}
          actions={isCheckingSetup ? undefined : <ActionPanel>{refreshAction}</ActionPanel>}
        />
      ) : (
        search.groups.map(renderSection)
      )}
    </List>
  );
}
