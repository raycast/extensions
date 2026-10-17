import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState, useMemo } from "react";
import { SORT_LABELS, SortOption } from "./constants";
import { useVessloData } from "./utils/useVessloData";
import { updateRouteGroup } from "./utils/update-filter";
import {
  filterUpdates,
  UPDATE_FILTER_LABELS,
  UpdateFilter,
} from "./utils/updates-filter";
import { assessUpdateCount } from "./utils/data-state";
import { countLabel, formatDate, markdownText } from "./utils/display-format";
import { SharedAppListItem } from "./components/SharedAppListItem";
import {
  DataStateNotice,
  ReloadDataAction,
} from "./components/DataStateNotice";
import { TaggedApps } from "./browse-by-tag";

export default function Updates() {
  const { data, isLoading, state, refresh } = useVessloData();
  const [sortBy, setSortBy] = useState<SortOption>("source");
  const [filter, setFilter] = useState<UpdateFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const apps = useMemo(
    () =>
      filterUpdates(data?.apps ?? [], state, {
        filter,
        query: searchText,
        sortBy,
      }),
    [data, state, filter, searchText, sortBy],
  );
  const counts = data ? assessUpdateCount(data) : null;
  const groups =
    sortBy === "source"
      ? Object.entries(UPDATE_FILTER_LABELS)
          .filter(([key]) => key !== "all")
          .map(([key, title]) => ({
            title,
            apps: apps.filter((app) => updateRouteGroup(app) === key),
          }))
      : [{ title: `Updates · ${SORT_LABELS[sortBy]}`, apps }];
  const viewActions = (
    <>
      <ActionPanel.Submenu title="Sort Updates" icon={Icon.List}>
        {Object.entries(SORT_LABELS).map(([key, title]) => (
          <Action
            key={key}
            title={title}
            icon={sortBy === key ? Icon.Checkmark : Icon.List}
            onAction={() => setSortBy(key as SortOption)}
          />
        ))}
      </ActionPanel.Submenu>
      <Action
        title="Clear Update Filters"
        icon={Icon.ArrowCounterClockwise}
        onAction={() => {
          setSearchText("");
          setFilter("all");
        }}
      />
      <Action
        title={isShowingDetail ? "Hide Update Details" : "Show Update Details"}
        icon={isShowingDetail ? Icon.EyeDisabled : Icon.Sidebar}
        shortcut={{ modifiers: ["cmd"], key: "i" }}
        onAction={() => setIsShowingDetail((value) => !value)}
      />
    </>
  );
  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search updates by app, version, source, or review reason..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Update Source or Review Status"
          value={filter}
          onChange={(value) => setFilter(value as UpdateFilter)}
        >
          {Object.entries(UPDATE_FILTER_LABELS).map(([value, title]) => (
            <List.Dropdown.Item key={value} title={title} value={value} />
          ))}
        </List.Dropdown>
      }
    >
      <DataStateNotice state={state} refresh={refresh} />
      {data && counts && (
        <List.Section title="Export Summary">
          <List.Item
            id="vesslo-update-summary"
            icon={Icon.Info}
            title={`${countLabel(apps.length)} shown · ${countLabel(counts.visibleCount)} visible in export`}
            subtitle={`Vesslo count: ${counts.reportedCount ?? "Unavailable"} · Exported: ${formatDate(data.exportedAt)}`}
            accessories={
              counts.status !== "consistent"
                ? [
                    {
                      tag: {
                        value:
                          counts.status === "mismatch"
                            ? "COUNT MISMATCH"
                            : "COUNT UNVERIFIED",
                        color: Color.Orange,
                      },
                      tooltip: counts.reason ?? undefined,
                    },
                  ]
                : []
            }
            detail={
              <List.Item.Detail
                markdown={`Last completed update check: ${markdownText(data.lastUpdateCheckAt ? formatDate(data.lastUpdateCheckAt) : "Not provided")}.\n\nCheck state: ${markdownText(data.checkPhase ?? "Unverified legacy export")}.\n\nA ready check means the full inventory check loop completed; it does not guarantee every remote source succeeded. Row source-health details still apply.\n\nReload Vesslo Data (⌘R) rereads the exported file. It does not start an update check in Vesslo.`}
              />
            }
            actions={
              <ActionPanel>
                <ReloadDataAction refresh={refresh} />
                {viewActions}
              </ActionPanel>
            }
          />
          <List.Item
            id="vesslo-update-check-status"
            icon={Icon.Clock}
            title={`Last Completed Update Check: ${data.lastUpdateCheckAt ? formatDate(data.lastUpdateCheckAt) : "Unavailable"}`}
            subtitle={`Check state: ${data.checkPhase ?? "unverified"} · ⌘R reloads the file.`}
            actions={
              <ActionPanel>
                <ReloadDataAction refresh={refresh} />
                {viewActions}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {data && apps.length === 0 && (
        <List.Section title="Updates">
          <List.Item
            id="vesslo-no-update-results"
            icon={Icon.MagnifyingGlass}
            title={
              filter === "all" && !searchText
                ? "No Update Candidates in This Export"
                : "No Matching Update Candidates"
            }
            subtitle="Choose another filter, reload exported data, or check for updates in Vesslo."
            actions={
              <ActionPanel>
                {viewActions}
                <ReloadDataAction refresh={refresh} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {groups
        .filter((group) => group.apps.length > 0)
        .map((group) => (
          <List.Section
            key={group.title}
            title={`${group.title} · ${countLabel(group.apps.length)}`}
            subtitle={SORT_LABELS[sortBy]}
          >
            {group.apps.map((app) => (
              <SharedAppListItem
                key={app.id}
                app={app}
                state={state}
                showUpdateDetails
                onRefresh={refresh}
                tagNavigation={(tag) => <TaggedApps tag={tag} />}
                extraActions={viewActions}
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
