import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  getCategoryDisplayIcon,
  getCategoryParentId,
  getCategoryParentName,
  isCustomCategory,
  isParentCategory,
} from "./lib/category-utils";
import { getCachedCategories } from "./lib/moneytree";
import { Category } from "./lib/types";
import { CreateCategoryForm } from "./components/CreateCategoryForm";

type CategoryFilter = "custom" | "all" | "built-in";

function filterCategories(categories: Category[], filter: CategoryFilter): Category[] {
  if (filter === "custom") return categories.filter(isCustomCategory);
  if (filter === "built-in") return categories.filter((category) => !isCustomCategory(category));
  return categories;
}

function groupCategories(allCategories: Category[], visibleCategories: Category[]): [Category, Category[]][] {
  const categoriesById = new Map(allCategories.map((category) => [category.id, category]));
  const groups = new Map<number, { parent: Category; children: Category[] }>();

  for (const category of visibleCategories) {
    const parent = category.parent_id ? categoriesById.get(category.parent_id) : category;
    if (!parent) continue;

    const group = groups.get(parent.id) || { parent, children: [] };
    group.children.push(category);
    groups.set(parent.id, group);
  }

  return Array.from(groups.values())
    .map(
      ({ parent, children }) =>
        [parent, children.sort((a, b) => a.name.localeCompare(b.name))] as [Category, Category[]],
    )
    .sort(([parentA], [parentB]) => parentA.name.localeCompare(parentB.name));
}

function CategoryTypeDropdown(props: { value: CategoryFilter; onChange: (value: CategoryFilter) => void }) {
  return (
    <List.Dropdown
      tooltip="Filter Categories"
      value={props.value}
      onChange={(value) => props.onChange(value as CategoryFilter)}
    >
      <List.Dropdown.Item title="Custom" value="custom" icon={Icon.Person} />
      <List.Dropdown.Item title="All" value="all" icon={Icon.List} />
      <List.Dropdown.Item title="Built-in" value="built-in" icon={Icon.Tag} />
    </List.Dropdown>
  );
}

export default function Command() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<CategoryFilter>("custom");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadCategories() {
    try {
      setIsLoading(true);
      setError(null);
      setCategories(await getCachedCategories());
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load categories";
      setError(message);
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  const categoriesById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const filteredCategories = useMemo(() => filterCategories(categories, filter), [categories, filter]);
  const groupedCategories = useMemo(
    () => groupCategories(categories, filteredCategories),
    [categories, filteredCategories],
  );
  const createParentOptions = useMemo(
    () =>
      categories
        .filter((category) => !isCustomCategory(category) && isParentCategory(category))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );

  if (error && categories.length === 0) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Error Loading Categories" description={error} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Categories"
      searchBarAccessory={<CategoryTypeDropdown value={filter} onChange={setFilter} />}
    >
      {groupedCategories.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Tag}
          title="No Categories"
          description="No categories match the selected filter."
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Category"
                icon={Icon.PlusCircle}
                target={
                  <CreateCategoryForm
                    categories={createParentOptions}
                    defaultParentId={createParentOptions[0]?.id}
                    onSaved={loadCategories}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ) : (
        groupedCategories.map(([parent, children]) => (
          <List.Section key={parent.id} title={parent.name}>
            {children.map((category) => {
              const parentId = getCategoryParentId(category, categoriesById);
              const parentCategory = categoriesById.get(parentId) || category;
              const isCustom = isCustomCategory(category);
              const parentName = getCategoryParentName(category, categoriesById);

              return (
                <List.Item
                  key={category.id}
                  icon={getCategoryDisplayIcon(category, categoriesById)}
                  title={category.name}
                  subtitle={parentName}
                  accessories={[{ text: isCustom ? "Custom" : "Built-in" }, { text: `#${category.id}` }]}
                  actions={
                    <ActionPanel>
                      {isCustom ? (
                        <Action.Push
                          title="Edit Category"
                          icon={Icon.Pencil}
                          target={
                            <CreateCategoryForm
                              categories={createParentOptions}
                              category={category}
                              defaultParentId={parentId}
                              defaultIconKey={category.icon_key || "uncategorized"}
                              onSaved={loadCategories}
                            />
                          }
                        />
                      ) : null}
                      <Action.Push
                        title="Create Child Category"
                        icon={Icon.PlusCircle}
                        target={
                          <CreateCategoryForm
                            categories={createParentOptions}
                            defaultParentId={parentId}
                            defaultIconKey={parentCategory.icon_key || category.icon_key || "uncategorized"}
                            onSaved={loadCategories}
                          />
                        }
                      />
                      <Action.CopyToClipboard
                        title="Copy Category ID"
                        icon={Icon.Clipboard}
                        content={String(category.id)}
                      />
                      <Action.CopyToClipboard
                        title="Copy Category Details"
                        icon={Icon.Clipboard}
                        content={`${category.name} (#${category.id})${parentName ? ` under ${parentName}` : ""}`}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))
      )}
    </List>
  );
}
