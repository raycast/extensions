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
  MissingApiToken,
  Tag,
  TagFormValues,
  apiHeaders,
  createTag,
  deleteTag,
  getApiToken,
  parseTagsResponse,
  updateTag,
} from "./api";

export default function Command() {
  const apiToken = getApiToken();

  if (!apiToken) {
    return <MissingApiToken />;
  }

  return <TagsList apiToken={apiToken} />;
}

function TagsList({ apiToken }: { apiToken: string }) {
  const { push } = useNavigation();
  const {
    data = [],
    isLoading,
    revalidate,
  } = useFetch<Tag[], Tag[]>(`${API_BASE_URL}/tags?includeArchived=true`, {
    headers: apiHeaders(apiToken),
    parseResponse: parseTagsResponse,
    initialData: [],
    onError(error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not load tags",
        message: error instanceof Error ? error.message : undefined,
      });
    },
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tags">
      <List.EmptyView
        icon={Icon.Tag}
        title="No Tags"
        description="Create your first Notaday tag."
        actions={
          <ActionPanel>
            <Action
              title="Create Tag"
              icon={Icon.Plus}
              onAction={() => push(<TagForm apiToken={apiToken} onSaved={revalidate} />)}
            />
          </ActionPanel>
        }
      />

      {data.map((tag) => (
        <List.Item
          key={tag.id}
          icon={{ source: Icon.Tag, tintColor: tag.color || Color.SecondaryText }}
          title={tag.name}
          accessories={tag.archived ? [{ text: "Archived" }] : []}
          actions={
            <ActionPanel>
              <Action
                title="Create Tag"
                icon={Icon.Plus}
                onAction={() => push(<TagForm apiToken={apiToken} onSaved={revalidate} />)}
              />
              <Action
                title="Edit Tag"
                icon={Icon.Pencil}
                onAction={() => push(<TagForm apiToken={apiToken} tag={tag} onSaved={revalidate} />)}
              />
              <Action
                title="Delete Tag"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDeleteTag(apiToken, tag, revalidate)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function TagForm({ apiToken, tag, onSaved }: { apiToken: string; tag?: Tag; onSaved: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: TagFormValues) {
    const toast = await showToast({ style: Toast.Style.Animated, title: tag ? "Updating tag" : "Creating tag" });

    try {
      if (tag) {
        await updateTag(apiToken, tag.id, values);
      } else {
        await createTag(apiToken, values);
      }

      toast.style = Toast.Style.Success;
      toast.title = tag ? "Tag updated" : "Tag created";
      onSaved();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = tag ? "Could not update tag" : "Could not create tag";
      toast.message = error instanceof Error ? error.message : undefined;
    }
  }

  return (
    <Form
      navigationTitle={tag ? `Edit ${tag.name}` : "Create Tag"}
      actions={
        <ActionPanel>
          <Action.SubmitForm<TagFormValues>
            title={tag ? "Save Tag" : "Create Tag"}
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={tag?.name ?? ""} autoFocus />
      <Form.TextField id="color" title="Color" defaultValue={tag?.color ?? "#8a8a8a"} placeholder="#8a8a8a" />
      <Form.Checkbox id="archived" title="Archive" label="Archived" defaultValue={tag?.archived ?? false} />
    </Form>
  );
}

async function handleDeleteTag(apiToken: string, tag: Tag, revalidate: () => void) {
  const confirmed = await confirmAlert({
    title: `Delete ${tag.name}?`,
    message: "This cannot be undone.",
    primaryAction: { title: "Delete Tag", style: Alert.ActionStyle.Destructive },
  });

  if (!confirmed) {
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting tag" });

  try {
    await deleteTag(apiToken, tag.id);
    toast.style = Toast.Style.Success;
    toast.title = "Tag deleted";
    revalidate();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not delete tag";
    toast.message = error instanceof Error ? error.message : undefined;
  }
}
