import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  Image,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { Organization, Tag } from "./types";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { papra, PAPRA_COLOR } from "./papra";
import OpenInPapra from "./open-in-papra";

export default function Tags({ organization }: { organization: Organization }) {
  const {
    isLoading,
    data: tags,
    mutate,
  } = useCachedPromise(
    async (organizationId) => {
      const res = await papra.tags.list({ organizationId });
      return res.tags;
    },
    [organization.id],
    { initialData: [] },
  );

  const confirmAndDelete = (tag: Tag) => {
    confirmAlert({
      title: "Delete Tag",
      message: "Are you sure you want to delete this tag? Deleting a tag will remove it from all documents.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete",
        async onAction() {
          const toast = await showToast(Toast.Style.Animated, "Deleting", tag.name);
          try {
            await mutate(papra.tags.delete({ organizationId: organization.id, id: tag.id }), {
              optimisticUpdate(data) {
                return data.filter((t) => t.id !== tag.id);
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
    });
  };

  return (
    <List isLoading={isLoading} navigationTitle={`Organizations / ${organization.name} / Tags`}>
      {!isLoading && !tags.length ? (
        <List.EmptyView
          icon={{ source: Icon.Tag, tintColor: PAPRA_COLOR }}
          title="No tags yet"
          description="This organization has no tags yet. Tags are used to categorize documents. You can add tags to your documents to make them easier to find and organize."
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Create Tag"
                target={<CreateTag organization={organization} />}
                onPop={mutate}
              />
            </ActionPanel>
          }
        />
      ) : (
        tags.map((tag) => (
          <List.Item
            key={tag.id}
            icon={{ source: Icon.Dot, tintColor: tag.color }}
            title={tag.name}
            subtitle={tag.description || "No description"}
            accessories={[{ icon: Icon.Document, text: `${tag.documentsCount}` }, { date: new Date(tag.createdAt) }]}
            actions={
              <ActionPanel>
                <OpenInPapra route="tags" />
                <Action.Push
                  icon={Icon.Plus}
                  title="Create Tag"
                  target={<CreateTag organization={organization} />}
                  onPop={mutate}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete Tag"
                  onAction={() => confirmAndDelete(tag)}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

const COLORS = [
  "#D8FF75",
  "#7FFF7A",
  "#7AFFCE",
  "#7AD7FF",
  "#7A7FFF",
  "#CE7AFF",
  "#FF7AD7",
  "#FF7A7F",
  "#FFCE7A",
  "#FFFFFF",
];
function CreateTag({ organization }: { organization: Organization }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ name: string; color: string; description: string }>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.name);
      try {
        await papra.tags.create({ organizationId: organization.id, tag: values });
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      name: FormValidation.Required,
    },
  });
  return (
    <Form
      navigationTitle={`Organizations / ${organization.name} / Tags / Create`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Tag" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Eg. Contracts" {...itemProps.name} />
      <Form.Dropdown title="Color" {...itemProps.color}>
        {COLORS.map((color) => (
          <Form.Dropdown.Item
            key={color}
            icon={{ source: Icon.CircleFilled, mask: Image.Mask.RoundedRectangle, tintColor: color }}
            title={color}
            value={color}
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        title="Description (optional)"
        placeholder="Eg. All the contracts signed by the company"
        {...itemProps.description}
      />
    </Form>
  );
}
