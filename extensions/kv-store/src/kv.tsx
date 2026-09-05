import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Form,
  Icon,
  Keyboard,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  launchCommand,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useForm, useLocalStorage } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { useMemo, useRef, useState } from "react";

import { CATEGORY_STORAGE_KEY, Category, Entry, STORAGE_KEY } from "./entries";
import { PasswordEntryValues, PasswordForm } from "./password-form";

const NO_CATEGORY_VALUE = "__none__";

type EntryValues = PasswordEntryValues;

type EntryFormValues = {
  key: string;
  value: string;
  categoryId: string;
};

type CategoryValues = {
  name: string;
};

type SaveEntry = (values: EntryValues, existingEntry?: Entry) => Promise<Entry[]>;
type DeleteEntry = (entry: Entry) => Promise<Entry[] | undefined>;
type SaveCategory = (values: CategoryValues, existingCategory?: Category) => Promise<Category[]>;

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase();
}

function valuePreview(value: string) {
  const oneLine = value.replace(/\s+/g, " ").trim();

  if (!oneLine) {
    return "Empty Value";
  }

  return oneLine.length > 72 ? `${oneLine.slice(0, 69)}…` : oneLine;
}

function sortEntries(entries: Entry[], searchText: string) {
  const query = normalizeName(searchText);

  return [...entries]
    .filter((entry) => !query || normalizeName(entry.key).includes(query))
    .sort((left, right) => {
      const leftKey = normalizeName(left.key);
      const rightKey = normalizeName(right.key);

      const leftRank = leftKey === query ? 0 : leftKey.startsWith(query) ? 1 : 2;
      const rightRank = rightKey === query ? 0 : rightKey.startsWith(query) ? 1 : 2;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      if (!query) {
        return right.updatedAt.localeCompare(left.updatedAt);
      }

      return left.key.localeCompare(right.key);
    });
}

function sortCategories(categories: Category[]) {
  return [...categories].sort((left, right) => left.name.localeCompare(right.name));
}

function keyCountLabel(count: number) {
  return `${count} ${count === 1 ? "key" : "keys"}`;
}

async function refreshMenuBar() {
  await launchCommand({ name: "menu-bar", type: LaunchType.Background }).catch(() => undefined);
}

