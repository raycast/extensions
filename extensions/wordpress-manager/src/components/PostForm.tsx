import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { wp } from "../utils/api";
import { useCategories, useTags } from "../utils/hooks";
import { WPPost, CreatePostParams } from "../utils/types";
import { getTitle } from "../utils/helpers";

interface PostFormProps {
  post?: WPPost;
  onSuccess?: (post: WPPost) => void;
}

export function PostForm({ post, onSuccess }: PostFormProps) {
  const { pop } = useNavigation();
  const { data: categories } = useCategories();
  const { data: tags } = useTags();

  const [isLoading, setIsLoading] = useState(false);
  const [titleError, setTitleError] = useState<string>();

  const isEditing = !!post;

  async function handleSubmit(values: {
    title: string;
    content: string;
    excerpt: string;
    status: string;
    categories: string[];
    tags: string[];
    sticky: boolean;
  }) {
    if (!values.title.trim()) {
      setTitleError("Title is required");
      return;
    }

    setIsLoading(true);

    const data: CreatePostParams = {
      title: values.title,
      content: values.content,
      excerpt: values.excerpt,
      status: values.status as CreatePostParams["status"],
      categories: values.categories.map(Number),
      tags: values.tags.map(Number),
      sticky: values.sticky,
    };

    try {
      let result: WPPost;

      if (isEditing) {
        result = await wp.updatePost(post.id, data);
        await showToast({
          style: Toast.Style.Success,
          title: "Post updated",
          message: getTitle(result),
        });
      } else {
        result = await wp.createPost(data);
        await showToast({
          style: Toast.Style.Success,
          title: "Post created",
          message: getTitle(result),
        });
      }

      onSuccess?.(result);
      pop();
    } catch (error) {
      // Error toast already shown by API
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={isEditing ? `Edit: ${getTitle(post)}` : "Create Post"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Update Post" : "Create Post"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter post title"
        defaultValue={post?.title.raw || post?.title.rendered || ""}
        error={titleError}
        onChange={() => setTitleError(undefined)}
      />

      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Write your post content (HTML or plain text)"
        defaultValue={post?.content.raw || ""}
        enableMarkdown
      />

      <Form.TextArea
        id="excerpt"
        title="Excerpt"
        placeholder="Brief summary of the post"
        defaultValue={post?.excerpt.raw || ""}
      />

      <Form.Separator />

      <Form.Dropdown id="status" title="Status" defaultValue={post?.status || "draft"}>
        <Form.Dropdown.Item value="draft" title="Draft" />
        <Form.Dropdown.Item value="publish" title="Published" />
        <Form.Dropdown.Item value="pending" title="Pending Review" />
        <Form.Dropdown.Item value="private" title="Private" />
      </Form.Dropdown>

      {categories && categories.length > 0 && (
        <Form.TagPicker id="categories" title="Categories" defaultValue={post?.categories?.map(String) || []}>
          {categories.map((cat) => (
            <Form.TagPicker.Item key={cat.id} value={String(cat.id)} title={cat.name} />
          ))}
        </Form.TagPicker>
      )}

      {tags && tags.length > 0 && (
        <Form.TagPicker id="tags" title="Tags" defaultValue={post?.tags?.map(String) || []}>
          {tags.map((tag) => (
            <Form.TagPicker.Item key={tag.id} value={String(tag.id)} title={tag.name} />
          ))}
        </Form.TagPicker>
      )}

      <Form.Checkbox id="sticky" label="Sticky post" defaultValue={post?.sticky || false} />
    </Form>
  );
}
