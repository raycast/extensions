import { useEffect, useState } from "react";
import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { filter, flattenDeep, map, sumBy } from "lodash";

import TableDropdown from "./TableDropdown";
import Actions from "./Actions";
import SearchResultListItem from "./SearchResultListItem";

import { getTableIconAndColor } from "../utils/getTableIconAndColor";
import useInstances from "../hooks/useInstances";
import InstanceForm from "./InstanceForm";
import { GlobalSearchResponse, Record, SearchResult } from "../types";
import useFavorites from "../hooks/useFavorites";
import { buildServiceNowUrl } from "../utils/buildServiceNowUrl";
import { getInstanceBaseUrl } from "../utils/instanceUrl";
import { instanceLabel } from "../utils/instanceLabel";
import { useAuthHeader } from "../hooks/useAuthHeader";

export default function ({ searchTerm }: { searchTerm: string }) {
  const { isInFavorites, revalidateFavorites, addUrlToFavorites, removeFromFavorites } = useFavorites();
  const { addInstance, mutate: mutateInstances, selectedInstance } = useInstances();
  const command = "Search";

  const [navigationTitle, setNavigationTitle] = useState<string>("");
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
  const [table] = useCachedState<string>("table", "all");
  const { name: instanceName = "" } = selectedInstance || {};

  const instanceUrl = getInstanceBaseUrl({ name: instanceName });
  const authHeader = useAuthHeader(selectedInstance);

  const { isLoading, data, error, revalidate } = useFetch(
    `${instanceUrl}/api/now/globalsearch/search?sysparm_search=${searchTerm}`,
    {
      headers: authHeader ? { Authorization: authHeader } : undefined,
      execute: !!selectedInstance && !!authHeader,

      onError: (error) => {
        console.error(error);
        showToast({ style: Toast.Style.Failure, title: "Could Not Fetch Results", message: error.message });
      },

      mapResult(response: GlobalSearchResponse) {
        const recordsWithResults = filter(response.result?.groups, (r) => r.result_count > 0);
        const data = flattenDeep(map(recordsWithResults, (r) => filter(r.search_results, (x) => x.record_count > 0)));
        return { data };
      },
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    if (table !== "all") {
      const filteredResults = filter(data, (r) => r.name === table);
      setFilteredResults(filteredResults);
    } else if (data) {
      setFilteredResults(data);
    }
  }, [table, data]);

  useEffect(() => {
    if (!selectedInstance || error) {
      setNavigationTitle(command);
      return;
    }

    const aliasOrName = selectedInstance ? instanceLabel(selectedInstance) : instanceName;

    if (isLoading) {
      setNavigationTitle(`${command} > ${aliasOrName} > Loading results for ${searchTerm}...`);
      return;
    }
    const count = sumBy(data, (r) => r.record_count);
    if (count == 0) setNavigationTitle(`${command} > ${aliasOrName} > No results found for ${searchTerm}`);
    else setNavigationTitle(`${command} > ${aliasOrName} > ${count} result${count > 1 ? "s" : ""} for ${searchTerm}`);
  }, [command, selectedInstance, error, isLoading, data, searchTerm, instanceName]);

  return (
    <List
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Filter by title, description, state, category, number..."
      isLoading={isLoading}
      searchBarAccessory={data ? <TableDropdown results={data} isLoading={isLoading} /> : undefined}
    >
      {selectedInstance ? (
        error ? (
          <List.EmptyView
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            title="Could Not Fetch Results"
            description="Press ⏎ to refresh or try later again"
            actions={
              <ActionPanel>
                <Actions revalidate={revalidate} />
              </ActionPanel>
            }
          />
        ) : data?.length && data.length > 0 ? (
          filteredResults.map((result, index) => {
            const records = result.records;
            const { icon: iconName, color: colorName } = getTableIconAndColor(result.name);
            const icon: Action.Props["icon"] = {
              source: Icon[iconName as keyof typeof Icon],
              tintColor: Color[colorName as keyof typeof Color],
            };
            const allResultsUrl = buildServiceNowUrl(instanceName, result.all_results_url);
            return (
              <List.Section
                key={result.name + "_" + index}
                title={`${result.name == "u_documate_page" ? "Documate Pages" : result.label_plural}`}
                subtitle={`${result.record_count} ${result.record_count == 1 ? "result" : "results"}`}
              >
                {records.map((record: Record) => (
                  <SearchResultListItem
                    key={record.sys_id}
                    result={record}
                    icon={icon}
                    label={result.label}
                    fields={result.fields}
                    instanceUrl={instanceUrl}
                    revalidateSearchResults={revalidate}
                    favoriteId={isInFavorites(record.record_url)}
                    addUrlToFavorites={addUrlToFavorites}
                    removeFromFavorites={removeFromFavorites}
                    revalidateFavorites={revalidateFavorites}
                  />
                ))}
                <List.Item
                  icon={{
                    source: Icon.MagnifyingGlass,
                    tintColor: Color.SecondaryText,
                  }}
                  key={`${result.label}-all`}
                  title={`View all ${result.name == "u_documate_page" ? "Documate Page" : result.label} matches`}
                  actions={
                    <ActionPanel>
                      <List.Dropdown.Section
                        title={`View all ${result.name == "u_documate_page" ? "Documate Page" : result.label} matches`}
                      >
                        <Action.OpenInBrowser
                          title="Open in ServiceNow"
                          url={allResultsUrl}
                          icon={{ source: "servicenow.svg" }}
                        />
                        <Action.CopyToClipboard
                          title="Copy URL"
                          content={allResultsUrl}
                          shortcut={Keyboard.Shortcut.Common.CopyPath}
                        />
                      </List.Dropdown.Section>
                      <Actions revalidate={revalidate} />
                    </ActionPanel>
                  }
                />
              </List.Section>
            );
          })
        ) : (
          <List.EmptyView
            title="No Results"
            actions={
              <ActionPanel>
                <Actions revalidate={revalidate} />
              </ActionPanel>
            }
          />
        )
      ) : (
        <List.EmptyView
          title="No Instance Profiles Found"
          description="Add an Instance Profile to get started"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Instance Profile"
                target={<InstanceForm onSubmit={addInstance} />}
                onPop={mutateInstances}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
