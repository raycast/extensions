import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { createCategory, deleteCategory, getCategories, getTodos, updateCategory } from "./storage";
import { Category } from "./types";
import { CategoryTodosView } from "./category-todos";

// ─── Color palette ────────────────────────────────────────────────────────────

export const CATEGORY_COLORS: { label: string; value: string; color: Color }[] = [
  { label: "Blue", value: "blue", color: Color.Blue },
  { label: "Green", value: "green", color: Color.Green },
  { label: "Orange", value: "orange", color: Color.Orange },
  { label: "Red", value: "red", color: Color.Red },
  { label: "Purple", value: "purple", color: Color.Purple },
  { label: "Yellow", value: "yellow", color: Color.Yellow },
  { label: "Magenta", value: "magenta", color: Color.Magenta },
];

export function colorFromValue(value: string): Color {
  return CATEGORY_COLORS.find((c) => c.value === value)?.color ?? Color.Blue;
}

// ─── Edit Category Form ───────────────────────────────────────────────────────

function EditCategoryForm({ category, onSave }: { category: Category; onSave: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color ?? "blue");
  const [nameError, setNameError] = useState<string | undefined>();

  async function handleSubmit() {
    if (!name.trim()) {
      setNameError("Name cannot be empty");
      return;
    }
    await updateCategory(category.id, name, color);
    await showToast({ style: Toast.Style.Success, title: "Category updated" });
    onSave();
    pop();
  }

  return (
    <Form
      navigationTitle="Edit category"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Category name"
        placeholder="e.g. Personal, University, Work…"
        value={name}
        onChange={(v) => {
          setName(v);
          setNameError(undefined);
        }}
        error={nameError}
        autoFocus
      />
      <Form.Dropdown id="color" title="Color" value={color} onChange={setColor}>
        {CATEGORY_COLORS.map((c) => (
          <Form.Dropdown.Item key={c.value} value={c.value} title={c.label} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

// ─── Create Category Form ─────────────────────────────────────────────────────

function CreateCategoryForm({ onCreated }: { onCreated: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [color, setColor] = useState("blue");
  const [nameError, setNameError] = useState<string | undefined>();

  async function handleSubmit() {
    if (!name.trim()) {
      setNameError("Name cannot be empty");
      return;
    }
    await createCategory(name, color);
    await showToast({ style: Toast.Style.Success, title: `Category "${name.trim()}" created` });
    onCreated();
    pop();
  }

  return (
    <Form
      navigationTitle="New category"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Category" onSubmit={handleSubmit} icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Category name"
        placeholder="e.g. Personal, University, Work…"
        value={name}
        onChange={(v) => {
          setName(v);
          setNameError(undefined);
        }}
        error={nameError}
        autoFocus
      />
      <Form.Dropdown id="color" title="Color" value={color} onChange={setColor}>
        {CATEGORY_COLORS.map((c) => (
          <Form.Dropdown.Item key={c.value} value={c.value} title={c.label} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

// ─── Categories View ──────────────────────────────────────────────────────────

export default function CategoriesView() {
  const { push } = useNavigation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [todoCounts, setTodoCounts] = useState<Record<string, { total: number; done: number }>>({});
  const [isLoading, setIsLoading] = useState(true);

  async function loadData() {
    setIsLoading(true);
    const cats = await getCategories();
    setCategories(cats);

    const counts: Record<string, { total: number; done: number }> = {};
    for (const cat of cats) {
      const todos = await getTodos(cat.id);
      counts[cat.id] = { total: todos.length, done: todos.filter((t) => t.completed).length };
    }
    setTodoCounts(counts);
    setIsLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleDeleteCategory(cat: Category) {
    const confirmed = await confirmAlert({
      title: `Delete "${cat.name}"`,
      message: "All todos in this category will be deleted. This action cannot be undone.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      await deleteCategory(cat.id);
      await showToast({ style: Toast.Style.Success, title: `Category "${cat.name}" deleted` });
      loadData();
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle="Todos" searchBarPlaceholder="Search category…">
      <List.EmptyView
        icon={Icon.BulletPoints}
        title="No categories"
        description="Press ⌘N to create your first category."
        actions={
          <ActionPanel>
            <Action
              title="New Category"
              icon={Icon.Plus}
              onAction={() => push(<CreateCategoryForm onCreated={loadData} />)}
            />
          </ActionPanel>
        }
      />
      {categories.map((cat) => {
        const counts = todoCounts[cat.id] ?? { total: 0, done: 0 };
        const subtitle = counts.total === 0 ? "No todos" : `${counts.done}/${counts.total} completed`;
        const folderColor = colorFromValue(cat.color);

        return (
          <List.Item
            key={cat.id}
            title={cat.name}
            subtitle={subtitle}
            icon={{ source: Icon.Folder, tintColor: folderColor }}
            accessories={
              counts.total > 0
                ? [
                    {
                      tag: {
                        value: `${counts.total - counts.done}`,
                        color: counts.done === counts.total ? Color.Green : Color.Orange,
                      },
                      tooltip: "Pending",
                    },
                  ]
                : []
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section title={cat.name}>
                  <Action
                    title="View Todos"
                    icon={Icon.Eye}
                    onAction={() => push(<CategoryTodosView category={cat} onUpdate={loadData} />)}
                  />
                  <Action
                    title="New Category"
                    icon={Icon.Plus}
                    shortcut={Keyboard.Shortcut.Common.New}
                    onAction={() => push(<CreateCategoryForm onCreated={loadData} />)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Edit Category"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    onAction={() => push(<EditCategoryForm category={cat} onSave={loadData} />)}
                  />
                  <Action
                    title="Delete Category"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => handleDeleteCategory(cat)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
      {categories.length > 0 && (
        <List.Item
          title="New category"
          icon={{ source: Icon.Plus, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action
                title="New Category"
                icon={Icon.Plus}
                onAction={() => push(<CreateCategoryForm onCreated={loadData} />)}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
