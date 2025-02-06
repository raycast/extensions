import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { createBookmark, updateBookmark, Bookmark } from "./api";

type FormValues = {
  title: string;
  link: string;
  tags?: string;
  description?: string;
};

export default function BookmarkForm(props: { bookmark?: Bookmark; title?: string; onPop?: () => void }) {
  const { pop } = useNavigation();
  const { itemProps, handleSubmit, reset, focus } = useForm<FormValues>({
    initialValues: props.bookmark,
    validation: {
      title(value) {
        return value ? undefined : "The title is required";
      },
      link(value) {
        return value ? undefined : "The link is required";
      },
    },
    async onSubmit(values) {
      await showToast({
        style: Toast.Style.Animated,
        title: props.bookmark ? "Updating bookmark" : "Creating bookmark",
      });

      try {
        if (props.bookmark) {
          await updateBookmark(props.bookmark, {
            title: values.title,
            link: values.link,
            tags: values.tags,
            description: values.description,
          });
          await showToast({ style: Toast.Style.Success, title: "Updated user" });

          if (props.bookmark) {
            if (props.onPop) {
              props.onPop();
            }

            pop();
          }
        } else {
          await createBookmark(values.title, values.link, values.tags, values.description);
          await showToast({ style: Toast.Style.Success, title: "Created bookmark" });

          reset();
          focus("title");
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: props.bookmark ? "Failed updating bookmark" : "Failed creating bookmark",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });

  return (
    <Form
      navigationTitle={props.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={props.bookmark ? "Update Bookmark" : "Create Bookmark"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField key="title" title="Title" placeholder="Ada" autoFocus {...itemProps.title} />
      <Form.TextField key="link" title="Link" placeholder="https://lovelace.com" {...itemProps.link} />
      <Form.TextField key="tags" title="Tags" placeholder="lovelace, ada, computer" {...itemProps.tags} />
      <Form.TextArea
        key="description"
        title="Description"
        placeholder="Ada Lovelace was an English mathematician and writer."
        {...itemProps.description}
      />
    </Form>
  );
}
