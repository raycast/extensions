// Add this new component
import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import * as lunchMoney from "./lunchmoney";
import { useState } from "react";
import { getFormatedAmount } from "./format";
import { formatISO } from "date-fns";
import { all } from "radash";

function TransactionFormRecuringItems({
  transaction,
  recuringItems,
}: {
  transaction: lunchMoney.Transaction;
  recuringItems: lunchMoney.RecurringItem[];
}) {
  return recuringItems.map((recuring) => (
    <Form.Dropdown.Item
      key={recuring.id}
      value={String(recuring.id)}
      title={recuring.payee}
      icon={recuring.id === transaction.recurring_id ? Icon.Check : undefined}
    />
  ));
}

function TransactionFormCategories({
  transaction,
  categories,
}: {
  transaction: lunchMoney.Transaction;
  categories: lunchMoney.Category[];
}) {
  return categories.map((category) => {
    if (category.is_group && category.children) {
      return (
        <Form.Dropdown.Section key={category.id} title={category.name}>
          {category.children.map((child) => (
            <Form.Dropdown.Item
              key={child.id}
              value={String(child.id)}
              title={child.name}
              icon={category.id === transaction.category_id ? Icon.Check : undefined}
            />
          ))}
        </Form.Dropdown.Section>
      );
    }

    return (
      <Form.Dropdown.Item
        key={category.id}
        value={String(category.id)}
        title={category.name}
        icon={category.id === transaction.category_id ? Icon.Check : undefined}
      />
    );
  });
}

export function EditTransactionForm({
  transaction,
  onEdit,
}: {
  transaction: lunchMoney.Transaction;
  onEdit: (transaction: lunchMoney.Transaction, update: lunchMoney.TransactionUpdate) => void;
}) {
  const { pop } = useNavigation();
  const {
    data: { categories, recurringItems, tags },
    isLoading,
  } = useCachedPromise(
    async () =>
      all({
        categories: lunchMoney.getCategories(),
        recurringItems: lunchMoney.getRecurringItems(),
        tags: lunchMoney.getTags(),
      }),
    [],
    {
      keepPreviousData: true,
      initialData: {
        categories: [] as lunchMoney.Category[],
        recurringItems: [] as lunchMoney.RecurringItem[],
        tags: [] as lunchMoney.Tag[],
      },
      onError: (err) => {
        console.log("Error", err);
      },
    },
  );

  const [newTags, setNewTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(transaction.tags?.map((tag) => String(tag.id)) || []);
  const [date, setDate] = useState<Date | null>(new Date(transaction.date));
  const [isTagsFocused, setTagsFocused] = useState(false);

  const { handleSubmit, itemProps } = useForm<{
    payee: string;
    category_id: string;
    recuring_id: string;
    reviewed: boolean; // XXX: should handle 3 states (+PENDING) and toggle 2 states (CLEARED/UNCLEARED).
    amount: string;
    notes: string;
    date: Date;
  }>({
    onSubmit: async (values) => {
      const tagsToUpdate = selectedTags.map((tag: string) => {
        const id = parseInt(tag, 10);
        return isNaN(id) ? tag : id;
      });
      const update: lunchMoney.TransactionUpdate = {
        payee: values.payee,
        category_id: values.category_id ? parseInt(values.category_id) : undefined,
        tags: tagsToUpdate,
        status: values.reviewed ? lunchMoney.TransactionStatus.CLEARED : lunchMoney.TransactionStatus.UNCLEARED,
        notes: values.notes,
        date: date ? formatISO(date, { representation: "date" }) : undefined,
      };

      onEdit(transaction, update);
      pop();
    },
    validation: {
      payee: (value) => {
        if (!value?.length) return "Payee is required";
      },
    },
    initialValues: {
      payee: transaction.payee,
      category_id: transaction.category_id?.toString() ?? "",
      recuring_id: transaction.recurring_id?.toString() ?? "",
      amount: transaction.amount,
      notes: transaction.notes,
      // We can assume that if the user is editing and updating the
      // transaction, it is considered reviewed until the user manually
      // unchecks the box.
      // XXX: use tx default state.
      reviewed: true,
    },
  });

  const tagItems = tags
    .map((tag) => <Form.TagPicker.Item key={tag.id} value={String(tag.id)} title={tag.name} />)
    .concat(newTags.map((tagName) => <Form.TagPicker.Item key={tagName} value={tagName} title={tagName} />));

  const AddTag = () => {
    const { handleSubmit, itemProps } = useForm<{ tag: string }>({
      onSubmit(values) {
        console.log(values);
        setNewTags([...newTags, values.tag]);
        setSelectedTags([...selectedTags, values.tag]);
        pop();
      },
      validation: {
        tag: (value) => {
          if (tags && tags.find((el) => el.name == value)) {
            return "This Tag already exist";
          }
          if (!value) {
            return "Name is required";
          }
        },
      },
    });

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Create" onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.TextField title="Name" placeholder="My Tag" {...itemProps.tag} />
      </Form>
    );
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {isTagsFocused && (
            <Action.Push title="Create New Tag" shortcut={{ modifiers: ["cmd"], key: "t" }} target={<AddTag />} />
          )}
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
          {!isTagsFocused && (
            <Action.Push title="Create New Tag" shortcut={{ modifiers: ["cmd"], key: "t" }} target={<AddTag />} />
          )}
          <Action title="Back" shortcut={{ modifiers: [], key: "arrowLeft" }} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Description
        title={"Transaction"}
        text={`${getFormatedAmount(transaction)} using '${transaction.account_display_name}'`}
      />
      <Form.TextField title="Payee" placeholder="Transaction payee" {...itemProps.payee} />
      <Form.Dropdown title="Category" {...itemProps.category_id}>
        <Form.Dropdown.Item title="No Category" value="" icon={Icon.XMarkCircle} />
        <TransactionFormCategories transaction={transaction} categories={categories} />
      </Form.Dropdown>
      <Form.TextArea title="Notes" {...itemProps.notes} />
      <Form.TagPicker
        id="tags"
        title="Tags"
        value={selectedTags}
        onChange={setSelectedTags}
        onFocus={() => setTagsFocused(true)}
        onBlur={() => setTagsFocused(false)}
      >
        {tagItems}
      </Form.TagPicker>
      <Form.DatePicker title="Date" type={Form.DatePicker.Type.Date} value={date} onChange={setDate} id="date" />
      <Form.Dropdown title="Recuring Expenses" {...itemProps.recuring_id}>
        <Form.Dropdown.Item title="No Recuring Expenses" value="" icon={Icon.XMarkCircle} />
        <TransactionFormRecuringItems transaction={transaction} recuringItems={recurringItems} />
      </Form.Dropdown>
      <Form.Checkbox title="Status" label="Reviewed" {...itemProps.reviewed} />
    </Form>
  );
}
