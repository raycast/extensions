import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import {
  API_BASE_URL,
  Channel,
  ChannelFormValues,
  MissingApiToken,
  apiHeaders,
  createChannel,
  deleteChannel,
  getApiToken,
  parseChannelsResponse,
  updateChannel,
} from "./api";

export default function Command() {
  const apiToken = getApiToken();

  if (!apiToken) {
    return <MissingApiToken />;
  }

  return <ChannelsList apiToken={apiToken} />;
}

function ChannelsList({ apiToken }: { apiToken: string }) {
  const { push } = useNavigation();
  const {
    data = [],
    isLoading,
    revalidate,
  } = useFetch<Channel[], Channel[]>(`${API_BASE_URL}/channels?includeArchived=true`, {
    headers: apiHeaders(apiToken),
    parseResponse: parseChannelsResponse,
    initialData: [],
    onError(error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not load channels",
        message: error instanceof Error ? error.message : undefined,
      });
    },
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search channels">
      <List.EmptyView
        icon={Icon.Folder}
        title="No Channels"
        description="Create your first Notaday channel."
        actions={
          <ActionPanel>
            <Action
              title="Create Channel"
              icon={Icon.Plus}
              onAction={() => push(<ChannelForm apiToken={apiToken} onSaved={revalidate} />)}
            />
          </ActionPanel>
        }
      />

      {data.map((channel) => (
        <List.Item
          key={channel.id}
          icon={{ source: Icon.Folder, tintColor: channel.color || Color.SecondaryText }}
          title={channel.name}
          subtitle={channel.description}
          accessories={channel.archived ? [{ text: "Archived" }] : []}
          actions={
            <ActionPanel>
              <Action
                title="Create Channel"
                icon={Icon.Plus}
                onAction={() => push(<ChannelForm apiToken={apiToken} onSaved={revalidate} />)}
              />
              <Action
                title="Edit Channel"
                icon={Icon.Pencil}
                onAction={() => push(<ChannelForm apiToken={apiToken} channel={channel} onSaved={revalidate} />)}
              />
              <Action
                title="Delete Channel"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDeleteChannel(apiToken, channel, revalidate)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ChannelForm({ apiToken, channel, onSaved }: { apiToken: string; channel?: Channel; onSaved: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: ChannelFormValues) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: channel ? "Updating channel" : "Creating channel",
    });

    try {
      if (channel) {
        await updateChannel(apiToken, channel.id, values);
      } else {
        await createChannel(apiToken, values);
      }

      toast.style = Toast.Style.Success;
      toast.title = channel ? "Channel updated" : "Channel created";
      onSaved();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = channel ? "Could not update channel" : "Could not create channel";
      toast.message = error instanceof Error ? error.message : undefined;
    }
  }

  return (
    <Form
      navigationTitle={channel ? `Edit ${channel.name}` : "Create Channel"}
      actions={
        <ActionPanel>
          <Action.SubmitForm<ChannelFormValues>
            title={channel ? "Save Channel" : "Create Channel"}
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={channel?.name ?? ""} autoFocus />
      <Form.TextArea id="description" title="Description" defaultValue={channel?.description ?? ""} />
      <Form.TextField id="color" title="Color" defaultValue={channel?.color ?? "#8fd3c7"} placeholder="#8fd3c7" />
      <Form.Checkbox id="archived" title="Archive" label="Archived" defaultValue={channel?.archived ?? false} />
    </Form>
  );
}

async function handleDeleteChannel(apiToken: string, channel: Channel, revalidate: () => void) {
  const confirmed = await confirmAlert({
    title: `Delete ${channel.name}?`,
    message: "This cannot be undone.",
    primaryAction: { title: "Delete Channel", style: Alert.ActionStyle.Destructive },
  });

  if (!confirmed) {
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting channel" });

  try {
    await deleteChannel(apiToken, channel.id);
    toast.style = Toast.Style.Success;
    toast.title = "Channel deleted";
    revalidate();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not delete channel";
    toast.message = error instanceof Error ? error.message : undefined;
  }
}
