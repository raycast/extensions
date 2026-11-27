import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { errorMessage, getClient } from "./rerout";

export default function Tags() {
  const client = getClient();
  const { data, isLoading, revalidate } = usePromise(async () => {
    const result = await client.tags.list();
    return result.tags;
  });

  async function deleteTag(id: string, name: string) {
    const confirmed = await confirmAlert({
      title: `Delete "${name}"?`,
      message: "The tag is removed from all links.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting…",
    });
    try {
      await client.tags.delete(id);
      toast.style = Toast.Style.Success;
      toast.title = `Deleted ${name}`;
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not delete";
      toast.message = errorMessage(error);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter tags…">
      {(data ?? []).map((tag) => (
        <List.Item
          key={tag.id}
          icon={{ source: Icon.Tag, tintColor: Color.PrimaryText }}
          title={tag.name}
          subtitle={tag.color}
          accessories={[
            {
              text: `${tag.link_count} link${tag.link_count === 1 ? "" : "s"}`,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Tag"
                icon={Icon.Plus}
                target={<CreateTag onCreated={revalidate} />}
              />
              <Action.CopyToClipboard title="Copy Tag ID" content={tag.id} />
              <Action
                title="Delete Tag"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => deleteTag(tag.id, tag.name)}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView
        title="No Tags Yet"
        description="Create one from the actions menu (⌘K)."
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Tag"
              icon={Icon.Plus}
              target={<CreateTag onCreated={revalidate} />}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

function CreateTag({ onCreated }: { onCreated: () => void }) {
  const { pop } = useNavigation();

  async function submit(values: { name: string; color: string }) {
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating tag…",
    });
    try {
      await getClient().tags.create({
        name: values.name.trim(),
        ...(values.color.trim() ? { color: values.color.trim() } : {}),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Tag created";
      onCreated();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not create tag";
      toast.message = errorMessage(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Tag"
            icon={Icon.Plus}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Spring 2026" />
      <Form.TextField id="color" title="Color" placeholder="teal (optional)" />
    </Form>
  );
}
