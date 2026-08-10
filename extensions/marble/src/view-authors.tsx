import CreateAuthor from "./create-author";
import {
  ActionPanel,
  Action,
  List,
  Icon,
  Image,
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
import { AuthorsResponse, Author } from "./types";
import { BASE_URL, getHeaders, setCache, extractError } from "./api";
import { authorSchema } from "./schemas";

function EditAuthorForm({ author, onEdit }: { author: Author; onEdit: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: Record<string, unknown>) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Updating author..." });
      const response = await fetch(`${BASE_URL}/authors/${author.id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(authorSchema.parse(values)),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(extractError(body, "Failed to update author"));
      }
      await showToast({ style: Toast.Style.Success, title: "Author updated" });
      onEdit();
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to update author" });
    }
  }

  return (
    <Form
      navigationTitle="Edit Author"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Author" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={author.name} />
      <Form.TextField id="slug" title="Slug" defaultValue={author.slug} />
      <Form.TextArea id="bio" title="Bio" defaultValue={author.bio || ""} />
      <Form.TextField id="role" title="Role" defaultValue={author.role || ""} />
      <Form.TextField id="email" title="Email" defaultValue="" />
      <Form.TextField id="image" title="Image URL" defaultValue={author.image || ""} />
    </Form>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data, pagination, revalidate, mutate } = useFetch(
    (options) => {
      const params = new URLSearchParams({
        page: String(options.page + 1),
        limit: "25",
      });
      if (searchText) params.set("query", searchText);
      return `${BASE_URL}/authors?${params.toString()}`;
    },
    {
      headers: getHeaders(),
      mapResult(result: AuthorsResponse) {
        setCache("authors", result.authors);
        return {
          data: result.authors,
          hasMore: result.pagination.nextPage !== null,
        };
      },
      keepPreviousData: true,
      initialData: [] as Author[],
    },
  );

  async function deleteAuthor(author: Author) {
    if (
      await confirmAlert({
        title: "Delete Author",
        message: `Are you sure you want to delete "${author.name}"?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await mutate(
          fetch(`${BASE_URL}/authors/${author.id}`, {
            method: "DELETE",
            headers: getHeaders(),
          }).then((res) => {
            if (!res.ok) throw new Error("Failed to delete");
          }),
          {
            optimisticUpdate(currentData) {
              return currentData?.filter((a: Author) => a.id !== author.id) ?? [];
            },
          },
        );
        await showToast({ style: Toast.Style.Success, title: "Author deleted" });
      } catch (error) {
        await showFailureToast(error, { title: "Failed to delete author" });
      }
    }
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search authors..."
      pagination={pagination}
      isShowingDetail
      throttle
    >
      <List.EmptyView title="No Authors Found" description="Try a different search" />
      {data.map((author: Author) => (
        <List.Item
          key={author.id}
          title={author.name}
          icon={author.image ? { source: author.image, mask: Image.Mask.Circle } : Icon.Person}
          detail={
            <List.Item.Detail
              markdown={author.bio || "*No bio*"}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Role" text={author.role || "---"} />
                  <List.Item.Detail.Metadata.Label title="Slug" text={author.slug} />
                  <List.Item.Detail.Metadata.Label title="Posts" text={String(author.count?.posts ?? 0)} />
                  {author.socials?.length > 0 && (
                    <List.Item.Detail.Metadata.TagList title="Socials">
                      {author.socials.map((s, i) => (
                        <List.Item.Detail.Metadata.TagList.Item key={i} text={s.platform} color={Color.Blue} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Author"
                icon={Icon.Pencil}
                target={<EditAuthorForm author={author} onEdit={revalidate} />}
              />
              <Action
                title="Delete Author"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => deleteAuthor(author)}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
              />
              <Action.Push
                title="Create Author"
                icon={Icon.Plus}
                target={<CreateAuthor />}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action.CopyToClipboard
                title="Copy Author ID"
                content={author.id}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
