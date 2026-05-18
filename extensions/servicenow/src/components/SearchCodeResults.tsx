import { useEffect, useState } from "react";
import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { filter, sumBy } from "lodash";

import Actions from "./Actions";
import SearchCodeResultListItem from "./SearchCodeResultListItem";
import SearchGroupDropdown, { DEFAULT_SEARCH_GROUP_SCOPE } from "./SearchGroupDropdown";

import useInstances from "../hooks/useInstances";
import useSearchGroups from "../hooks/useSearchGroups";
import InstanceForm from "./InstanceForm";
import { CodeSearchResponse, CodeSearchTableResult } from "../types";
import useFavorites from "../hooks/useFavorites";
import { buildServiceNowUrl } from "../utils/buildServiceNowUrl";
import { getInstanceBaseUrl } from "../utils/instanceUrl";
import { useAuthHeader } from "../hooks/useAuthHeader";

export default function SearchCodeResults({ searchTerm }: { searchTerm: string }) {
  const { isInFavorites, revalidateFavorites, addUrlToFavorites, removeFromFavorites } = useFavorites();
  const { addInstance, mutate: mutateInstances, selectedInstance } = useInstances();
  const command = "Search Code";

  const [navigationTitle, setNavigationTitle] = useState<string>("");
  const { alias = "", name: instanceName = "" } = selectedInstance || {};

  const instanceUrl = getInstanceBaseUrl({ name: instanceName });
  const authHeader = useAuthHeader(selectedInstance);

  const [groupScope, setGroupScope] = useCachedState<string>("search-code-group-scope", DEFAULT_SEARCH_GROUP_SCOPE);
  const { isLoading: isLoadingGroups, groups: fetchedGroups } = useSearchGroups(selectedInstance);

  const codeSearchParams = new URLSearchParams({
    term: searchTerm,
    search_all_scopes: "true",
    current_app: groupScope,
    limit: "500",
  });

  const { isLoading, data, error, revalidate } = useFetch(
    `${instanceUrl}/api/sn_codesearch/code_search/search?${codeSearchParams.toString()}`,
    {
      headers: authHeader
        ? {
            Authorization: authHeader,
            Accept: "application/json",
          }
        : undefined,
      execute: !!selectedInstance && !!authHeader && !!searchTerm,

      onError: (error) => {
        console.error(error);
        showToast(Toast.Style.Failure, "Could not fetch code results", error.message);
      },

      mapResult(response: CodeSearchResponse) {
        const data = filter(response.result ?? [], (r) => (r.hits?.length ?? 0) > 0);
        return { data };
      },
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    if (!selectedInstance || error) {
      setNavigationTitle(command);
      return;
    }

    const aliasOrName = alias ? alias : instanceName;

    if (isLoading) {
      setNavigationTitle(`${command} > ${aliasOrName} > Loading results for ${searchTerm}...`);
      return;
    }
    const count = sumBy(data, (r) => r.hits.length);
    if (count == 0) setNavigationTitle(`${command} > ${aliasOrName} > No results found for ${searchTerm}`);
    else setNavigationTitle(`${command} > ${aliasOrName} > ${count} result${count > 1 ? "s" : ""} for ${searchTerm}`);
  }, [selectedInstance, error, isLoading, data, searchTerm, alias, instanceName]);

  return (
    <List
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Filter by script name or table..."
      isLoading={isLoading}
      searchBarAccessory={
        <SearchGroupDropdown
          groups={fetchedGroups}
          isLoading={isLoadingGroups}
          value={groupScope}
          onChange={setGroupScope}
        />
      }
    >
      {selectedInstance ? (
        error ? (
          <List.EmptyView
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            title="Could Not Fetch Results"
            description="Check that the sn_codesearch plugin is enabled in the instance, then press ⏎ to refresh"
            actions={
              <ActionPanel>
                <Actions revalidate={revalidate} />
              </ActionPanel>
            }
          />
        ) : data?.length && data.length > 0 ? (
          data.map((tableResult: CodeSearchTableResult, index: number) => {
            const className = tableResult.recordType || tableResult.hits[0]?.className || "";
            const sysIds = tableResult.hits.map((h) => h.sysId).join(",");
            const allResultsUrl = buildServiceNowUrl(
              instanceName,
              `${className}_list.do?sysparm_query=sys_idIN${sysIds}`,
            );
            return (
              <List.Section
                key={`${tableResult.tableLabel}_${index}`}
                title={tableResult.tableLabel}
                subtitle={`${tableResult.hits.length} ${tableResult.hits.length == 1 ? "hit" : "hits"}`}
              >
                {tableResult.hits.map((hit) => (
                  <SearchCodeResultListItem
                    key={hit.sysId}
                    hit={hit}
                    tableLabel={tableResult.tableLabel}
                    revalidateSearchResults={revalidate}
                    favoriteId={isInFavorites(`/${hit.className}.do?sys_id=${hit.sysId}`)}
                    addUrlToFavorites={addUrlToFavorites}
                    removeFromFavorites={removeFromFavorites}
                    revalidateFavorites={revalidateFavorites}
                  />
                ))}
                <List.Item
                  key={`${tableResult.tableLabel}-all`}
                  icon={{ source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }}
                  title={`View all ${tableResult.tableLabel} matches`}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title={`View all ${tableResult.tableLabel} matches`}>
                        <Action.OpenInBrowser
                          title="Open in ServiceNow"
                          url={allResultsUrl}
                          icon={{ source: "servicenow.svg" }}
                        />
                        <Action.CopyToClipboard title="Copy URL" content={allResultsUrl} />
                      </ActionPanel.Section>
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