export default function Command() {
  const {
    value: storedEntries,
    setValue: setStoredEntries,
    isLoading: areEntriesLoading,
  } = useLocalStorage<Entry[]>(STORAGE_KEY, []);
  const {
    value: storedCategories,
    setValue: setStoredCategories,
    isLoading: areCategoriesLoading,
  } = useLocalStorage<Category[]>(CATEGORY_STORAGE_KEY, []);
  const [searchText, setSearchText] = useState("");

  const entries = storedEntries ?? [];
  const categories = storedCategories ?? [];
  const entriesRef = useRef(entries);
  const categoriesRef = useRef(categories);
  entriesRef.current = entries;
  categoriesRef.current = categories;
  const sortedCategories = useMemo(() => sortCategories(categories), [categories]);
  const candidateKey = searchText.trim();
  const isLoading = areEntriesLoading || areCategoriesLoading;
  const filteredEntries = useMemo(() => sortEntries(entries, searchText), [entries, searchText]);
  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );
  const hasExactMatch = entries.some((entry) => normalizeName(entry.key) === normalizeName(candidateKey));

  async function saveEntry(values: EntryValues, existingEntry?: Entry) {
    const currentEntries = entriesRef.current;
    const now = new Date().toISOString();
    const nextEntry: Entry = existingEntry
      ? { ...existingEntry, ...values, updatedAt: now }
      : { id: randomUUID(), ...values, createdAt: now, updatedAt: now };
    const nextEntries = existingEntry
      ? currentEntries.map((entry) => (entry.id === existingEntry.id ? nextEntry : entry))
      : [...currentEntries, nextEntry];

    entriesRef.current = nextEntries;
    await setStoredEntries(nextEntries);
    await refreshMenuBar();
    setSearchText(nextEntry.key);
    return nextEntries;
  }

  async function saveCategory(values: CategoryValues, existingCategory?: Category) {
    const currentCategories = categoriesRef.current;
    const now = new Date().toISOString();
    const nextCategory: Category = existingCategory
      ? { ...existingCategory, ...values, updatedAt: now }
      : { id: randomUUID(), ...values, createdAt: now, updatedAt: now };
    const nextCategories = existingCategory
      ? currentCategories.map((category) => (category.id === existingCategory.id ? nextCategory : category))
      : [...currentCategories, nextCategory];

    categoriesRef.current = nextCategories;
    await setStoredCategories(nextCategories);
    await refreshMenuBar();
    return nextCategories;
  }

  async function deleteEntry(entry: Entry) {
    const confirmed = await confirmAlert({
      title: `Delete “${entry.key}”?`,
      message: "The key and its value will be permanently deleted.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return undefined;
    }

    try {
      const nextEntries = entriesRef.current.filter((item) => item.id !== entry.id);
      entriesRef.current = nextEntries;
      await setStoredEntries(nextEntries);
      await refreshMenuBar();
      await showToast({ style: Toast.Style.Success, title: "Key Deleted", message: entry.key });
      return nextEntries;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Delete Key",
        message: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  async function deleteCategory(category: Category) {
    const confirmed = await confirmAlert({
      title: `Delete Category “${category.name}”?`,
      message: "Keys in this category will be kept and moved to Uncategorized.",
      primaryAction: {
        title: "Delete Category",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      const nextEntries = entriesRef.current.map((entry) =>
        entry.categoryId === category.id ? { ...entry, categoryId: undefined } : entry,
      );
      const nextCategories = categoriesRef.current.filter((item) => item.id !== category.id);
      entriesRef.current = nextEntries;
      categoriesRef.current = nextCategories;
      await setStoredEntries(nextEntries);
      await setStoredCategories(nextCategories);
      await refreshMenuBar();
      await showToast({ style: Toast.Style.Success, title: "Category Deleted", message: category.name });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Delete Category",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const createEntryForm = (initialKey = "", initialCategoryId?: string) => (
    <EntryForm
      entries={entries}
      categories={categories}
      initialKey={initialKey}
      initialCategoryId={initialCategoryId}
      onSave={saveEntry}
    />
  );
  const createCategoryForm = (category?: Category) => (
    <CategoryForm categories={categories} category={category} onSave={saveCategory} />
  );
  const isCompletelyEmpty = entries.length === 0 && categories.length === 0 && !candidateKey;

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchBarPlaceholder="Search keys…"
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {!isLoading && isCompletelyEmpty ? (
        <List.EmptyView
          icon={Icon.Key}
          title="No Keys or Categories Yet"
          description="Create a key or category to get started."
          actions={
            <ActionPanel>
              <Action.Push title="Create Key" icon={Icon.Plus} target={createEntryForm()} />
              <Action.Push
                title="Generate Password"
                icon={Icon.Key}
                shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
                target={<PasswordForm entries={entries} categories={categories} onSave={saveEntry} />}
              />
              <Action.Push
                title="Create Category"
                icon={Icon.Folder}
                shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                target={createCategoryForm()}
              />
            </ActionPanel>
          }
        />
      ) : null}

      {!candidateKey && !isCompletelyEmpty ? (
        <List.Section title="Categories" subtitle={String(categories.length)}>
          {sortedCategories.map((category) => {
            const categoryEntries = entries.filter((entry) => entry.categoryId === category.id);

            return (
              <List.Item
                id={`category-${category.id}`}
                key={category.id}
                icon={Icon.Folder}
                title={category.name}
                subtitle={keyCountLabel(categoryEntries.length)}
                actions={
                  <CategoryActions
                    category={category}
                    entries={entries}
                    categories={categories}
                    onSaveEntry={saveEntry}
                    onDeleteEntry={deleteEntry}
                    onSaveCategory={saveCategory}
                    onDeleteCategory={() => deleteCategory(category)}
                    createEntryForm={createEntryForm}
                    createCategoryForm={createCategoryForm}
                  />
                }
              />
            );
          })}
          <List.Item
            id="create-category"
            icon={Icon.Plus}
            title="Create Category"
            subtitle="For example, servers"
            actions={
              <ActionPanel>
                <Action.Push title="Create Category" icon={Icon.Folder} target={createCategoryForm()} />
                <Action.Push
                  title="Generate Password"
                  icon={Icon.Key}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
                  target={<PasswordForm entries={entries} categories={categories} onSave={saveEntry} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      {candidateKey && !hasExactMatch ? (
        <List.Section title="New Key">
          <List.Item
            id="create-entry"
            icon={Icon.Plus}
            title={`Create “${candidateKey}”`}
            subtitle="Enter a value and choose a category in the next step"
            actions={
              <ActionPanel>
                <Action.Push title="Create Key" icon={Icon.Plus} target={createEntryForm(candidateKey)} />
                <Action.Push
                  title="Generate Password"
                  icon={Icon.Key}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
                  target={
                    <PasswordForm
                      entries={entries}
                      categories={categories}
                      initialKey={candidateKey}
                      onSave={saveEntry}
                    />
                  }
                />
                <Action.Push
                  title="Create Category"
                  icon={Icon.Folder}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                  target={createCategoryForm()}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      {filteredEntries.length > 0 ? (
        <List.Section title="Keys" subtitle={String(filteredEntries.length)}>
          {filteredEntries.map((entry) => {
            const categoryName = entry.categoryId ? categoryNames.get(entry.categoryId) : undefined;
            const subtitle = categoryName
              ? `${categoryName} · ${valuePreview(entry.value)}`
              : valuePreview(entry.value);

            return (
              <List.Item
                id={entry.id}
                key={entry.id}
                icon={Icon.Key}
                title={entry.key}
                subtitle={{ value: subtitle, tooltip: entry.value || "Empty Value" }}
                actions={
                  <EntryActions
                    entry={entry}
                    entries={entries}
                    categories={categories}
                    onSave={saveEntry}
                    onDelete={() => deleteEntry(entry)}
                    createEntryForm={createEntryForm}
                    createCategoryForm={createCategoryForm}
                  />
                }
              />
            );
          })}
        </List.Section>
      ) : null}
    </List>
  );
}

type EntryActionsProps = {
  entry: Entry;
  entries: Entry[];
  categories: Category[];
  onSave: SaveEntry;
  onDelete: () => Promise<Entry[] | undefined>;
  createEntryForm: (initialKey?: string, initialCategoryId?: string) => React.ReactNode;
  createCategoryForm: (category?: Category) => React.ReactNode;
};

function EntryActions({
  entry,
  entries,
  categories,
  onSave,
  onDelete,
  createEntryForm,
  createCategoryForm,
}: EntryActionsProps) {
  const currentCategoryId = categories.some((category) => category.id === entry.categoryId)
    ? entry.categoryId
    : undefined;

  async function moveToCategory(categoryId?: string) {
    const categoryName = categories.find((category) => category.id === categoryId)?.name ?? "Uncategorized";

    if (currentCategoryId === categoryId) {
      await showToast({ style: Toast.Style.Success, title: "Key Is Already in This Category", message: categoryName });
      return;
    }

    try {
      await onSave({ key: entry.key, value: entry.value, categoryId }, entry);
      await showToast({ style: Toast.Style.Success, title: "Key Moved", message: categoryName });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Move Key",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <ActionPanel title={entry.key}>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Value" content={entry.value} icon={Icon.Clipboard} />
        <Action.CopyToClipboard
          title="Copy Key"
          content={entry.key}
          icon={Icon.CopyClipboard}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Push
          title="Edit Key"
          icon={Icon.Pencil}
          shortcut={Keyboard.Shortcut.Common.Edit}
          target={<EntryForm entries={entries} categories={categories} entry={entry} onSave={onSave} />}
        />
        <ActionPanel.Submenu title="Move to Category" icon={Icon.Folder}>
          <ActionPanel.Section>
            <Action
              title="Uncategorized"
              icon={currentCategoryId ? Icon.Circle : Icon.Checkmark}
              onAction={() => moveToCategory()}
            />
            {sortCategories(categories).map((category) => (
              <Action
                key={category.id}
                title={category.name}
                icon={currentCategoryId === category.id ? Icon.Checkmark : Icon.Folder}
                onAction={() => moveToCategory(category.id)}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push title="Create Category" icon={Icon.Plus} target={createCategoryForm()} />
          </ActionPanel.Section>
        </ActionPanel.Submenu>
        <Action.Push
          title="Create New Key"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          target={createEntryForm()}
        />
        <Action.Push
          title="Generate Password"
          icon={Icon.Key}
          shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
          target={
            <PasswordForm
              entries={entries}
              categories={categories}
              initialCategoryId={currentCategoryId}
              onSave={onSave}
            />
          }
        />
        <Action.Push
          title="Create Category"
          icon={Icon.Folder}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          target={createCategoryForm()}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Delete Key"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={async () => {
            await onDelete();
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

type CategoryActionsProps = {
  category: Category;
  entries: Entry[];
  categories: Category[];
  onSaveEntry: SaveEntry;
  onDeleteEntry: DeleteEntry;
  onSaveCategory: SaveCategory;
  onDeleteCategory: () => Promise<void>;
  createEntryForm: (initialKey?: string, initialCategoryId?: string) => React.ReactNode;
  createCategoryForm: (category?: Category) => React.ReactNode;
};

function CategoryActions({
  category,
  entries,
  categories,
  onSaveEntry,
  onDeleteEntry,
  onSaveCategory,
  onDeleteCategory,
  createEntryForm,
  createCategoryForm,
}: CategoryActionsProps) {
  return (
    <ActionPanel title={category.name}>
      <Action.Push
        title="Open Category"
        icon={Icon.Folder}
        target={
          <CategoryView
            category={category}
            entries={entries}
            categories={categories}
            onSaveEntry={onSaveEntry}
            onDeleteEntry={onDeleteEntry}
            onSaveCategory={onSaveCategory}
          />
        }
      />
      <Action.Push
        title="Create Key in Category"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        target={createEntryForm("", category.id)}
      />
      <Action.Push
        title="Generate Password in Category"
        icon={Icon.Key}
        shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
        target={
          <PasswordForm
            entries={entries}
            categories={categories}
            initialCategoryId={category.id}
            onSave={onSaveEntry}
          />
        }
      />
      <Action.Push
        title="Rename Category"
        icon={Icon.Pencil}
        shortcut={Keyboard.Shortcut.Common.Edit}
        target={createCategoryForm(category)}
      />
      <Action
        title="Delete Category"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
        onAction={onDeleteCategory}
      />
    </ActionPanel>
  );
}

type CategoryViewProps = {
  category: Category;
  entries: Entry[];
  categories: Category[];
  onSaveEntry: SaveEntry;
  onDeleteEntry: DeleteEntry;
  onSaveCategory: SaveCategory;
};

function CategoryView({
  category,
  entries,
  categories,
  onSaveEntry,
  onDeleteEntry,
  onSaveCategory,
}: CategoryViewProps) {
  const [viewEntries, setViewEntries] = useState(entries);
  const [viewCategories, setViewCategories] = useState(categories);
  const currentCategory = viewCategories.find((item) => item.id === category.id) ?? category;
  const categoryEntries = sortEntries(
    viewEntries.filter((entry) => entry.categoryId === currentCategory.id),
    "",
  );

  async function saveEntry(values: EntryValues, existingEntry?: Entry) {
    const nextEntries = await onSaveEntry(values, existingEntry);
    setViewEntries(nextEntries);
    return nextEntries;
  }

  async function deleteEntry(entry: Entry) {
    const nextEntries = await onDeleteEntry(entry);

    if (nextEntries) {
      setViewEntries(nextEntries);
    }

    return nextEntries;
  }

  async function saveCategory(values: CategoryValues, existingCategory?: Category) {
    const nextCategories = await onSaveCategory(values, existingCategory);
    setViewCategories(nextCategories);
    return nextCategories;
  }

  const createEntryInCategory = (initialKey = "") => (
    <EntryForm
      entries={viewEntries}
      categories={viewCategories}
      initialKey={initialKey}
      initialCategoryId={currentCategory.id}
      onSave={saveEntry}
    />
  );
  const createCategoryForm = (categoryToEdit?: Category) => (
    <CategoryForm categories={viewCategories} category={categoryToEdit} onSave={saveCategory} />
  );

  return (
    <List navigationTitle={currentCategory.name} searchBarPlaceholder={`Search in ${currentCategory.name}…`}>
      {categoryEntries.length === 0 ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Keys in This Category"
          description="Create the first key in this category."
          actions={
            <ActionPanel>
              <Action.Push title="Create Key" icon={Icon.Plus} target={createEntryInCategory()} />
              <Action.Push
                title="Generate Password"
                icon={Icon.Key}
                shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
                target={
                  <PasswordForm
                    entries={viewEntries}
                    categories={viewCategories}
                    initialCategoryId={currentCategory.id}
                    onSave={saveEntry}
                  />
                }
              />
              <Action.Push title="Rename Category" icon={Icon.Pencil} target={createCategoryForm(currentCategory)} />
            </ActionPanel>
          }
        />
      ) : (
        categoryEntries.map((entry) => (
          <List.Item
            id={entry.id}
            key={entry.id}
            icon={Icon.Key}
            title={entry.key}
            subtitle={{ value: valuePreview(entry.value), tooltip: entry.value || "Empty Value" }}
            actions={
              <EntryActions
                entry={entry}
                entries={viewEntries}
                categories={viewCategories}
                onSave={saveEntry}
                onDelete={() => deleteEntry(entry)}
                createEntryForm={createEntryInCategory}
                createCategoryForm={createCategoryForm}
              />
            }
          />
        ))
      )}
    </List>
  );
}

type EntryFormProps = {
  entries: Entry[];
  categories: Category[];
  entry?: Entry;
  initialKey?: string;
  initialCategoryId?: string;
  onSave: SaveEntry;
};

function EntryForm({ entries, categories, entry, initialKey = "", initialCategoryId, onSave }: EntryFormProps) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<EntryFormValues>({
    initialValues: {
      key: entry?.key ?? initialKey,
      value: entry?.value ?? "",
      categoryId: entry?.categoryId ?? initialCategoryId ?? NO_CATEGORY_VALUE,
    },
    validation: {
      key: (value) => {
        const normalized = normalizeName(value ?? "");

        if (!normalized) {
          return "Enter a key";
        }

        const duplicate = entries.some((item) => item.id !== entry?.id && normalizeName(item.key) === normalized);

        return duplicate ? "This key already exists" : undefined;
      },
      value: FormValidation.Required,
    },
    async onSubmit(values) {
      const nextValues: EntryValues = {
        key: values.key.trim(),
        value: values.value,
        categoryId: values.categoryId === NO_CATEGORY_VALUE ? undefined : values.categoryId,
      };

      try {
        await onSave(nextValues, entry);
        await Clipboard.copy(nextValues.value);
        pop();
        await showHUD(`${entry ? "Updated" : "Saved"} and Copied: ${nextValues.key}`);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Save Key",
          message: error instanceof Error ? error.message : String(error),
        });
        return false;
      }
      return true;
    },
  });

  return (
    <Form
      navigationTitle={entry ? "Edit Key" : "New Key"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save and Copy" icon={Icon.Clipboard} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Key"
        placeholder="For example, API_URL"
        autoFocus={!initialKey && !entry}
        {...itemProps.key}
      />
      <Form.Dropdown title="Category" {...itemProps.categoryId}>
        <Form.Dropdown.Item value={NO_CATEGORY_VALUE} title="Uncategorized" />
        {sortCategories(categories).map((category) => (
          <Form.Dropdown.Item key={category.id} value={category.id} title={category.name} icon={Icon.Folder} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        title="Value"
        placeholder="Enter a value"
        autoFocus={Boolean(initialKey) && !entry}
        {...itemProps.value}
      />
      <Form.Description text="The value is stored locally in Raycast and copied to the clipboard after saving." />
    </Form>
  );
}

type CategoryFormProps = {
  categories: Category[];
  category?: Category;
  onSave: SaveCategory;
};

function CategoryForm({ categories, category, onSave }: CategoryFormProps) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<CategoryValues>({
    initialValues: {
      name: category?.name ?? "",
    },
    validation: {
      name: (value) => {
        const normalized = normalizeName(value ?? "");

        if (!normalized) {
          return "Enter a category name";
        }

        const duplicate = categories.some(
          (item) => item.id !== category?.id && normalizeName(item.name) === normalized,
        );

        return duplicate ? "This category already exists" : undefined;
      },
    },
    async onSubmit(values) {
      const nextValues = { name: values.name.trim() };

      try {
        await onSave(nextValues, category);
        pop();
        await showToast({
          style: Toast.Style.Success,
          title: category ? "Category Renamed" : "Category Created",
          message: nextValues.name,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Save Category",
          message: error instanceof Error ? error.message : String(error),
        });
        return false;
      }

      return true;
    },
  });

  return (
    <Form
      navigationTitle={category ? "Rename Category" : "New Category"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={category ? "Save Name" : "Create Category"}
            icon={Icon.Folder}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="For example, servers" autoFocus {...itemProps.name} />
    </Form>
  );
}
