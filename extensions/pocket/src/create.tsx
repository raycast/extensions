import {
  ActionPanel,
  Form,
  FormTagPicker,
  FormTagPickerItem,
  FormTextField,
  Icon,
  open,
  showToast,
  SubmitFormAction,
  Toast,
  ToastStyle,
  useNavigation
} from "@raycast/api";
import { useAvailableTags } from "./utils/hooks";
import { createBookmark } from "./utils/api";
import Search from "./search";

interface CreateFormValues {
  url: string;
  tags: string[];
}

export default function Create() {
  const { tags, loading } = useAvailableTags();
  const { push } = useNavigation();

  async function onSubmit(values: CreateFormValues) {
    const toast = new Toast({
      title: "Creating bookmark",
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
      const bookmark = await createBookmark(values);
      toast.style = ToastStyle.Success;
      toast.title = "Bookmark created";
      toast.message = bookmark.item.title;
      toast.primaryAction = {
        title: "Open in Pocket",
        shortcut: { modifiers: ["cmd", "shift"], key: "o" },
        onAction: () => open(`https://getpocket.com/read/${bookmark.item.item_id}`)
      };
      push(<Search />);
    } catch (error) {
      toast.style = ToastStyle.Failure;
      toast.title = "Failed to create bookmark";
    }
  }

  return (
    <Form
      isLoading={loading}
      navigationTitle="New Bookmark"
      actions={
        <ActionPanel>
          <SubmitFormAction icon={Icon.Plus} title="Create Bookmark" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <FormTextField id="url" title="URL" placeholder="https://www.raycast.com/" />
      <FormTagPicker id="tags" title="Tags" placeholder="software, productivity">
        {tags.map((tag) => (
          <FormTagPickerItem key={tag} value={tag} title={tag} />
        ))}
      </FormTagPicker>
    </Form>
  );
}
