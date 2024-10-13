import { useEffect, useState } from "react";
import { ActionPanel, Action, Icon, List, showToast, Toast, Color, LocalStorage } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import fetch from "node-fetch";
import { filter } from "lodash";

import SearchResults from "./SearchResults";
import InstanceForm from "./InstanceForm";
import Actions from "./Actions";

import useInstances from "../hooks/useInstances";
import { HistoryResponse, HistoryResult, Instance } from "../types";

export default function SearchList() {
  const { instances, addInstance, mutate: mutateInstances, isLoading: isLoadingInstances } = useInstances();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filteredTerms, setFilteredTerms] = useState<HistoryResult[]>([]);
  const [errorFetching, setErrorFetching] = useState<boolean>(false);
  const [selectedInstance, setSelectedInstance] = useCachedState<Instance>("");
  const {
    id: instanceId = "",
    alias = "",
    name: instanceName = "",
    username = "",
    password = "",
  } = selectedInstance || {};

  const instanceUrl = `https://${instanceName}.service-now.com`;

  const { isLoading, data, mutate } = useFetch(
    `${instanceUrl}/api/now/table/ts_query?sysparm_exclude_reference_link=true&sysparm_display_value=true&sysparm_query=sys_created_by=${username}^ORDERBYDESCsys_updated_on&sysparm_fields=sys_id,search_term`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(username + ":" + password).toString("base64")}`,
      },
      execute: !!selectedInstance,
      onError: (error) => {
        setErrorFetching(true);
        console.error(error);
        showToast(Toast.Style.Failure, "Could not fetch history", error.message);
      },

      mapResult(response: HistoryResponse) {
        setErrorFetching(false);

        return { data: response.result };
      },
      keepPreviousData: true,
    },
  );

  async function removeAllItemsFromHistory() {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Removing all items from history",
      });

      const promises = data?.map((item: HistoryResult) =>
        fetch(`${instanceUrl}/api/now/table/ts_query/${item.sys_id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Basic ${Buffer.from(username + ":" + password).toString("base64")}`,
          },
        }),
      );

      if (promises) {
        const responses = await Promise.all(promises);
        const success = responses.every((res) => res.ok);

        if (success) {
          await mutate(Promise.resolve([]));
          await showToast({
            style: Toast.Style.Success,
            title: `All terms removed from history`,
          });
        } else {
          const failedResponses = responses.filter((res) => !res.ok);
          const messages = failedResponses.map((res) => res.statusText);
          await mutate(Promise.resolve([]));
          showToast(Toast.Style.Failure, "Could not remove all items from history", messages.join("\n"));
        }
      }
    } catch (error) {
      console.error(error);

      await mutate(Promise.resolve([]));
      showToast(
        Toast.Style.Failure,
        "Could not remove all items from history",
        error instanceof Error ? error.message : "",
      );
    }
  }

  async function removeItemFromHistory(item: HistoryResult) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Removing "${item.search_term}" from history`,
      });

      const response = await fetch(`${instanceUrl}/api/now/table/ts_query/${item.sys_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${Buffer.from(username + ":" + password).toString("base64")}`,
        },
      });

      if (response.ok) {
        await mutate();

        await showToast({
          style: Toast.Style.Success,
          title: `Term "${item.search_term}" removed from history`,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed removing term from history",
          message: response.statusText,
        });
      }
    } catch (error) {
      console.error(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed removing term from history",
        message: error instanceof Error ? error.message : "",
      });
    }
  }

  useEffect(() => {
    if (!data) return;
    if (searchTerm) {
      setFilteredTerms(filter(data, (r) => r.search_term.includes(searchTerm)));
    } else setFilteredTerms(data);
  }, [data, searchTerm]);

  const onInstanceChange = (newValue: string) => {
    const aux = instances.find((instance) => instance.id === newValue);
    if (aux) {
      setSelectedInstance(aux);
      LocalStorage.setItem("selected-instance", JSON.stringify(aux));
    }
  };

  return (
    <List
      navigationTitle={`Search${selectedInstance ? " > " + (alias ? alias : instanceName) : ""}${isLoading ? " > Loading history..." : ""}`}
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
                title={instance.alias ? instance.alias : instance.name}
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
                      mutate();
                      mutateInstances();
                    }}
                  />
                  <Actions mutate={mutate} />
                </ActionPanel>
              }
            />
          )}

          {errorFetching ? (
            <List.EmptyView
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
              title="Could Not Fetch History"
              description="Press ⏎ to refresh or try later again"
              actions={
                <ActionPanel>
                  <Actions mutate={mutate} />
                </ActionPanel>
              }
            />
          ) : data?.length && data.length > 0 ? (
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
                          mutate();
                          mutateInstances();
                        }}
                        target={selectedInstance && <SearchResults searchTerm={item.search_term} />}
                        title={`Search for "${item.search_term}"`}
                        icon={Icon.MagnifyingGlass}
                      />
                      <Actions mutate={mutate} />
                      <List.Dropdown.Section title="Term">
                        <Action
                          title="Remove from History"
                          icon={Icon.XMarkCircle}
                          style={Action.Style.Destructive}
                          onAction={() => removeItemFromHistory(item)}
                        />
                        <Action
                          title="Clear All Items from History"
                          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                          icon={Icon.XMarkCircleFilled}
                          style={Action.Style.Destructive}
                          onAction={removeAllItemsFromHistory}
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
                  <Actions mutate={mutate} />
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
