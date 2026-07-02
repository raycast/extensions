import {
  ActionPanel,
  Action,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect } from "react";

const { port } = getPreferenceValues<Preferences>();
const API_BASE = `http://localhost:${port}`;

type VM = {
  name: string;
  status: string;
  os: string;
  cpuCount: number;
  memorySize: number;
};

function emptyView(fetchError: Error | undefined) {
  if (fetchError) {
    return (
      <List.EmptyView
        icon={Icon.Warning}
        title="Lume is not running or not installed"
        description={"Make sure Lume is installed and the server is running:\nlume serve"}
      />
    );
  }
  return (
    <List.EmptyView
      icon={Icon.Desktop}
      title="No virtual machines"
      description={"Create one with:\nlume create --name my-vm --os macOS"}
    />
  );
}

export default function Command() {
  const {
    data: vms,
    isLoading,
    error,
    mutate,
  } = useFetch<VM[]>(`${API_BASE}/lume/vms`, {
    keepPreviousData: true,
  });

  useEffect(() => {
    if (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to load VMs", message: error.message });
    }
  }, [error]);

  return (
    <List isLoading={isLoading}>
      {(vms ?? []).length === 0 && !isLoading ? emptyView(error) : null}
      {(vms ?? []).map((vm) => (
        <List.Item
          key={vm.name}
          title={vm.name}
          accessories={[
            { text: vm.os },
            { text: `${vm.cpuCount} CPU` },
            { text: `${Math.round(vm.memorySize / 1024 ** 3)} GB` },
            {
              icon:
                vm.status === "running"
                  ? { source: Icon.CircleFilled, tintColor: Color.Green }
                  : { source: Icon.CircleFilled, tintColor: Color.SecondaryText },
              text: vm.status,
            },
          ]}
          actions={
            <ActionPanel>
              {vm.status !== "running" && (
                <Action
                  title="Start"
                  icon={Icon.Play}
                  onAction={async () => {
                    const toast = await showToast({ style: Toast.Style.Animated, title: `Starting ${vm.name}…` });
                    try {
                      await mutate(
                        fetch(`${API_BASE}/lume/vms/${vm.name}/run`, { method: "POST" }).then(async (r) => {
                          if (!r.ok) {
                            const body = await r.json().catch(() => ({}));
                            throw new Error((body as { message?: string }).message ?? `${r.status} ${r.statusText}`);
                          }
                        }),
                        {
                          optimisticUpdate: (current) =>
                            current?.map((v) => (v.name === vm.name ? { ...v, status: "running" } : v)),
                        },
                      );
                      toast.style = Toast.Style.Success;
                      toast.title = `${vm.name} started`;
                    } catch (e) {
                      toast.style = Toast.Style.Failure;
                      toast.title = "Failed to start";
                      toast.message = e instanceof Error ? e.message : String(e);
                    }
                  }}
                />
              )}
              {vm.status === "running" && (
                <Action
                  title="Stop"
                  icon={Icon.Stop}
                  onAction={async () => {
                    const toast = await showToast({ style: Toast.Style.Animated, title: `Stopping ${vm.name}…` });
                    try {
                      await mutate(
                        fetch(`${API_BASE}/lume/vms/${vm.name}/stop`, { method: "POST" }).then(async (r) => {
                          if (!r.ok) {
                            const body = await r.json().catch(() => ({}));
                            throw new Error((body as { message?: string }).message ?? `${r.status} ${r.statusText}`);
                          }
                        }),
                        {
                          optimisticUpdate: (current) =>
                            current?.map((v) => (v.name === vm.name ? { ...v, status: "stopped" } : v)),
                        },
                      );
                      toast.style = Toast.Style.Success;
                      toast.title = `${vm.name} stopped`;
                    } catch (e) {
                      toast.style = Toast.Style.Failure;
                      toast.title = "Failed to stop";
                      toast.message = e instanceof Error ? e.message : String(e);
                    }
                  }}
                />
              )}
              <Action.CopyToClipboard content={vm.name} />
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  const confirmed = await confirmAlert({
                    title: `Delete ${vm.name}?`,
                    message: "This will permanently delete the VM and its files.",
                    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                  });
                  if (!confirmed) return;

                  const toast = await showToast({ style: Toast.Style.Animated, title: `Deleting ${vm.name}…` });
                  try {
                    await mutate(
                      fetch(`${API_BASE}/lume/vms/${vm.name}`, { method: "DELETE" }).then(async (r) => {
                        if (!r.ok) {
                          const body = await r.json().catch(() => ({}));
                          throw new Error((body as { message?: string }).message ?? `${r.status} ${r.statusText}`);
                        }
                      }),
                      {
                        optimisticUpdate: (current) => current?.filter((v) => v.name !== vm.name),
                      },
                    );
                    toast.style = Toast.Style.Success;
                    toast.title = `${vm.name} deleted`;
                  } catch (e) {
                    toast.style = Toast.Style.Failure;
                    toast.title = "Failed to delete";
                    toast.message = e instanceof Error ? e.message : String(e);
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
