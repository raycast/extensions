import { useState } from "react";

import { Action, ActionPanel, Color, Icon, Keyboard, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { DBObjectsResponse, Instance } from "../types";
import useInstances from "../hooks/useInstances";
import Actions from "./Actions";
import InstanceForm from "./InstanceForm";

export default function Tables() {
  const {
    instances,
    isLoading: isLoadingInstances,
    addInstance,
    mutate: mutateInstances,
    selectedInstance,
    setSelectedInstance,
  } = useInstances();
  const [errorFetching, setErrorFetching] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { id: instanceId = "", name: instanceName = "", username = "", password = "" } = selectedInstance || {};

  const instanceUrl = `https://${instanceName}.service-now.com`;

  const { isLoading, data, revalidate, pagination } = useFetch(
    (options) => {
      const terms = searchTerm.split(" ");
      const query = terms.map((t) => `^labelLIKE${t}^ORnameLIKE${t}^ORsuper_class.labelLIKE${t}`).join("");
      return `${instanceUrl}/api/now/table/sys_db_object?sysparm_display_value=true&sysparm_display_value=true&sysparm_exclude_reference_link=true&sysparm_query=${query}^ORDERBYlabel&sysparm_fields=name,label,super_class&sysparm_limit=100&sysparm_offset=${options.page * 100}`;
    },
    {
      headers: {
        Authorization: `Basic ${Buffer.from(username + ":" + password).toString("base64")}`,
      },
      execute: !!selectedInstance,
      onError: (error) => {
        setErrorFetching(true);
        console.error(error);
        showToast(Toast.Style.Failure, "Could not fetch tables", error.message);
      },

      mapResult(response: DBObjectsResponse) {
        setErrorFetching(false);

        return { data: response.result, hasMore: response.result.length > 0 };
      },
      keepPreviousData: true,
    },
  );

  const onInstanceChange = (newValue: string) => {
    const aux = instances.find((instance) => instance.id === newValue);
    if (aux) {
      setSelectedInstance(aux);
      LocalStorage.setItem("selected-instance", JSON.stringify(aux));
    }
  };

  return (
    <List
      searchText={searchTerm}
      onSearchTextChange={setSearchTerm}
      isLoading={isLoading}
      pagination={pagination}
      throttle
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
        errorFetching ? (
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
                keywords={[table.super_class, ...table.name.split("_")]}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title={table.label}>
                      <Action.OpenInBrowser
                        title="Open in Servicenow"
                        url={`${instanceUrl}/${table.name}_list.do`}
                        icon={{ source: "servicenow.svg" }}
                      />
                      <Action.OpenInBrowser
                        title="Open Table Definition (Admins)"
                        url={`${instanceUrl}/sys_db_object.do?sysparm_query=name=${table.name}`}
                        icon={{ source: "servicenow.svg" }}
                      />
                      <Action.OpenInBrowser
                        title="Open Schema Map (Admins)"
                        url={`${instanceUrl}/generic_hierarchy_erd.do?sysparm_attributes=table_history=,table=${table.name},show_internal=true,show_referenced=true,show_referenced_by=true,show_extended=true,show_extended_by=true,table_expansion=,spacing_x=60,spacing_y=90,nocontext`}
                        icon={{ source: "servicenow.svg" }}
                        shortcut={{ modifiers: ["cmd"], key: "s" }}
                      />
                    </ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={`${instanceUrl}/${table.name}_list.do`}
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
