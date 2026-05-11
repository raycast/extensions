import { Action, ActionPanel, Form, showToast, Toast, popToRoot, open, Icon } from "@raycast/api";
import { useState } from "react";
import { wp, useCategories, getTitle, getEditPostUrl } from "./utils";

export default function QuickPost() {
  const { data: categories } = useCategories();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { title: string; content: string; categories: string[] }, publish: boolean) {
    if (!values.title.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Title required",
        message: "Please enter a title for your post",
      });
      return;
    }

    setIsLoading(true);

    try {
      const post = await wp.createPost({
        title: values.title,
        content: values.content,
        categories: values.categories.map(Number),
        status: publish ? "publish" : "draft",
      });

      await showToast({
        style: Toast.Style.Success,
        title: publish ? "Post published!" : "Draft saved!",
        message: getTitle(post),
        primaryAction: {
          title: "View Post",
          onAction: () => open(post.link),
        },
        secondaryAction: {
          title: "Edit in WordPress",
          onAction: () => open(getEditPostUrl(post.id)),
        },
      });

      popToRoot();
    } catch (error) {
      // Error handled by API
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Quick Post"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Publish Now"
            icon={Icon.CheckCircle}
            onSubmit={(values) =>
              handleSubmit(values as { title: string; content: string; categories: string[] }, true)
            }
          />
          <Action.SubmitForm
            title="Save as Draft"
            icon={Icon.Document}
            onSubmit={(values) =>
              handleSubmit(values as { title: string; content: string; categories: string[] }, false)
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="What's on your mind?" autoFocus />

      <Form.TextArea id="content" title="Content" placeholder="Write your post content..." enableMarkdown />

      {categories && categories.length > 0 && (
        <Form.TagPicker id="categories" title="Categories">
          {categories.map((cat) => (
            <Form.TagPicker.Item key={cat.id} value={String(cat.id)} title={cat.name} />
          ))}
        </Form.TagPicker>
      )}

      <Form.Description title="Tip" text="Press ⌘+Enter to publish immediately, or ⌘+⇧+Enter to save as draft." />
    </Form>
  );
}
