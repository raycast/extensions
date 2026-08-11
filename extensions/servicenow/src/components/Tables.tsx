import { useState } from "react";

import { Action, ActionPanel, Color, Icon, Keyboard, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { DBObjectsResponse, Instance } from "../types";
import useInstances from "../hooks/useInstances";
import Actions from "./Actions";
import InstanceForm from "./InstanceForm";
import TableRecords from "./TableRecords";
import { buildServiceNowUrl } from "../utils/buildServiceNowUrl";
import { getInstanceBaseUrl } from "../utils/instanceUrl";
import { instanceLabel } from "../utils/instanceLabel";
import { useAuthHeader } from "../hooks/useAuthHeader";
import { expandKeywords } from "../utils/expandKeywords";

export default function Tables() {
  const {
    instances,
    isLoading: isLoadingInstances,
    addInstance,
    mutate: mutateInstances,
    selectedInstance,
    setSelectedInstance,
  } = useInstances();
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { id: instanceId = "", name: instanceName = "" } = selectedInstance || {};

  const instanceUrl = getInstanceBaseUrl({ name: instanceName });
  const authHeader = useAuthHeader(selectedInstance);

  const { isLoading, data, error, revalidate, pagination } = useFetch(
    (options) => {
      const terms = searchTerm.split(" ");
      const query = terms.map((t) => `^labelLIKE${t}^ORnameLIKE${t}^ORsuper_class.labelLIKE${t}`).join("");
      return `${instanceUrl}/api/now/table/sys_db_object?sysparm_display_value=true&sysparm_exclude_reference_link=true&sysparm_query=${query}^ORDERBYlabel&sysparm_fields=name,label,super_class&sysparm_limit=100&sysparm_offset=${options.page * 100}`;
    },
    {
      headers: authHeader ? { Authorization: authHeader } : undefined,
      execute: !!selectedInstance && !!authHeader,
      onError: (error) => {
        console.error(error);
        showToast({ style: Toast.Style.Failure, title: "Could Not Fetch Tables", message: error.message });
      },

      mapResult(response: DBObjectsResponse) {
        return { data: response.result, hasMore: response.result.length > 0 };
      },
      keepPreviousData: true,
    },
  );

  const onInstanceChange = (newValue: string) => {
    const found = instances.find((instance) => instance.id === newValue);
    if (found) {
      setSelectedInstance(found);
      LocalStorage.setItem("selected-instance", JSON.stringify(found));
    }
  };

  return (
    <List
      searchText={searchTerm}
      onSearchTextChange={setSearchTerm}
      isLoading={isLoading}
      pagination={pagination}
      throttle
      searchBarPlaceholder="Filter by label, name, super class..."
      searchBarAccessory={
        <List.Dropdown
          isLoading={isLoadingInstances}
          value={instanceId}
          tooltip="Select the instance you want to search in"
          onChange={(newValue) => {
            !isLoadingInstances && onInstanceChange(newValue);
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
        ) : (
          data?.map((table) => {
            const accessories: List.Item.Accessory[] = [];
            const listUrl = buildServiceNowUrl(instanceName, `${table.name}_list.do`);
            if (table.super_class)
              accessories.push({
                tag: { value: table.super_class },
                tooltip: `Super Class: ${table.super_class}`,
              });
            return (
              <List.Item
                key={table.name}
                title={table.label}
                subtitle={table.name}
                keywords={expandKeywords(table.super_class, table.name)}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title={table.label}>
                      <Action.Push
                        title="Explore Records"
                        icon={Icon.MagnifyingGlass}
                        target={<TableRecords table={table} />}
                      />
                      <Action.OpenInBrowser
                        title="Open in ServiceNow"
                        url={listUrl}
                        icon={{ source: "servicenow.svg" }}
                      />
                      <Action.OpenInBrowser
                        title="Open Table Definition (Admins)"
                        url={buildServiceNowUrl(instanceName, `/sys_db_object.do?sysparm_query=name=${table.name}`)}
                        icon={{ source: "servicenow.svg" }}
                      />
                      <Action.OpenInBrowser
                        title="Open Schema Map (Admins)"
                        url={buildServiceNowUrl(
                          instanceName,
                          `generic_hierarchy_erd.do?sysparm_attributes=table_history=,table=${table.name},show_internal=true,show_referenced=true,show_referenced_by=true,show_extended=true,show_extended_by=true,table_expansion=,spacing_x=60,spacing_y=90,nocontext`,
                        )}
                        icon={{ source: "servicenow.svg" }}
                        shortcut={{ modifiers: ["cmd"], key: "s" }}
                      />
                    </ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={listUrl}
                      shortcut={Keyboard.Shortcut.Common.CopyPath}
                    />
                    <Actions revalidate={revalidate} />
                  </ActionPanel>
                }
              />
            );
          })
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
