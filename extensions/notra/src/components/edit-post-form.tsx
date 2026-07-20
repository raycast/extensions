import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { updatePost } from "../lib/notra";
import type { Post } from "../types";
import { getErrorMessage, notraUrl } from "../utils";

interface EditPostFormValues {
  markdown: string;
  slug?: string;
  title: string;
}

interface EditPostFormProps {
  onPostUpdated?: () => Promise<void> | void;
  post: Post;
}

export function EditPostForm({ post, onPostUpdated }: EditPostFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const supportsSlug = post.contentType === "blog_post" || post.contentType === "changelog";

  async function handleSubmit(values: EditPostFormValues) {
    const title = values.title.trim();
    const markdown = values.markdown.trim();

    if (!(title && markdown)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Title and content are required",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving post",
    });

    setIsLoading(true);

    try {
      await updatePost(post.id, {
        title,
        markdown,
        status: post.status,
        ...(supportsSlug ? { slug: values.slug?.trim() || null } : {}),
      });
      await onPostUpdated?.();
      toast.style = Toast.Style.Success;
      toast.title = "Post updated";
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not update post";
      toast.message = getErrorMessage(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} shortcut={{ modifiers: ["cmd"], key: "s" }} title="Save Changes" />
          <Action.OpenInBrowser
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            title="View on Notra"
            url={notraUrl(`/content/${post.id}`)}
          />
        </ActionPanel>
      }
      isLoading={isLoading}
      navigationTitle="Edit Post"
    >
      <Form.TextField defaultValue={post.title} id="title" placeholder="Title" title="Title" />
      {supportsSlug && (
        <Form.TextField defaultValue={post.slug ?? ""} id="slug" placeholder="my-post-slug (optional)" title="Slug" />
      )}
      <Form.TextArea defaultValue={post.markdown} id="markdown" placeholder="Content" title="Content" />
    </Form>
  );
}
