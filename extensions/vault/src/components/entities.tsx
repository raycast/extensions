import { useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { Configuration, Reload } from "./actions";
import { useCachedState, usePromise } from "@raycast/utils";
import {
  callCreateAlias,
  callCreateEntity,
  callDeleteEntity,
  callGetEntity,
  callGetPolicies,
  callGetSysAuth,
  callListEntities,
  deleteEnabled,
  writeEnabled,
} from "../utils";
import { VaultEntity, VaultMount } from "../interfaces";

function VaultAddEntity(props: { entity?: VaultEntity }) {
  const { push } = useNavigation();
  const edit = props.entity !== undefined;

  const [auths, setAuths] = useState<VaultMount[]>([]);
  const [policies, setPolicies] = useState<string[]>([]);

  const { isLoading } = usePromise(async () => {
    setAuths(await callGetSysAuth());
    if (!edit) {
      setPolicies(await callGetPolicies());
    }
  });

  async function createEntityWithAlias(values: {
    name: string;
    aliasName: string;
    aliasAuth: string;
    policies: string[];
  }) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: edit ? "Editing" : "Creating" + " entity",
    });

    try {
      const entityId = edit ? props.entity?.id : await callCreateEntity(values.name, values.policies);
      await callCreateAlias(entityId, values.aliasName, values.aliasAuth);

      toast.style = Toast.Style.Success;
      toast.message = `Entity ${edit ? "edited" : "created"} with success`;
      setTimeout(() => push(<VaultEntities />), 1000);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.message = "Failed to create/edit entity\n" + String(error);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.AddPerson}
            title={edit ? "Add Alias" : "Create"}
            onSubmit={createEntityWithAlias}
          />
        </ActionPanel>
      }
    >
      {edit ? (
        <Form.Description title="Name" text={props.entity?.name || ""} />
      ) : (
        <Form.TextField id="name" title="Name" storeValue />
      )}
      <Form.TextField id="aliasName" title="Alias Name" storeValue />
      {auths.length > 0 ? (
        <Form.Dropdown
          id="aliasAuth"
          title="Alias Auth"
          defaultValue={auths.find((auth) => auth.type === "ldap")?.accessor}
        >
          {auths.map((auth) => (
            <Form.Dropdown.Item key={auth.name} value={auth.accessor} title={`${auth.type} (${auth.name})`} />
          ))}
        </Form.Dropdown>
      ) : undefined}
      {!edit && policies.length > 0 ? (
        <Form.TagPicker id="policies" title="Policies" defaultValue={["admin"]}>
          {policies.map((policy) => (
            <Form.TagPicker.Item key={policy} value={policy} title={policy} />
          ))}
        </Form.TagPicker>
      ) : undefined}
    </Form>
  );
}

export function VaultEntities() {
  const { push } = useNavigation();

  const [entities, setEntities] = useState<VaultEntity[]>([]);
  const [showWithoutPolicies, setShowWithoutPolicies] = useCachedState("show-without-policies", false);
  const [showDetails, setShowDetails] = useCachedState("show-details", false);

  const { isLoading, revalidate } = usePromise(async () => {
    const entityIds = await callListEntities();
    const promises = [];
    for (const entityId of entityIds) {
      promises.push(callGetEntity(entityId));
    }
    const results = await Promise.all(promises);
    setEntities(results);
  });

  async function deleteEntity(entityId: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting entity",
    });

    try {
      if (
        await confirmAlert({
          title: "Are you sure you want to delete this entity ?",
          message: "This will delete all associated aliases",
          primaryAction: {
            title: "Delete",
            style: Alert.ActionStyle.Destructive,
          },
          icon: Icon.RemovePerson,
          dismissAction: {
            title: "Cancel",
            style: Alert.ActionStyle.Cancel,
          },
        })
      ) {
        await callDeleteEntity(entityId);

        toast.style = Toast.Style.Success;
        toast.message = "Entity successfully deleted, reloading";

        setTimeout(() => push(<VaultEntities />), 1000);
      } else {
        await toast.hide();
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.message = "Failed to delete entity\n" + String(error);
    }
  }

  function getAliases(entity: VaultEntity) {
    const aliasWithTypes: { [name: string]: string[] } = {};
    for (const alias of entity.aliases) {
      if (!aliasWithTypes[alias.name]) {
        aliasWithTypes[alias.name] = [alias.mount_type];
      } else {
        aliasWithTypes[alias.name].push(alias.mount_type);
      }
    }
    return Object.keys(aliasWithTypes).map((name) => ({
      text: name,
      tooltip: aliasWithTypes[name].join(" / "),
    }));
  }

  return (
    <List
      filtering={true}
      isShowingDetail={showDetails}
      isLoading={isLoading}
      searchBarPlaceholder="Search in entities"
    >
      <List.EmptyView
        title={"No entities found"}
        actions={
          <ActionPanel>
            <Configuration />
          </ActionPanel>
        }
      />

      {entities
        .filter((entity) => entity.policies.length || showWithoutPolicies)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((entity) => (
          <List.Item
            key={entity.id}
            title={entity.name}
            subtitle={showDetails ? "" : entity.id}
            icon={Icon.PersonCircle}
            accessories={
              showDetails
                ? []
                : [
                    ...entity.policies.map((policy) => ({
                      text: policy,
                    })),
                    ...getAliases(entity),
                  ]
            }
            actions={
              <ActionPanel>
                {writeEnabled() && (
                  <>
                    <Action.Push icon={Icon.Pencil} title={"Add Alias"} target={<VaultAddEntity entity={entity} />} />
                    <Action.Push
                      icon={Icon.AddPerson}
                      title={"Add Entity"}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      target={<VaultAddEntity />}
                    />
                  </>
                )}
                {deleteEnabled() && (
                  <Action
                    icon={Icon.RemovePerson}
                    title={"Remove Entity"}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => deleteEntity(entity.id)}
                  />
                )}
                <ActionPanel.Section title="Display">
                  <Action
                    icon={showWithoutPolicies ? Icon.EyeDisabled : Icon.Eye}
                    title={showWithoutPolicies ? "Hide without Policies" : "Show without Policies"}
                    shortcut={{ modifiers: ["cmd"], key: "i" }}
                    onAction={() => setShowWithoutPolicies(!showWithoutPolicies)}
                  />
                  <Action
                    icon={showDetails ? Icon.EyeDisabled : Icon.Eye}
                    title={showDetails ? "Hide Details" : "Show Details"}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => setShowDetails(!showDetails)}
                  />
                </ActionPanel.Section>
                <Configuration />
                <Reload revalidate={revalidate} />
              </ActionPanel>
            }
            detail={<List.Item.Detail markdown={"````\n" + JSON.stringify(entity, undefined, 2) + "\n````"} />}
          />
        ))}
    </List>
  );
}
