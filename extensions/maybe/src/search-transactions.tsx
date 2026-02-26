import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, getAvatarIcon, useCachedPromise, useForm } from "@raycast/utils";
import { buildMaybeUrl, CURRENCIES, maybe } from "./maybe";
import { Transaction, TransactionCreateRequest } from "./types";
import { useState } from "react";

export default function SearchTransactions() {
  const [filter, setFilter] = useState("");
  const { isLoading: isLoadingAccounts, data: accounts } = useCachedPromise(
    async () => {
      const data = await maybe.accounts.list({ page: 1, per_page: 100 });
      return data.accounts;
    },
    [],
    { initialData: [] },
  );

  const {
    isLoading: isLoadingTransactions,
    data: transactions,
    pagination,
    mutate,
  } = useCachedPromise(
    (params: string) => async (options) => {
      const data = await maybe.transactions.list({ page: options.page + 1, per_page: 25, params });
      return {
        data: data.transactions,
        hasMore: data.pagination.page < data.pagination.total_pages,
      };
    },
    [filter],
    { initialData: [] },
  );

  const sortedGrouped = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .reduce((acc, transaction) => {
      const existing = acc.get(transaction.date) ?? [];
      existing.push(transaction);
      acc.set(transaction.date, existing);
      return acc;
    }, new Map<string, Transaction[]>());

  const isLoading = isLoadingAccounts || isLoadingTransactions;
  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder="Search transactions"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilter}>
          <List.Dropdown.Item icon="maybe.png" title="All" value="" />
          <List.Dropdown.Section title="Accounts">
            {accounts.map((account) => (
              <List.Dropdown.Item
                key={account.id}
                icon={Icon.CreditCard}
                title={`${account.name} (${account.balance})`}
                value={`account_id=${account.id}`}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!isLoading && !transactions.length ? (
        <List.EmptyView
          icon={Icon.Layers}
          title="No entries found"
          description="Try adding an entry, editing filters or refining your search"
        />
      ) : (
        [...sortedGrouped].map(([date, transactions]) => (
          <List.Section key={date} title={new Date(date).toDateString()} subtitle={transactions.length.toString()}>
            {transactions.map((transaction) => (
              <List.Item
                key={transaction.id}
                icon={getAvatarIcon(transaction.name)}
                title={transaction.name}
                subtitle={transaction.account.name}
                accessories={[
                  {
                    tag: transaction.category
                      ? { value: transaction.category.name, color: transaction.category.color }
                      : "Uncategorized",
                  },
                  { text: transaction.amount },
                ]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={buildMaybeUrl(`transactions/${transaction.id}`)} />
                    <ActionPanel.Section>
                      <Action
                        icon={Icon.Trash}
                        title="Delete Transaction"
                        onAction={() =>
                          confirmAlert({
                            title: "Are you sure?",
                            message: "This action cannot be undone.",
                            primaryAction: {
                              style: Alert.ActionStyle.Destructive,
                              title: "Confirm",
                              async onAction() {
                                const toast = await showToast(Toast.Style.Animated, "Deleting", transaction.id);
                                try {
                                  await mutate(
                                    maybe.transactions
                                      .delete({ id: transaction.id })
                                      .then((result) => (toast.message = result.message)),
                                    {
                                      optimisticUpdate(data) {
                                        return data.filter((t) => t.id !== transaction.id);
                                      },
                                    },
                                  );
                                  toast.style = Toast.Style.Success;
                                  toast.title = "Deleted";
                                } catch (error) {
                                  toast.style = Toast.Style.Failure;
                                  toast.title = "Failed";
                                  toast.message = `${error}`;
                                }
                              },
                            },
                          })
                        }
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        style={Action.Style.Destructive}
                      />
                      <Action.Push
                        icon={Icon.Plus}
                        title="New Transaction"
                        target={<NewTransaction />}
                        onPop={mutate}
                        shortcut={Keyboard.Shortcut.Common.New}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

function NewTransaction() {
  const { pop } = useNavigation();
  const { isLoading, data: accounts } = useCachedPromise(
    async () => {
      const data = await maybe.accounts.list({ page: 1, per_page: 100 });
      return data.accounts;
    },
    [],
    { initialData: [] },
  );

  const { handleSubmit, itemProps } = useForm<TransactionCreateRequest>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.description);
      try {
        const result = await maybe.transactions.create({ transaction: values });
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        toast.message = result.name;
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      date: new Date(),
    },
    validation: {
      description: FormValidation.Required,
      account_id: FormValidation.Required,
      currency: FormValidation.Required,
      date: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="New Transaction"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Add Transaction" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Description" placeholder="Describe transaction" {...itemProps.description} />
      <Form.Dropdown title="Account" {...itemProps.account_id}>
        {accounts.map((account) => (
          <Form.Dropdown.Item key={account.id} title={account.name} value={account.id} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Amount" placeholder="100" {...itemProps.amount} />
      <Form.Dropdown title="Currency" {...itemProps.currency}>
        {CURRENCIES.map((currency) => (
          <Form.Dropdown.Item key={currency} title={currency} value={currency} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker title="Date" type={Form.DatePicker.Type.Date} {...itemProps.date} />
      <Form.TextArea title="Notes" placeholder="Enter a note" {...itemProps.notes} />
    </Form>
  );
}
