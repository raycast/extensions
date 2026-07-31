import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import { CATEGORY_ICON_OPTIONS, getCategoryIcon } from "../lib/category-utils";
import { createCustomCategory, updateCustomCategory } from "../lib/moneytree";
import { Category } from "../lib/types";

type FormValues = {
  parentId: string;
  name: string;
  iconKey: string;
};

export function CreateCategoryForm({
  categories,
  category,
  defaultParentId,
  defaultIconKey = "uncategorized",
  onSaved,
}: {
  categories: Category[];
  category?: Category;
  defaultParentId: number;
  defaultIconKey?: string;
  onSaved?: () => void;
}) {
  const { pop } = useNavigation();
  const [parentId, setParentId] = useState(String(defaultParentId));
  const [iconKey, setIconKey] = useState(category?.icon_key || defaultIconKey);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(category);

  const parentOptions = useMemo(() => categories.slice().sort((a, b) => a.name.localeCompare(b.name)), [categories]);

  async function handleSubmit(values: FormValues) {
    const name = values.name.trim();
    if (!name) {
      await showToast({ style: Toast.Style.Failure, title: "Name is required" });
      return false;
    }

    const selectedParentId = Number(values.parentId);
    if (!selectedParentId) {
      await showToast({ style: Toast.Style.Failure, title: "Parent is required" });
      return false;
    }

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: isEditing ? "Updating category..." : "Creating category...",
    });

    try {
      const payload = {
        parentId: selectedParentId,
        name,
        iconKey: values.iconKey || "uncategorized",
      };

      if (category) {
        await updateCustomCategory({ categoryId: category.id, ...payload });
      } else {
        await createCustomCategory(payload);
      }

      toast.style = Toast.Style.Success;
      toast.title = isEditing ? "Category updated" : "Category created";
      onSaved?.();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = isEditing ? "Failed to update category" : "Failed to create category";
      toast.message = error instanceof Error ? error.message : "Unknown error";
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={isEditing ? "Edit Category" : "Create Category"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Update Category" : "Create Category"}
            icon={isEditing ? Icon.Pencil : Icon.PlusCircle}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Category name" defaultValue={category?.name} />
      <Form.Dropdown id="parentId" title="Parent" value={parentId} onChange={setParentId}>
        {parentOptions.map((parentOption) => (
          <Form.Dropdown.Item
            key={parentOption.id}
            value={String(parentOption.id)}
            title={parentOption.name}
            icon={getCategoryIcon(parentOption.icon_key)}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="iconKey" title="Icon" value={iconKey} onChange={setIconKey}>
        {CATEGORY_ICON_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.key} value={option.key} title={option.title} icon={option.icon} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
