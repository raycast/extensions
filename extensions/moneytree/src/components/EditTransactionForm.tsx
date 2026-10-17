import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getCategoryDisplayIcon } from "../lib/category-utils";
import { getCachedCategories, updateTransactionDetails } from "../lib/moneytree";
import { Category, Transaction } from "../lib/types";

type FormValues = {
  description: string;
  categoryId: string;
};

function getTransactionDescription(transaction: Transaction): string {
  return transaction.description_guest || transaction.description_pretty || transaction.description_raw || "";
}

function getCategorySectionTitle(category: Category, categoriesById: Map<number, Category>): string {
  if (!category.parent_id) {
    return category.category_type === "income" ? "Income" : category.category_type === "expense" ? "Expense" : "Other";
  }

  const parent = categoriesById.get(category.parent_id);
  return parent?.name || "Other";
}

function getCategorySections(categories: Category[]): [string, Category[]][] {
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const grouped = new Map<string, Category[]>();

  for (const category of categories) {
    const title = getCategorySectionTitle(category, categoriesById);
    const group = grouped.get(title);
    if (group) {
      group.push(category);
    } else {
      grouped.set(title, [category]);
    }
  }

  return Array.from(grouped.entries())
    .map(([title, group]) => [title, group.sort((a, b) => a.name.localeCompare(b.name))] as [string, Category[]])
    .sort(([a], [b]) => a.localeCompare(b));
}

export function EditTransactionForm({ transaction, onUpdated }: { transaction: Transaction; onUpdated?: () => void }) {
  const { pop } = useNavigation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState(String(transaction.category_id));
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadCategories() {
      try {
        setCategories(await getCachedCategories());
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load categories",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoadingCategories(false);
      }
    }

    loadCategories();
  }, []);

  const categorySections = useMemo(() => getCategorySections(categories), [categories]);
  const categoriesById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  async function handleSubmit(values: FormValues) {
    const categoryId = Number(values.categoryId);
    if (!categoryId) {
      await showToast({ style: Toast.Style.Failure, title: "Select a category" });
      return false;
    }

    setIsSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating transaction..." });

    try {
      await updateTransactionDetails({
        transaction,
        descriptionGuest: values.description.trim() || null,
        categoryId,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Transaction updated";
      onUpdated?.();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update transaction";
      toast.message = error instanceof Error ? error.message : "Unknown error";
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isLoadingCategories || isSubmitting}
      navigationTitle="Edit Transaction"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Transaction" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="description" title="Description" defaultValue={getTransactionDescription(transaction)} />
      <Form.Dropdown id="categoryId" title="Category" value={categoryId} onChange={setCategoryId}>
        {categorySections.map(([title, group]) => (
          <Form.Dropdown.Section key={title} title={title}>
            {group.map((category) => (
              <Form.Dropdown.Item
                key={category.id}
                value={String(category.id)}
                title={category.name}
                icon={getCategoryDisplayIcon(category, categoriesById)}
              />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>
    </Form>
  );
}
