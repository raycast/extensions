import {
  ActionPanel,
  Action,
  List,
  Icon,
  Form,
  useNavigation,
  Alert,
  confirmAlert,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useAppEnvSelector } from "./components/app-env-selector";
import { listInstances } from "./api/instances";
import {
  listBackgroundProcesses,
  createBackgroundProcess,
  updateBackgroundProcess,
  deleteBackgroundProcess,
} from "./api/background-processes";
import { Instance } from "./types/instance";
import { BackgroundProcess } from "./types/background-process";
import { timeAgo } from "./utils/dates";
import { useState } from "react";

export default function ManageBackgroundProcesses() {
  const { environmentId, isLoading: selectorLoading, Dropdown } = useAppEnvSelector();

  const { data: instancesData, isLoading: instancesLoading } = useCachedPromise(
    (envId: string) => listInstances(envId),
    [environmentId],
    { execute: !!environmentId, keepPreviousData: true },
  );

  return (
    <List
      isLoading={selectorLoading || instancesLoading}
      searchBarPlaceholder="Search instances..."
      searchBarAccessory={<Dropdown />}
    >
      <List.Section title="Instances">
        {instancesData?.data.map((instance) => (
          <List.Item
            key={instance.id}
            icon={Icon.ComputerChip}
            title={instance.attributes.name}
            subtitle={instance.attributes.type}
            accessories={[
              { tag: { value: instance.attributes.size } },
              { text: timeAgo(instance.attributes.created_at) },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Background Processes"
                  icon={Icon.Terminal}
                  target={<InstanceBackgroundProcesses instance={instance} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function InstanceBackgroundProcesses({ instance }: { instance: Instance }) {
  const { data, isLoading, revalidate } = useCachedPromise((id: string) => listBackgroundProcesses(id), [instance.id]);

  async function handleDelete(process: BackgroundProcess) {
    if (
      await confirmAlert({
        title: "Delete Background Process",
        message: `Are you sure you want to delete this ${process.attributes.type} process?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting background process..." });
        await deleteBackgroundProcess(process.id);
        await showToast({ style: Toast.Style.Success, title: "Background process deleted" });
        revalidate();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete background process",
          message: String(error),
        });
      }
    }
  }

  return (
    <List
      navigationTitle={`${instance.attributes.name} - Background Processes`}
      isLoading={isLoading}
      searchBarPlaceholder="Search background processes..."
    >
      <List.Section title="Actions">
        <List.Item
          icon={Icon.Plus}
          title="Create Background Process"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Background Process"
                icon={Icon.Plus}
                target={<BackgroundProcessForm instanceId={instance.id} onSaved={revalidate} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Background Processes">
        {data?.data.map((process) => (
          <List.Item
            key={process.id}
            icon={process.attributes.type === "worker" ? Icon.Cog : Icon.Terminal}
            title={process.attributes.type === "worker" ? "Queue Worker" : process.attributes.command || "Custom"}
            subtitle={process.attributes.command || undefined}
            accessories={[
              { tag: { value: process.attributes.type } },
              {
                tag: {
                  value: `${process.attributes.processes} process${process.attributes.processes !== 1 ? "es" : ""}`,
                },
              },
              { text: timeAgo(process.attributes.created_at) },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Background Process"
                  icon={Icon.Pencil}
                  target={<BackgroundProcessForm instanceId={instance.id} process={process} onSaved={revalidate} />}
                />
                <Action
                  title="Delete Background Process"
                  icon={Icon.Trash}
                  onAction={() => handleDelete(process)}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function BackgroundProcessForm({
  instanceId,
  process,
  onSaved,
}: {
  instanceId: string;
  process?: BackgroundProcess;
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  const [processType, setProcessType] = useState<string>(process?.attributes.type ?? "worker");
  const isEditing = !!process;

  async function handleSubmit(values: Record<string, string | boolean>) {
    try {
      const title = isEditing ? "Updating" : "Creating";
      await showToast({ style: Toast.Style.Animated, title: `${title} background process...` });

      const data: Record<string, unknown> = {
        type: values.type,
        processes: parseInt(values.processes as string, 10) || 1,
      };

      if (values.type === "custom") {
        data.command = values.command;
      } else {
        const config: Record<string, unknown> = {};
        if (values.connection) config.connection = values.connection;
        if (values.queue) config.queue = values.queue;
        if (values.tries) config.tries = parseInt(values.tries as string, 10);
        if (values.backoff) config.backoff = parseInt(values.backoff as string, 10);
        if (values.sleep) config.sleep = parseInt(values.sleep as string, 10);
        if (values.rest) config.rest = parseInt(values.rest as string, 10);
        if (values.timeout) config.timeout = parseInt(values.timeout as string, 10);
        if (values.force) config.force = values.force;
        data.config = config;
      }

      if (isEditing) {
        await updateBackgroundProcess(process.id, data);
      } else {
        await createBackgroundProcess(instanceId, data);
      }

      await showToast({ style: Toast.Style.Success, title: `Background process ${isEditing ? "updated" : "created"}` });
      onSaved();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to ${isEditing ? "update" : "create"} background process`,
        message: String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle={isEditing ? "Edit Background Process" : "Create Background Process"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Update" : "Create"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="type"
        title="Type"
        defaultValue={process?.attributes.type ?? "worker"}
        onChange={setProcessType}
      >
        <Form.Dropdown.Item title="Queue Worker" value="worker" />
        <Form.Dropdown.Item title="Custom" value="custom" />
      </Form.Dropdown>
      <Form.TextField
        id="processes"
        title="Processes"
        defaultValue={String(process?.attributes.processes ?? 1)}
        placeholder="1"
      />
      {processType === "custom" && (
        <Form.TextField
          id="command"
          title="Command"
          defaultValue={process?.attributes.command ?? ""}
          placeholder="php artisan my:command"
        />
      )}
      {processType === "worker" && (
        <>
          <Form.Separator />
          <Form.TextField
            id="connection"
            title="Connection"
            defaultValue={(process?.attributes.config as Record<string, string> | null)?.connection ?? ""}
            placeholder="redis (optional)"
          />
          <Form.TextField
            id="queue"
            title="Queue"
            defaultValue={(process?.attributes.config as Record<string, string> | null)?.queue ?? ""}
            placeholder="default (optional)"
          />
          <Form.TextField
            id="tries"
            title="Tries"
            defaultValue={String((process?.attributes.config as Record<string, number> | null)?.tries ?? "")}
            placeholder="3 (optional)"
          />
          <Form.TextField
            id="backoff"
            title="Backoff"
            defaultValue={String((process?.attributes.config as Record<string, number> | null)?.backoff ?? "")}
            placeholder="0 (optional)"
          />
          <Form.TextField
            id="sleep"
            title="Sleep"
            defaultValue={String((process?.attributes.config as Record<string, number> | null)?.sleep ?? "")}
            placeholder="3 (optional)"
          />
          <Form.TextField
            id="rest"
            title="Rest"
            defaultValue={String((process?.attributes.config as Record<string, number> | null)?.rest ?? "")}
            placeholder="0 (optional)"
          />
          <Form.TextField
            id="timeout"
            title="Timeout"
            defaultValue={String((process?.attributes.config as Record<string, number> | null)?.timeout ?? "")}
            placeholder="60 (optional)"
          />
          <Form.Checkbox
            id="force"
            label="Force"
            defaultValue={(process?.attributes.config as Record<string, boolean> | null)?.force ?? false}
          />
        </>
      )}
    </Form>
  );
}
