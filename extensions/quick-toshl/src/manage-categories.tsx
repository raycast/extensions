import {
  ActionPanel,
  Action,
  Form,
  List,
  Icon,
  useNavigation,
  showToast,
  Toast,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { toshl } from "./utils/toshl";
import type { Category } from "./utils/types";

function AddCategoryForm({ onSaved }: { onSaved: () => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create"
            icon={Icon.Plus}
            onSubmit={async (v: { name: string; type: string }) => {
              if (!v.name?.trim()) {
                showToast({ style: Toast.Style.Failure, title: "Name required" });
                return;
              }
              await toshl.createCategory({
                name: v.name.trim(),
                type: v.type as "expense" | "income",
              });
              showToast({ style: Toast.Style.Success, title: "Category created" });
              onSaved();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="e.g. Subscriptions" />
      <Form.Dropdown id="type" title="Type" defaultValue="expense">
        <Form.Dropdown.Item value="expense" title="Expense" />
        <Form.Dropdown.Item value="income" title="Income" />
      </Form.Dropdown>
    </Form>
  );
}

function EditCategoryForm({ category, onSaved }: { category: Category; onSaved: () => void }) {
  const { pop } = useNavigation();
  if (category.type === "system") {
    return (
      <Form navigationTitle="System category">
        <Form.Description text="This category is managed by Toshl and cannot be edited here." />
      </Form>
    );
  }
  if (!category.modified) {
    return (
      <Form navigationTitle="Edit Category">
        <Form.Description text="Turn on “Force Refresh Cache” in extension preferences, run any command, then try again so modified timestamps load." />
      </Form>
    );
  }
  return (
    <Form
      navigationTitle="Edit Category"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Check}
            onSubmit={async (v: { name: string; type: string }) => {
              if (!v.name?.trim()) {
                showToast({ style: Toast.Style.Failure, title: "Name required" });
                return;
              }
              await toshl.updateCategory({
                id: category.id,
                name: v.name.trim(),
                type: v.type as "expense" | "income",
                modified: category.modified!,
              });
              showToast({ style: Toast.Style.Success, title: "Category updated" });
              onSaved();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={category.name} />
      <Form.Dropdown id="type" title="Type" defaultValue={category.type === "income" ? "income" : "expense"}>
        <Form.Dropdown.Item value="expense" title="Expense" />
        <Form.Dropdown.Item value="income" title="Income" />
      </Form.Dropdown>
    </Form>
  );
}

export default function ManageCategories() {
  const { push } = useNavigation();
  const { data: categories, isLoading, revalidate } = useCachedPromise(() => toshl.getCategories());

  async function remove(c: Category) {
    if (c.type === "system") {
      showToast({ style: Toast.Style.Failure, title: "Cannot delete system categories" });
      return;
    }
    if (
      await confirmAlert({
        title: "Delete category",
        message: `Delete “${c.name}”? Entries may become uncategorized.`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await toshl.deleteCategory(c.id);
      showToast({ style: Toast.Style.Success, title: "Category deleted" });
      revalidate();
    }
  }

  return (
    <List
      navigationTitle="Categories"
      isLoading={isLoading}
      searchBarPlaceholder="Filter categories…"
      actions={
        <ActionPanel>
          <Action
            title="Add Category"
            icon={Icon.Plus}
            onAction={() => push(<AddCategoryForm onSaved={revalidate} />)}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Categories">
        {categories?.map((c) => (
          <List.Item
            key={c.id}
            title={c.name}
            subtitle={c.type}
            icon={c.type === "income" ? Icon.ArrowUp : Icon.ArrowDown}
            actions={
              <ActionPanel>
                <Action
                  title="Edit"
                  icon={Icon.Pencil}
                  onAction={() => push(<EditCategoryForm category={c} onSaved={revalidate} />)}
                />
                <Action
                  title="Add Category"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() => push(<AddCategoryForm onSaved={revalidate} />)}
                />
                {c.type !== "system" && (
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => remove(c)}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
