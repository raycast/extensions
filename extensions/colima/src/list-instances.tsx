import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  Alert,
  confirmAlert,
  showToast,
  Toast,
  Form,
  popToRoot,
} from "@raycast/api";
import { useColimaInstances } from "./hooks/useColimaInstances";
import { useColimaTemplateDefaults } from "./hooks/useColimaTemplateDefaults";
import { useDependencyCheck } from "./hooks/useDependencyCheck";
import { colimaStart, colimaStop, colimaDelete, colimaCreate } from "./utils/cli";
import { ColimaCreateOptions } from "./utils/types";
import { useState, useEffect } from "react";

interface CreateInstanceFormProps {
  onCreated: () => void;
}

interface CreateInstanceFormValues {
  profile: string;
  cpus: string;
  memory: string;
  disk: string;
  runtime: ColimaCreateOptions["runtime"];
  vmType: ColimaCreateOptions["vmType"];
  kubernetes: boolean;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown error";
}

function CreateInstanceForm({ onCreated }: CreateInstanceFormProps) {
  const { defaults, isLoading } = useColimaTemplateDefaults();
  const [formValues, setFormValues] = useState<CreateInstanceFormValues>({
    profile: "",
    cpus: String(defaults.cpus),
    memory: String(defaults.memory),
    disk: String(defaults.disk),
    runtime: defaults.runtime,
    vmType: defaults.vmType,
    kubernetes: defaults.kubernetes,
  });

  useEffect(() => {
    setFormValues((prev) => ({
      ...prev,
      cpus: String(defaults.cpus),
      memory: String(defaults.memory),
      disk: String(defaults.disk),
      runtime: defaults.runtime,
      vmType: defaults.vmType,
      kubernetes: defaults.kubernetes,
    }));
  }, [defaults.cpus, defaults.memory, defaults.disk, defaults.runtime, defaults.vmType, defaults.kubernetes]);

  async function handleSubmit(values: CreateInstanceFormValues) {
    const { profile, cpus, memory, disk, runtime, vmType, kubernetes } = values;
    const trimmedProfile = profile.trim();

    if (!trimmedProfile) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Profile name is required",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating instance...",
    });

    try {
      await colimaCreate({
        profile: trimmedProfile,
        cpus: Number(cpus),
        memory: Number(memory),
        disk: Number(disk),
        runtime,
        vmType,
        kubernetes,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Instance created";

      onCreated();
      popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create instance";
      toast.message = getErrorMessage(error);
    }
  }

  if (isLoading) {
    return <Form isLoading />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Instance" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="profile" title="Profile Name" placeholder="e.g. default, dev, test" />
      <Form.TextField
        id="cpus"
        title="CPUs"
        value={formValues.cpus}
        placeholder="Number of CPUs"
        onChange={(v) => setFormValues((s) => ({ ...s, cpus: v }))}
        error={formValues.cpus && isNaN(Number(formValues.cpus)) ? "Must be a number" : undefined}
      />
      <Form.Dropdown
        id="runtime"
        title="Runtime"
        defaultValue={defaults.runtime}
        onChange={(v) => setFormValues((s) => ({ ...s, runtime: v as CreateInstanceFormValues["runtime"] }))}
      >
        <Form.Dropdown.Item value="docker" title="docker" />
        <Form.Dropdown.Item value="containerd" title="containerd" />
        <Form.Dropdown.Item value="incus" title="incus" />
      </Form.Dropdown>
      <Form.Dropdown
        id="vmType"
        title="VM Type"
        defaultValue={defaults.vmType}
        onChange={(v) => setFormValues((s) => ({ ...s, vmType: v as CreateInstanceFormValues["vmType"] }))}
      >
        <Form.Dropdown.Item value="qemu" title="qemu" />
        <Form.Dropdown.Item value="vz" title="vz" />
        <Form.Dropdown.Item value="krunkit" title="krunkit" />
      </Form.Dropdown>
      <Form.Checkbox
        id="kubernetes"
        title="Kubernetes"
        label="Enable Kubernetes"
        defaultValue={defaults.kubernetes}
        onChange={(v) => setFormValues((s) => ({ ...s, kubernetes: v }))}
      />
      <Form.Description text="Note: Runtime, architecture, and VM type cannot be changed after creation." />
    </Form>
  );
}

export default function Command() {
  const { colimaAvailable, isChecking } = useDependencyCheck({ colima: true });
  const { data: instances, isLoading, revalidate } = useColimaInstances();

  if (!isChecking && !colimaAvailable) {
    return (
      <List>
        <List.EmptyView
          title="Colima Not Found"
          description="Colima is not installed or not in your PATH. Install it with: brew install colima"
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Install Colima" url="https://colima.run/docs/installation/" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  async function handleStart(name: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Starting ${name}...`,
    });

    try {
      await colimaStart(name);
      toast.style = Toast.Style.Success;
      toast.title = `Started ${name}`;
      await revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to start ${name}`;
      toast.message = getErrorMessage(error);
    }
  }

  async function handleStop(name: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Stopping ${name}...`,
    });

    try {
      await colimaStop(name);
      toast.style = Toast.Style.Success;
      toast.title = `Stopped ${name}`;
      await revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to stop ${name}`;
      toast.message = getErrorMessage(error);
    }
  }

  async function handleDelete(name: string) {
    const confirmed = await confirmAlert({
      title: "Delete Instance",
      message: `Are you sure you want to delete "${name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Deleting ${name}...`,
    });

    try {
      await colimaDelete(name);
      toast.style = Toast.Style.Success;
      toast.title = `Deleted ${name}`;
      await revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to delete ${name}`;
      toast.message = getErrorMessage(error);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search instances...">
      {instances.map((instance) => (
        <List.Item
          key={instance.name}
          title={instance.name}
          subtitle={`${instance.runtime} · ${instance.arch}`}
          icon={Icon.ComputerChip}
          accessories={[
            {
              tag: {
                value: instance.status,
                color: instance.status === "Running" ? Color.Green : Color.SecondaryText,
              },
            },
            { text: `${instance.cpus} CPU` },
            { text: `${instance.memory} GiB` },
            { text: `${instance.disk} GiB` },
          ]}
          keywords={[instance.runtime, instance.arch, instance.status.toLowerCase()]}
          actions={
            <ActionPanel>
              {instance.status === "Running" ? (
                <Action
                  title="Stop Instance"
                  icon={Icon.Stop}
                  onAction={() => {
                    void handleStop(instance.name);
                  }}
                />
              ) : (
                <Action
                  title="Start Instance"
                  icon={Icon.Play}
                  onAction={() => {
                    void handleStart(instance.name);
                  }}
                />
              )}

              <Action
                title="Delete Instance"
                icon={Icon.Trash}
                shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                style={Action.Style.Destructive}
                onAction={() => {
                  void handleDelete(instance.name);
                }}
              />

              <Action.Push
                title="Create New Instance"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<CreateInstanceForm onCreated={revalidate} />}
              />

              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => {
                  void revalidate();
                }}
              />
            </ActionPanel>
          }
        />
      ))}

      {instances.length === 0 ? (
        <List.EmptyView
          title="No Colima Instances"
          description="Create a new instance to get started"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create New Instance"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<CreateInstanceForm onCreated={revalidate} />}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => {
                  void revalidate();
                }}
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
