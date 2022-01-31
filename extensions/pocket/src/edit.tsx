import {
  ActionPanel,
  ActionPanelItem,
  Color,
  Form,
  FormSeparator,
  FormTagPicker,
  FormTagPickerItem,
  FormTextField,
  Icon,
  showToast,
  SubmitFormAction,
  Toast,
  ToastStyle,
  useNavigation
} from "@raycast/api";
import { useAvailableTags } from "./utils/hooks";
import { createBookmark } from "./utils/api";
import { Bookmark } from "./utils/types";

interface UpdateFormValues {
  title: string;
  url: string;
  tags: string[];
}

interface EditFormProps {
  bookmark: Bookmark;
  onArchive: () => void;
  onDelete: () => void;
  onFavorite: () => void;
}

export default function Edit({ bookmark, onArchive, onDelete, onFavorite }: EditFormProps) {
  const { tags, loading } = useAvailableTags();
  const { pop } = useNavigation();

  async function onSubmit(values: UpdateFormValues) {
    const toast = new Toast({
      title: "Updating bookmark",
      message: values.url,
      style: ToastStyle.Animated
    });

    try {
      if (values.url.trim() === "") {
        showToast(ToastStyle.Failure, "URL is required");
        return;
      }
      if (!values.url.startsWith("http")) {
        showToast(ToastStyle.Failure, "URL must start with HTTP");
        return;
      }

      toast.show();
      await createBookmark(values);
      toast.style = ToastStyle.Success;
      toast.title = "Bookmark updated";
      pop();
    } catch {
      toast.style = ToastStyle.Failure;
      toast.title = "Failed to update bookmark";
    }
  }

  return (
    <Form
      isLoading={loading}
      navigationTitle="Edit Bookmark"
      actions={
        <ActionPanel title={bookmark.title}>
          <ActionPanel.Section>
            <SubmitFormAction icon={Icon.Download} title="Update Bookmark" onSubmit={onSubmit} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ActionPanelItem
              title="Archive Bookmark"
              shortcut={{ modifiers: ["cmd"], key: "a" }}
              icon={Icon.Checkmark}
              onAction={onArchive}
            />
            <ActionPanelItem
              icon={{ source: Icon.Trash, tintColor: Color.Red }}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              title="Delete Bookmark"
              onAction={onDelete}
            />
            <ActionPanelItem
              title={`${bookmark.favorite ? "Unmark" : "Mark"} as Favorite`}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              icon={Icon.Star}
              onAction={onFavorite}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <FormTextField defaultValue={bookmark.originalUrl} id="url" title="URL" placeholder="https://www.raycast.com/" />
      <FormSeparator />
      <FormTagPicker defaultValue={bookmark.tags} id="tags" title="Tags" placeholder="software, productivity">
        {(tags.length === 0 ? bookmark.tags : tags).map((tag) => (
          <FormTagPickerItem key={tag} value={tag} title={tag} />
        ))}
      </FormTagPicker>
      <FormTextField defaultValue={bookmark.title} id="title" title="Title" placeholder="Raycast Website" />
    </Form>
  );
}
