import {
  ActionPanel,
  Form,
  FormSeparator,
  FormTagPicker,
  FormTagPickerItem,
  FormTextField,
  Icon,
  popToRoot,
  showToast,
  SubmitFormAction,
  Toast,
  ToastStyle,
} from "@raycast/api";
import { useAvailableTags } from "./utils/hooks";
import { createBookmark } from "./utils/api";

interface CreateFormValues {
  title: string;
  url: string;
  tags: string[];
}

export default function Create() {
  const { tags, loading } = useAvailableTags();

  async function onSubmit(values: CreateFormValues) {
    const toast = new Toast({
      title: "Creating bookmark",
      style: ToastStyle.Animated,
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
      toast.title = "Bookmark created";
      toast.message = values.title || values.url;
      popToRoot({ clearSearchBar: true });
    } catch {
      toast.style = ToastStyle.Failure;
      toast.title = "Failed to create bookmark";
      toast.message = values.title || values.url;
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
      <FormSeparator />
      <FormTagPicker id="tags" title="Tags" placeholder="software, productivity">
        {tags.map((tag) => (
          <FormTagPickerItem key={tag} value={tag} title={tag} />
        ))}
      </FormTagPicker>
      <FormTextField id="title" title="Title" placeholder="Raycast Website" />
    </Form>
  );
}
