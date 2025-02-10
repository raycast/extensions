import { ActionPanel, Action, Icon, List, Keyboard, confirmAlert, LocalStorage, Alert, Color } from "@raycast/api";

import InstanceForm from "./InstanceForm";

import useInstances from "../hooks/useInstances";
import { useEffect, useState } from "react";

export default function InstancesList() {
  const [selectedId, setSelectedId] = useState("");

  const {
    instances,
    isLoading,
    addInstance,
    editInstance,
    deleteInstance,
    selectedInstance,
    setSelectedInstance,
    mutate,
  } = useInstances();

  useEffect(() => {
    if (!selectedInstance && instances.length > 0) {
      setSelectedInstance(instances[0]);
    }
  }, [instances, selectedInstance]);

  useEffect(() => {
    if (!selectedInstance || isLoading || selectedId) return;
    setSelectedId(selectedInstance.id);
  }, [selectedInstance, isLoading]);

  return (
    <List searchBarPlaceholder="Filter by name, alias, username..." isLoading={isLoading} selectedItemId={selectedId}>
      {instances.map((instance) => {
        const { id: instanceId, alias, name: instanceName, username, password, color } = instance;
        const aliasOrName = alias ? alias : instanceName;
        return (
          <List.Item
            key={instanceId}
            id={instanceId}
            icon={{
              source: selectedInstance?.id == instanceId ? Icon.CheckCircle : Icon.Circle,
              tintColor: color,
            }}
            title={aliasOrName}
            subtitle={alias ? instanceName : ""}
            keywords={[instanceName, alias ?? "", username]}
            actions={
              <ActionPanel>
                <List.Dropdown.Section title={aliasOrName}>
                  <Action.Push
                    icon={Icon.Pencil}
                    title="Edit"
                    target={<InstanceForm onSubmit={editInstance} instance={instance} />}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    onPop={mutate}
                    onPush={() => setSelectedId(instance.id)}
                  />
                  <Action
                    icon={Icon.Checkmark}
                    title="Select"
                    shortcut={{ modifiers: ["cmd"], key: "i" }}
                    onAction={() => {
                      setSelectedInstance(instance);
                      LocalStorage.setItem("selected-instance", JSON.stringify(instance));
                    }}
                  ></Action>
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() =>
                      confirmAlert({
                        title: "Delete Instance Profile",
                        message: `Are you sure you want to delete "${alias ? alias + " (" + instanceName + ")" : instanceName}"?`,
                        primaryAction: {
                          style: Alert.ActionStyle.Destructive,
                          title: "Delete",
                          onAction: () => {
                            deleteInstance(instanceId);
                          },
                        },
                      })
                    }
                  />
                </List.Dropdown.Section>
                <List.Dropdown.Section>
                  <Action.OpenInBrowser
                    icon={{ source: "servicenow.svg" }}
                    title={"Open Instance"}
                    shortcut={Keyboard.Shortcut.Common.Open}
                    url={`https://${instanceName}.service-now.com`}
                  />
                  <Action.OpenInBrowser
                    icon={{ source: "servicenow.svg" }}
                    title="Login to Servicenow Instance"
                    shortcut={{ modifiers: ["cmd"], key: "l" }}
                    url={`https://${instanceName}.service-now.com/login.do?user_name=${username}&user_password=${password}&sys_action=sysverb_login`}
                  />
                </List.Dropdown.Section>
                <List.Dropdown.Section title="Instance Profiles">
                  <Action.Push
                    icon={Icon.Plus}
                    title="Add"
                    target={<InstanceForm onSubmit={addInstance} />}
                    shortcut={Keyboard.Shortcut.Common.New}
                    onPush={() => setSelectedId(instance.id)}
                  />
                </List.Dropdown.Section>
              </ActionPanel>
            }
            accessories={[
              { text: username, icon: Icon.Person },
              instance.full == "true"
                ? { icon: { source: Icon.LockDisabled, tintColor: Color.Green }, tooltip: "Full Access" }
                : { icon: { source: Icon.Lock, tintColor: Color.Orange }, tooltip: "Limited Access" },
            ]}
          />
        );
      })}

      {instances.length === 0 ? (
        <List.EmptyView
          title="No Instance Profiles Found"
          description="Press ⏎ to create your first instance profile"
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Add Instance Profile"
                target={<InstanceForm onSubmit={addInstance} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          title="No Results"
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Add Instance Profile"
                target={<InstanceForm onSubmit={addInstance} />}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
