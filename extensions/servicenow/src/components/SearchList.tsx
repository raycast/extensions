import { useEffect, useState } from "react";
import { ActionPanel, Action, Icon, List, showToast, Toast, Color, LocalStorage, Keyboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { filter } from "lodash";

import SearchResults from "./SearchResults";
import InstanceForm from "./InstanceForm";
import Actions from "./Actions";

import useInstances from "../hooks/useInstances";
import { useAuthHeader } from "../hooks/useAuthHeader";
import { HistoryResponse, HistoryResult, Instance } from "../types";
import { getInstanceBaseUrl } from "../utils/instanceUrl";
import { instanceLabel } from "../utils/instanceLabel";
import { serviceNowFetchRaw } from "../utils/serviceNowFetch";

export default function SearchList() {
  const {
    instances,
    addInstance,
    mutate: mutateInstances,
    isLoading: isLoadingInstances,
    selectedInstance,
    setSelectedInstance,
    currentUserName,
  } = useInstances();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filteredTerms, setFilteredTerms] = useState<HistoryResult[]>([]);
  const { id: instanceId = "", name: instanceName = "", username, full } = selectedInstance || {};

  const instanceUrl = getInstanceBaseUrl({ name: instanceName });
  const authHeader = useAuthHeader(selectedInstance);
  const effectiveUserName = username || currentUserName || "";

  const { isLoading, data, error, mutate, revalidate } = useFetch(
    `${instanceUrl}/api/now/table/ts_query?sysparm_exclude_reference_link=true&sysparm_display_value=true&sysparm_query=sys_created_by=${effectiveUserName}^ORDERBYDESCsys_updated_on&sysparm_fields=sys_id,search_term`,
    {
      headers: authHeader ? { Authorization: authHeader } : undefined,
      execute: !!selectedInstance && full == "true" && !!authHeader && !!effectiveUserName,
      onError: (error) => {
        console.error(error);
        showToast({ style: Toast.Style.Failure, title: "Could Not Fetch History", message: error.message });
      },

      mapResult(response: HistoryResponse) {
        return { data: response.result };
      },
      keepPreviousData: true,
    },
  );

  const _updateHistory = async (
    request: { endpoint: string; method: string; body?: string },
    text: { before: string; success: string; failure: string },
    updateData: (data: HistoryResult[]) => HistoryResult[],
    successCallBack?: () => void,
  ) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: text.before });
    try {
      if (!selectedInstance) throw new Error("No instance selected");
      const response = await mutate(
        serviceNowFetchRaw(selectedInstance, request.endpoint, {
          method: request.method,
          headers: { "Content-Type": "application/json" },
          body: request.body,
          onRefresh: (updated) => {
            if (selectedInstance.id === updated.id) setSelectedInstance(updated);
          },
        }),
        {
          optimisticUpdate(data) {
            return updateData(data || []);
          },
        },
      );

      if (response.ok) {
        successCallBack?.();
        toast.style = Toast.Style.Success;
        toast.title = text.success;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = text.failure;
        toast.message = response.statusText;
      }
    } catch (error) {
      console.error(error);

      toast.style = Toast.Style.Failure;
      toast.title = text.failure;
      toast.message = error instanceof Error ? error.message : "";
    }
  };

  const removeAllItemsFromHistory = async () => {
    const rest_requests: Array<{
      id: string;
      headers: { name: string; value: string }[];
      exclude_response_headers: boolean;
      url: string;
      method: string;
    }> = [];
    data?.forEach((item: HistoryResult, index) => {
      rest_requests.push({
        id: `history_record_${index}`,
        headers: [],
        exclude_response_headers: true,
        url: `/api/now/table/ts_query/${item.sys_id}`,
        method: "DELETE",
      });
    });

    const request = {
      endpoint: "/api/now/v1/batch",
      method: "POST",
      body: JSON.stringify({
        batch_request_id: "clear-history",
        rest_requests,
      }),
    };

    const updateData = () => {
      return [];
    };

    _updateHistory(
      request,
      {
        before: "Removing all items from history",
        success: "All items removed from history",
        failure: "Failed to remove all items from history",
      },
      updateData,
    );
  };

  const removeItemFromHistory = async (id: string, title: string) => {
    const endpoint = `/api/now/table/ts_query/${id}`;

    const request = {
      endpoint,
      method: "DELETE",
    };

    const updateData = (data: HistoryResult[]) => {
      return data.filter((favorite) => favorite.sys_id !== id);
    };

    _updateHistory(
      request,
      {
        before: `Removing ${title} from history`,
        success: `${title} removed from history`,
        failure: `Failed to remove ${title} from history`,
      },
      updateData,
    );
  };

  useEffect(() => {
    if (!data) return;
    if (full != "true") {
      setFilteredTerms([]);
      return;
    }
    if (searchTerm) {
      setFilteredTerms(filter(data, (r) => r.search_term.includes(searchTerm)));
    } else setFilteredTerms(data);
  }, [data, searchTerm, full]);

  const onInstanceChange = (newValue: string) => {
    const found = instances.find((instance) => instance.id === newValue);
    if (found) {
      setSelectedInstance(found);
      LocalStorage.setItem("selected-instance", JSON.stringify(found));
    }
  };

  return (
    <List
      navigationTitle={`Search${selectedInstance ? " > " + instanceLabel(selectedInstance) : ""}${isLoading ? " > Loading history..." : ""}`}
      searchText={searchTerm}
      isLoading={isLoading}
      onSearchTextChange={setSearchTerm}
      searchBarAccessory={
        <List.Dropdown
          isLoading={isLoadingInstances}
          value={instanceId}
          tooltip="Select the instance you want to search in"
          onChange={(newValue) => {
            !isLoading && !isLoadingInstances && onInstanceChange(newValue);
          }}
        >
          <List.Dropdown.Section title="Instance Profiles">
            {instances.map((instance: Instance) => (
              <List.Dropdown.Item
                key={instance.id}
                title={instanceLabel(instance)}
                value={instance.id}
                icon={{
                  source: instanceId == instance.id ? Icon.CheckCircle : Icon.Circle,
                  tintColor: instance.color,
                }}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {selectedInstance ? (
        <>
          {searchTerm && (
            <List.Item
              title={`Search for "${searchTerm}"`}
              icon={{
                source: Icon.MagnifyingGlass,
                tintColor: Color.SecondaryText,
              }}
              actions={
                <ActionPanel>
                  <Action.Push
                    target={<SearchResults searchTerm={searchTerm} />}
                    title={`Search for "${searchTerm}"`}
                    icon={Icon.MagnifyingGlass}
                    onPop={() => {
                      if (full == "true") revalidate();
                      mutateInstances();
                    }}
                  />
                  <Actions revalidate={revalidate} />
                </ActionPanel>
              }
            />
          )}

          {error ? (
            <List.EmptyView
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
              title="Could Not Fetch History"
              description="Press ⏎ to refresh or try later again"
              actions={
                <ActionPanel>
                  <Actions revalidate={revalidate} />
                </ActionPanel>
              }
            />
          ) : full == "true" && data?.length && data.length > 0 ? (
            <List.Section title="History">
              {filteredTerms?.map((item: HistoryResult) => (
                <List.Item
                  key={item.sys_id}
                  title={item.search_term}
                  icon={{
                    source: Icon.Stopwatch,
                    tintColor: Color.SecondaryText,
                  }}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        onPop={() => {
                          revalidate();
                          mutateInstances();
                        }}
                        target={selectedInstance && <SearchResults searchTerm={item.search_term} />}
                        title={`Search for "${item.search_term}"`}
                        icon={Icon.MagnifyingGlass}
                      />
                      <Actions revalidate={revalidate} />
                      <List.Dropdown.Section title="Term">
                        <Action
                          title="Remove from History"
                          icon={Icon.XMarkCircle}
                          style={Action.Style.Destructive}
                          onAction={() => removeItemFromHistory(item.sys_id, item.search_term)}
                          shortcut={Keyboard.Shortcut.Common.Remove}
                        />
                        <Action
                          title="Clear All Items from History"
                          icon={Icon.XMarkCircleFilled}
                          style={Action.Style.Destructive}
                          onAction={removeAllItemsFromHistory}
                          shortcut={Keyboard.Shortcut.Common.RemoveAll}
                        />
                      </List.Dropdown.Section>
                    </ActionPanel>
                  }
                  accessories={[
                    {
                      icon: Icon.ArrowRightCircle,
                      tooltip: "Search for this term",
                    },
                  ]}
                />
              ))}
            </List.Section>
          ) : (
            <List.EmptyView
              title="No Recent Searches Found"
              description="Type something to get started"
              actions={
                <ActionPanel>
                  <Actions revalidate={revalidate} cantRefresh />
                </ActionPanel>
              }
            />
          )}
        </>
      ) : (
        <List.EmptyView
          title="No Instance Profiles Found"
          description="Add an Instance Profile to get started"
          actions={
            <ActionPanel>
              <Action.Push title="Add Instance Profile" target={<InstanceForm onSubmit={addInstance} />} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
