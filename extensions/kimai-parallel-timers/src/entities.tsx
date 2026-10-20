import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  confirmAlert,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { Entity, idOf } from "./api";
import { client, perform } from "./shared";
type Kind = "customers" | "projects" | "activities" | "tags";
function EntityForm({
  kind,
  entity,
  refresh,
}: {
  kind: Kind;
  entity?: Entity;
  refresh: () => unknown;
}) {
  const api = client();
  const { pop } = useNavigation();
  const [name, setName] = useState(entity?.name ?? "");
  const [parent, setParent] = useState(
    entity?.customer
      ? String(idOf(entity.customer))
      : entity?.project
        ? String(idOf(entity.project))
        : "",
  );
  const { data, isLoading } = usePromise(
    async () =>
      kind === "projects"
        ? api.request<Entity[]>("/customers?visible=1")
        : kind === "activities"
          ? api.request<Entity[]>("/projects?visible=1")
          : [],
    [],
  );
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={entity ? "Save" : "Create"}
            onSubmit={async () => {
              if (!name.trim() || (kind === "projects" && !parent)) return;
              await perform("Save " + kind, async () => {
                await api.request(
                  `/${kind}${entity ? `/${entity.id}` : ""}`,
                  entity ? "PATCH" : "POST",
                  {
                    name: name.trim(),
                    ...(kind === "projects"
                      ? { customer: Number(parent) }
                      : {}),
                    ...(kind === "activities"
                      ? { project: parent ? Number(parent) : null }
                      : {}),
                  },
                );
                await refresh();
                pop();
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        value={name}
        onChange={setName}
        error={!name.trim() ? "Required" : undefined}
      />
      {(kind === "projects" || kind === "activities") && (
        <Form.Dropdown
          id="parent"
          title={kind === "projects" ? "Customer" : "Project"}
          value={parent}
          onChange={setParent}
        >
          <Form.Dropdown.Item
            value=""
            title={
              kind === "activities" ? "Global activity" : "Select customer"
            }
          />
          {(data ?? []).map((e) => (
            <Form.Dropdown.Item
              key={e.id}
              value={String(e.id)}
              title={e.name}
            />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
export default function Entities({ kind }: { kind: Kind }) {
  const api = client();
  const { data, isLoading, revalidate } = usePromise(
    () =>
      api.request<Entity[]>(
        `/${kind}${kind === "tags" ? "/find?name=" : "?visible=3"}`,
      ),
    [],
  );
  const create = (
    <Action.Push
      title="Create"
      icon={Icon.Plus}
      target={<EntityForm kind={kind} refresh={revalidate} />}
      shortcut={Keyboard.Shortcut.Common.New}
    />
  );
  const actions = (e?: Entity) => (
    <ActionPanel>
      {e && kind !== "tags" && (
        <Action.Push
          title="Edit"
          target={<EntityForm kind={kind} entity={e} refresh={revalidate} />}
        />
      )}
      {create}
      {e && kind !== "tags" && (
        <Action
          title={e.visible === false ? "Restore" : "Archive"}
          onAction={() =>
            perform(
              "Update visibility",
              () =>
                api.request(`/${kind}/${e.id}`, "PATCH", {
                  visible: e.visible === false,
                }),
              revalidate,
            )
          }
        />
      )}
      <Action title="Refresh" onAction={revalidate} />
      <Action.OpenInBrowser title="Open Kimai" url={api.base} />
      {e && (
        <Action
          title="Delete"
          style={Action.Style.Destructive}
          onAction={async () => {
            if (
              await confirmAlert({
                title: `Delete ${e.name}?`,
                message: "Kimai may reject deletion of records in use.",
                primaryAction: {
                  title: "Delete",
                  style: Alert.ActionStyle.Destructive,
                },
              })
            )
              await perform(
                "Delete",
                () => api.request(`/${kind}/${e.id}`, "DELETE"),
                revalidate,
              );
          }}
        />
      )}
    </ActionPanel>
  );
  return (
    <List isLoading={isLoading} actions={actions()}>
      {(data ?? []).map((e) => (
        <List.Item
          key={e.id}
          title={e.name}
          subtitle={e.visible === false ? "Archived" : undefined}
          actions={actions(e)}
        />
      ))}
      <List.EmptyView title={`No ${kind}`} actions={actions()} />
    </List>
  );
}
