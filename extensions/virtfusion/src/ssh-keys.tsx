import { useCachedPromise } from "@raycast/utils";
import { Panel } from "./types";
import VirtFusion from "./virtfusion";
import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";

export default function SSHKeys({ panel }: { panel: Panel }) {
  const {
    isLoading,
    data: keys,
    pagination,
    mutate,
  } = useCachedPromise(
    () => async (options) => {
      const vf = new VirtFusion(panel);
      const servers = await vf.listAccountSSHKeys({ page: options.page + 1 });
      return { data: servers.data, hasMore: !!servers.next_page_url };
    },
    [],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading} pagination={pagination}>
      {keys.map((key) => (
        <List.Item
          key={key.id}
          icon={{ source: Icon.Key, tintColor: key.enabled ? Color.Green : Color.Red }}
          title={key.name}
          accessories={[{ date: new Date(key.created) }]}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Trash}
                title="Delete Key"
                onAction={() =>
                  confirmAlert({
                    icon: { source: Icon.Info, tintColor: Color.Red },
                    title: "Delete SSH Key",
                    message: "Are you sure you want to delete this SSH key?",
                    primaryAction: {
                      style: Alert.ActionStyle.Destructive,
                      title: "Delete",
                      async onAction() {
                        const vf = new VirtFusion(panel);
                        const toast = await showToast(Toast.Style.Animated, "Deleting", key.name);
                        try {
                          await mutate(vf.deleteAccountSSHKey(key.id), {
                            optimisticUpdate(data) {
                              return data.filter((k) => k.id !== key.id);
                            },
                            shouldRevalidateAfter: false,
                          });
                          toast.style = Toast.Style.Success;
                          toast.title = "Deleted";
                        } catch (error) {
                          toast.style = Toast.Style.Failure;
                          toast.title = "Failed";
                          toast.message = `${error}`;
                        }
                      },
                    },
                  })
                }
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
