import CreatePost from "./create-post";
import {
  ActionPanel,
  Action,
  List,
  Detail,
  Icon,
  Color,
  Form,
  useNavigation,
  confirmAlert,
  Alert,
  showToast,
  Toast,
} from "@raycast/api";
import { useFetch, showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { PostsResponse, Post, CategoriesResponse, TagsResponse, AuthorsResponse, Category, Tag, Author } from "./types";
import { BASE_URL, getHeaders, setCache, extractError } from "./api";
import { postSchema } from "./schemas";

function PostDetail({ post, revalidateList }: { post: Post; revalidateList: () => void }) {
  const { data: fullPost, isLoading } = useFetch(`${BASE_URL}/posts/${post.id}?format=markdown&status=all`, {
    headers: getHeaders(),
    mapResult(result: { post: Post }) {
      return { data: result.post };
    },
  });

  const display = fullPost ?? post;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={display.title}
      markdown={display.content || "*No content*"}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={display.status === "published" ? "Published" : "Draft"}
              color={display.status === "published" ? Color.Green : Color.Orange}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Category" text={display.category?.name || "None"} />
          <Detail.Metadata.Label
            title="Tags"
            text={display.tags?.length > 0 ? display.tags.map((t) => t.name).join(", ") : "None"}
          />
          <Detail.Metadata.Separator />
          {display.authors?.length > 0 && (
            <Detail.Metadata.Label title="Authors" text={display.authors.map((a) => a.name).join(", ")} />
          )}
          <Detail.Metadata.Label
            title="Published"
            text={display.publishedAt ? new Date(display.publishedAt).toLocaleDateString() : "---"}
          />
          <Detail.Metadata.Label
            title="Updated"
            text={display.updatedAt ? new Date(display.updatedAt).toLocaleDateString() : "---"}
          />
          <Detail.Metadata.Label title="Featured" icon={display.featured ? Icon.Star : Icon.StarDisabled} />
          <Detail.Metadata.Label title="Slug" text={display.slug} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Post"
            icon={Icon.Pencil}
            target={<EditPostForm post={display} onEdit={revalidateList} />}
          />
          <Action.CopyToClipboard
            title="Copy Slug"
            content={display.slug}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          <Action.CopyToClipboard
            title="Copy Post ID"
            content={display.id}
            shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}

function EditPostForm({ post, onEdit }: { post: Post; onEdit: () => void }) {
  const { pop } = useNavigation();

  const { data: markdownPost, isLoading: postLoading } = useFetch(
    `${BASE_URL}/posts/${post.id}?format=markdown&status=all`,
    {
      headers: getHeaders(),
      mapResult(result: { post: Post }) {
        return { data: result.post };
      },
    },
  );

  const { data: categories = [], isLoading: catsLoading } = useFetch(`${BASE_URL}/categories?limit=100`, {
    headers: getHeaders(),
    mapResult(result: CategoriesResponse) {
      setCache("categories", result.categories);
      return { data: result.categories };
    },
    initialData: [] as Category[],
  });

  const { data: tags = [], isLoading: tagsLoading } = useFetch(`${BASE_URL}/tags?limit=100`, {
    headers: getHeaders(),
    mapResult(result: TagsResponse) {
      setCache("tags", result.tags);
      return { data: result.tags };
    },
    initialData: [] as Tag[],
  });

  const { data: authors = [], isLoading: authorsLoading } = useFetch(`${BASE_URL}/authors?limit=100`, {
    headers: getHeaders(),
    mapResult(result: AuthorsResponse) {
      setCache("authors", result.authors);
      return { data: result.authors };
    },
    initialData: [] as Author[],
  });

  const isLoading = postLoading || catsLoading || tagsLoading || authorsLoading;

  async function handleSubmit(values: Record<string, unknown>) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Updating post..." });
      const response = await fetch(`${BASE_URL}/posts/${post.id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(postSchema.parse(values)),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(extractError(body, "Failed to update post"));
      }
      await showToast({ style: Toast.Style.Success, title: "Post updated" });
      onEdit();
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to update post" });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Edit Post"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Post" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={post.title} />
      <Form.TextField id="slug" title="Slug" defaultValue={post.slug} />
      <Form.TextArea id="description" title="Description" defaultValue={post.description} />
      {!postLoading && (
        <Form.TextArea
          id="content"
          title="Content"
          defaultValue={markdownPost?.content ?? post.content}
          enableMarkdown
        />
      )}
      {!catsLoading && (
        <Form.Dropdown id="categoryId" title="Category" defaultValue={post.category?.id}>
          {categories.map((cat: Category) => (
            <Form.Dropdown.Item key={cat.id} value={cat.id} title={cat.name} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Dropdown id="status" title="Status" defaultValue={post.status}>
        <Form.Dropdown.Item value="published" title="Published" />
        <Form.Dropdown.Item value="draft" title="Draft" />
      </Form.Dropdown>
      {!tagsLoading && (
        <Form.TagPicker id="tags" title="Tags" defaultValue={post.tags?.map((t) => t.id)}>
          {tags.map((tag: Tag) => (
            <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
          ))}
        </Form.TagPicker>
      )}
      {!authorsLoading && (
        <Form.TagPicker id="authors" title="Authors" defaultValue={post.authors?.map((a) => a.id)}>
          {authors.map((author: Author) => (
            <Form.TagPicker.Item key={author.id} value={author.id} title={author.name} />
          ))}
        </Form.TagPicker>
      )}
      <Form.Checkbox id="featured" label="Featured" defaultValue={post.featured} />
      <Form.TextField id="coverImage" title="Cover Image URL" defaultValue={post.coverImage || ""} />
    </Form>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { isLoading, data, pagination, revalidate, mutate } = useFetch(
    (options) => {
      const params = new URLSearchParams({
        page: String(options.page + 1),
        limit: "25",
        status: statusFilter,
        content: "false",
      });
      if (searchText) params.set("query", searchText);
      return `${BASE_URL}/posts?${params.toString()}`;
    },
    {
      headers: getHeaders(),
      mapResult(result: PostsResponse) {
        return {
          data: result.posts,
          hasMore: result.pagination.nextPage !== null,
        };
      },
      keepPreviousData: true,
      initialData: [] as Post[],
    },
  );

  async function deletePost(post: Post) {
    if (
      await confirmAlert({
        title: "Delete Post",
        message: `Are you sure you want to delete "${post.title}"?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await mutate(
          fetch(`${BASE_URL}/posts/${post.id}`, {
            method: "DELETE",
            headers: getHeaders(),
          }).then((res) => {
            if (!res.ok) throw new Error("Failed to delete");
          }),
          {
            optimisticUpdate(currentData) {
              return currentData?.filter((p: Post) => p.id !== post.id) ?? [];
            },
          },
        );
        await showToast({ style: Toast.Style.Success, title: "Post deleted" });
      } catch (error) {
        await showFailureToast(error, { title: "Failed to delete post" });
      }
    }
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search posts..."
      pagination={pagination}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Status" storeValue onChange={setStatusFilter}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Published" value="published" />
          <List.Dropdown.Item title="Draft" value="draft" />
        </List.Dropdown>
      }
    >
      <List.EmptyView title="No Posts Found" description="Try a different search or filter" />
      {data.map((post: Post) => (
        <List.Item
          key={post.id}
          title={post.title}
          subtitle={post.description}
          keywords={[post.category?.name, ...(post.tags?.map((t) => t.name) || [])].filter(Boolean)}
          accessories={[
            {
              tag: {
                value: post.status === "published" ? "Published" : "Draft",
                color: post.status === "published" ? Color.Green : Color.Orange,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Post"
                icon={Icon.Eye}
                target={<PostDetail post={post} revalidateList={revalidate} />}
              />
              <Action.Push
                title="Edit Post"
                icon={Icon.Pencil}
                target={<EditPostForm post={post} onEdit={revalidate} />}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action
                title="Delete Post"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => deletePost(post)}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
              />
              <Action.Push
                title="Create Post"
                icon={Icon.Plus}
                target={<CreatePost />}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action.CopyToClipboard
                title="Copy Slug"
                content={post.slug}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
