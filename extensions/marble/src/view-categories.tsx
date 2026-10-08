import CreateCategory from "./create-category";
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
import { CategoriesResponse, Category } from "./types";
import { BASE_URL, getHeaders, setCache, extractError } from "./api";
import { categorySchema } from "./schemas";

function EditCategoryForm({ category, onEdit }: { category: Category; onEdit: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: Record<string, unknown>) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Updating category..." });
      const response = await fetch(`${BASE_URL}/categories/${category.id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(categorySchema.parse(values)),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(extractError(body, "Failed to update category"));
      }
      await showToast({ style: Toast.Style.Success, title: "Category updated" });
      onEdit();
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to update category" });
    }
  }

  return (
    <Form
      navigationTitle="Edit Category"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Category" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={category.name} />
      <Form.TextField id="slug" title="Slug" defaultValue={category.slug} />
      <Form.TextArea id="description" title="Description" defaultValue={category.description || ""} />
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
      return `${BASE_URL}/categories?${params.toString()}`;
    },
    {
      headers: getHeaders(),
      mapResult(result: CategoriesResponse) {
        setCache("categories", result.categories);
        return {
          data: result.categories,
          hasMore: result.pagination.nextPage !== null,
        };
      },
      keepPreviousData: true,
      initialData: [] as Category[],
    },
  );

  async function deleteCategory(category: Category) {
    if (
      await confirmAlert({
        title: "Delete Category",
        message: `Are you sure you want to delete "${category.name}"? This will fail if posts are assigned to it.`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await mutate(
          fetch(`${BASE_URL}/categories/${category.id}`, {
            method: "DELETE",
            headers: getHeaders(),
          }).then((res) => {
            if (!res.ok) throw new Error("Failed to delete");
          }),
          {
            optimisticUpdate(currentData) {
              return currentData?.filter((c: Category) => c.id !== category.id) ?? [];
            },
          },
        );
        await showToast({ style: Toast.Style.Success, title: "Category deleted" });
      } catch (error) {
        await showFailureToast(error, { title: "Failed to delete category" });
      }
    }
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search categories..."
      pagination={pagination}
      throttle
    >
      <List.EmptyView title="No Categories Found" description="Try a different search" />
      {data.map((category: Category) => (
        <List.Item
          key={category.id}
          title={category.name}
          subtitle={category.description || undefined}
          accessories={[{ text: `${category.count?.posts ?? 0} posts` }]}
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Category"
                icon={Icon.Pencil}
                target={<EditCategoryForm category={category} onEdit={revalidate} />}
              />
              <Action
                title="Delete Category"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => deleteCategory(category)}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
              />
              <Action.Push
                title="Create Category"
                icon={Icon.Plus}
                target={<CreateCategory />}
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
                content={category.slug}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
