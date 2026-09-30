import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { API_HEADERS, callApi, generateApiUrl } from "../api";
import { useFetch, useForm } from "@raycast/utils";
import { SnapshotResource } from "../types";
import { useMemo } from "react";

export default function Snapshots({ serverId }: { serverId: number }) {
  const {
    isLoading,
    data: snapshots,
    revalidate,
    mutate,
  } = useFetch(generateApiUrl(`servers/${serverId}/snapshots`), {
    headers: API_HEADERS,
    mapResult(result: { data: SnapshotResource[] }) {
      return {
        data: result.data,
      };
    },
    initialData: [],
  });

  async function confirmAndRemove(snapshot: SnapshotResource) {
    const options: Alert.Options = {
      title: "Do you really want to remove this snapshot?",
      message: snapshot.name,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    };
    if (await confirmAlert(options)) {
      const toast = await showToast(Toast.Style.Animated, "Removing", snapshot.name);
      try {
        await mutate(callApi(`snapshots/${snapshot.id}`, { method: "DELETE" }), {
          optimisticUpdate(data) {
            return data.filter((s) => s.id !== snapshot.id);
          },
          shouldRevalidateAfter: false,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Removed";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not remove";
        toast.message = `${error}`;
      }
    }
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && !snapshots.length ? (
        <List.EmptyView
          icon={Icon.Camera}
          title="You don't have any Snapshots yet."
          description="We recommend that you power down your server before taking a snapshot to ensure data consistency."
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Camera}
                title="Create Snapshot"
                target={<CreateSnapshot serverId={serverId} onCreate={revalidate} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        snapshots.map((snapshot) => (
          <List.Item
            key={snapshot.id}
            icon={Icon.Camera}
            title={snapshot.name}
            accessories={[
              {
                icon: {
                  source: Icon.CircleFilled,
                  tintColor: snapshot.status === "available" ? Color.Green : undefined,
                },
                text: snapshot.status,
              },
              { text: `${snapshot.size} GiB` },
              { date: new Date(snapshot.created_at) },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Camera}
                  title="Create Snapshot"
                  target={<CreateSnapshot serverId={serverId} onCreate={revalidate} />}
                />
                <Action
                  icon={Icon.Trash}
                  title="Remove"
                  onAction={() => confirmAndRemove(snapshot)}
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function CreateSnapshot({ serverId, onCreate }: { serverId: number; onCreate: () => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ name: string }>({
    async onSubmit(values) {
      const { name } = values;
      const toast = await showToast(Toast.Style.Animated, "Creating", name);
      try {
        await callApi(`servers/${serverId}/snapshots`, { method: "POST", body: name ? { name } : undefined });
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        onCreate();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.message = `${error}`;
      }
    },
  });
  const placeholder = useMemo(() => new Date().toISOString(), []);
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Camera} title="Create Snapshot" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder={placeholder} {...itemProps.name} />
    </Form>
  );
}
