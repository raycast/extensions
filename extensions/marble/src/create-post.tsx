import { ActionPanel, Action, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useFetch, showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { CategoriesResponse, TagsResponse, AuthorsResponse, Category, Tag, Author } from "./types";
import { BASE_URL, getHeaders, generateSlug, setCache, extractError } from "./api";
import { postSchema } from "./schemas";

export default function Command() {
  const { pop } = useNavigation();
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slug, setSlug] = useState("");

  const { data: categories = [], isLoading: categoriesLoading } = useFetch(`${BASE_URL}/categories?limit=100`, {
    headers: getHeaders(),
    mapResult(result: CategoriesResponse) {
      setCache("categories", result.categories);
      return { data: result.categories };
    },
    initialData: [] as Category[],
  });

  const { data: tags = [] } = useFetch(`${BASE_URL}/tags?limit=100`, {
    headers: getHeaders(),
    mapResult(result: TagsResponse) {
      setCache("tags", result.tags);
      return { data: result.tags };
    },
    initialData: [] as Tag[],
  });

  const { data: authors = [] } = useFetch(`${BASE_URL}/authors?limit=100`, {
    headers: getHeaders(),
    mapResult(result: AuthorsResponse) {
      setCache("authors", result.authors);
      return { data: result.authors };
    },
    initialData: [] as Author[],
  });

  async function handleSubmit(values: Record<string, unknown>) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Creating post..." });
      const response = await fetch(`${BASE_URL}/posts`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(postSchema.parse(values)),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(extractError(body, "Failed to create post"));
      }
      await showToast({ style: Toast.Style.Success, title: "Post created" });
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to create post" });
    }
  }

  return (
    <Form
      isLoading={categoriesLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Post" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="My New Post"
        onChange={(value) => {
          if (!slugManuallyEdited) {
            setSlug(generateSlug(value));
          }
        }}
      />
      <Form.TextField
        id="slug"
        title="Slug"
        placeholder="my-new-post"
        value={slug}
        onChange={(value) => {
          setSlug(value);
          setSlugManuallyEdited(true);
        }}
      />
      <Form.TextArea id="description" title="Description" placeholder="A short description of your post" />
      <Form.TextArea id="content" title="Content" placeholder="Write your post content here..." enableMarkdown />
      <Form.Dropdown id="categoryId" title="Category">
        {categories.map((cat: Category) => (
          <Form.Dropdown.Item key={cat.id} value={cat.id} title={cat.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="status" title="Status" defaultValue="draft">
        <Form.Dropdown.Item value="draft" title="Draft" />
        <Form.Dropdown.Item value="published" title="Published" />
      </Form.Dropdown>
      <Form.TagPicker id="tags" title="Tags">
        {tags.map((tag: Tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
        ))}
      </Form.TagPicker>
      <Form.TagPicker id="authors" title="Authors">
        {authors.map((author: Author) => (
          <Form.TagPicker.Item key={author.id} value={author.id} title={author.name} />
        ))}
      </Form.TagPicker>
      <Form.Checkbox id="featured" label="Featured" defaultValue={false} />
      <Form.TextField id="coverImage" title="Cover Image URL" placeholder="https://example.com/image.png" />
    </Form>
  );
}
