import CreateTag from "./create-tag";
import {
  ActionPanel,
  Action,
  List,
  Icon,
  Form,
  useNavigation,
  confirmAlert,
  Alert,
  showToast,
  Toast,
} from "@raycast/api";
import { useFetch, showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { TagsResponse, Tag } from "./types";
import { BASE_URL, getHeaders, setCache, extractError } from "./api";
import { tagSchema } from "./schemas";

function EditTagForm({ tag, onEdit }: { tag: Tag; onEdit: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: Record<string, unknown>) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Updating tag..." });
      const response = await fetch(`${BASE_URL}/tags/${tag.id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(tagSchema.parse(values)),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(extractError(body, "Failed to update tag"));
      }
      await showToast({ style: Toast.Style.Success, title: "Tag updated" });
      onEdit();
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to update tag" });
    }
  }

  return (
    <Form
      navigationTitle="Edit Tag"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Tag" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={tag.name} />
      <Form.TextField id="slug" title="Slug" defaultValue={tag.slug} />
      <Form.TextArea id="description" title="Description" defaultValue={tag.description || ""} />
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
      return `${BASE_URL}/tags?${params.toString()}`;
    },
    {
      headers: getHeaders(),
      mapResult(result: TagsResponse) {
        setCache("tags", result.tags);
        return {
          data: result.tags,
          hasMore: result.pagination.nextPage !== null,
        };
      },
      keepPreviousData: true,
      initialData: [] as Tag[],
    },
  );

  async function deleteTag(tag: Tag) {
    if (
      await confirmAlert({
        title: "Delete Tag",
        message: `Are you sure you want to delete "${tag.name}"?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await mutate(
          fetch(`${BASE_URL}/tags/${tag.id}`, {
            method: "DELETE",
            headers: getHeaders(),
          }).then((res) => {
            if (!res.ok) throw new Error("Failed to delete");
          }),
          {
            optimisticUpdate(currentData) {
              return currentData?.filter((t: Tag) => t.id !== tag.id) ?? [];
            },
          },
        );
        await showToast({ style: Toast.Style.Success, title: "Tag deleted" });
      } catch (error) {
        await showFailureToast(error, { title: "Failed to delete tag" });
      }
    }
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tags..."
      pagination={pagination}
      throttle
    >
      <List.EmptyView title="No Tags Found" description="Try a different search" />
      {data.map((tag: Tag) => (
        <List.Item
          key={tag.id}
          title={tag.name}
          subtitle={tag.description || undefined}
          accessories={[{ text: `${tag.count?.posts ?? 0} posts` }]}
          icon={Icon.Tag}
          actions={
            <ActionPanel>
              <Action.Push title="Edit Tag" icon={Icon.Pencil} target={<EditTagForm tag={tag} onEdit={revalidate} />} />
              <Action
                title="Delete Tag"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => deleteTag(tag)}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
              />
              <Action.Push
                title="Create Tag"
                icon={Icon.Plus}
                target={<CreateTag />}
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
                content={tag.slug}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
