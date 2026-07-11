import {
  ActionPanel,
  Action,
  Icon,
  List,
  Keyboard,
  confirmAlert,
  LocalStorage,
  Alert,
  Color,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import InstanceForm from "./InstanceForm";

import useInstances from "../hooks/useInstances";
import { useEffect, useState } from "react";
import { getInstanceBaseUrl } from "../utils/instanceUrl";
import { instanceLabel } from "../utils/instanceLabel";
import { authorizeInstance } from "../utils/oauth";

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
        const { id: instanceId, alias, name: instanceName, username, color } = instance;
        const aliasOrName = instanceLabel(instance);
        const isOAuth = instance.authMode === "oauth";
        const oauthSignedIn = isOAuth && !!instance.accessToken && !!instance.refreshToken;

        const handleSignIn = async () => {
          try {
            await showToast({ style: Toast.Style.Animated, title: `Signing in to ${aliasOrName}` });
            const tokens = await authorizeInstance(instance);
            await editInstance({ ...instance, ...tokens });
            await showToast({ style: Toast.Style.Success, title: `Signed in to ${aliasOrName}` });
          } catch (error) {
            await showFailureToast(error, { title: "OAuth sign-in failed" });
          }
        };

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
            keywords={[instanceName, alias ?? "", username ?? ""]}
            actions={
              <ActionPanel>
                <List.Dropdown.Section title={aliasOrName}>
                  <Action.Push
                    icon={Icon.Pencil}
                    title="Edit"
                    target={<InstanceForm onSubmit={editInstance} onDelete={deleteInstance} instance={instance} />}
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
                  {isOAuth && oauthSignedIn && (
                    <Action
                      icon={Icon.Fingerprint}
                      title="Reauthenticate"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                      onAction={handleSignIn}
                    />
                  )}
                  {isOAuth && !oauthSignedIn && (
                    <Action
                      icon={Icon.Fingerprint}
                      title="Sign in to Instance"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                      onAction={handleSignIn}
                    />
                  )}
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
                    title="Open in ServiceNow"
                    shortcut={Keyboard.Shortcut.Common.Open}
                    url={getInstanceBaseUrl({ name: instanceName })}
                  />
                </List.Dropdown.Section>
                <List.Dropdown.Section title="Instance Profiles">
                  <Action.Push
                    icon={Icon.Plus}
                    title="Add Instance Profile"
                    target={<InstanceForm onSubmit={addInstance} />}
                    shortcut={Keyboard.Shortcut.Common.New}
                    onPush={() => setSelectedId(instance.id)}
                  />
                </List.Dropdown.Section>
              </ActionPanel>
            }
            accessories={[
              ...(instance.authError
                ? [{ icon: { source: Icon.ExclamationMark, tintColor: Color.Red }, tooltip: instance.authError }]
                : []),
              isOAuth
                ? oauthSignedIn
                  ? { text: instance.oauthUserName ?? "", icon: Icon.Fingerprint, tooltip: "OAuth" }
                  : { icon: { source: Icon.Fingerprint, tintColor: Color.Orange }, tooltip: "OAuth — sign in required" }
                : { text: username ?? "", icon: Icon.Person, tooltip: "Basic Auth" },
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
          description="Add an Instance Profile to get started"
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
