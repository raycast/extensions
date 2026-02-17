import { Form, ActionPanel, Action, showToast, Icon, Toast, popToRoot } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { Bookmark, BookmarkFormValues } from "./types";
import { addBookmark } from "./api";
import { usePinboardTags } from "./hooks/usePinboardTags";
import { isValidURL } from "./utils";

export default function Command() {
  const { tags, isLoading: tagsLoading } = usePinboardTags();

  const { handleSubmit, itemProps } = useForm<BookmarkFormValues>({
    async onSubmit(values) {
      const toast = await showToast({ title: "Pinning bookmark...", style: Toast.Style.Animated });

      try {
        const bookmark: Bookmark = {
          id: "",
          url: values.url,
          title: values.title,
          description: "",
          tags: values.tags.join(" "),
          private: values.private,
          readLater: values.readLater,
        };
        await addBookmark(bookmark);
        toast.style = Toast.Style.Success;
        toast.title = "Successfully added bookmark";
        popToRoot();
      } catch (error) {
        console.error("addBookmark error", error);
        toast.title = "Could not pin bookmark";
        toast.message = String(error);
        toast.style = Toast.Style.Failure;
      }
    },
    validation: {
      url: (value) => {
        if (value?.length === 0) {
          return "The item is required";
        } else if (value && !isValidURL(value)) {
          return "Enter a valid URL";
        }
      },
      title: FormValidation.Required,
    },
    initialValues: {
      tags: [],
    },
  });

  return (
    <Form
      isLoading={tagsLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Bookmark" icon={{ source: Icon.Plus }} onSubmit={handleSubmit} />
          <Action.OpenInBrowser title="Open Pinboard" url="https://pinboard.in" />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="URL"
        placeholder="Enter URL (Tip: Select a URL before opening this form)"
        {...itemProps.url}
      />
      <Form.TextField title="Title" placeholder="Enter title" {...itemProps.title} />
      <Form.Separator />
      <Form.TagPicker title="Tags" placeholder="Select tags..." {...itemProps.tags}>
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.name} value={tag.name} title={`${tag.name} (${tag.count})`} />
        ))}
      </Form.TagPicker>
      <Form.Checkbox title="" label="Private" storeValue {...itemProps.private} />
      <Form.Checkbox title="" label="Read Later" storeValue {...itemProps.readLater} />
    </Form>
  );
}
