import { List, ActionPanel, Action, Icon, Color, Alert, confirmAlert, showToast, Toast } from "@raycast/api";
import { useColimaInstances } from "./hooks/useColimaInstances";
import { useDependencyCheck } from "./hooks/useDependencyCheck";
import { colimaStart, colimaStop, colimaDelete } from "./utils/cli";
import { getErrorMessage } from "./utils/getErrorMessage";
import { CreateInstanceForm } from "./components/CreateInstanceForm";

async function handleStart(name: string, revalidate: () => void) {
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

async function handleStop(name: string, revalidate: () => void) {
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

async function handleDelete(name: string, revalidate: () => void) {
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
                    void handleStop(instance.name, revalidate);
                  }}
                />
              ) : (
                <Action
                  title="Start Instance"
                  icon={Icon.Play}
                  onAction={() => {
                    void handleStart(instance.name, revalidate);
                  }}
                />
              )}

              <Action
                title="Delete Instance"
                icon={Icon.Trash}
                shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                style={Action.Style.Destructive}
                onAction={() => {
                  void handleDelete(instance.name, revalidate);
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
