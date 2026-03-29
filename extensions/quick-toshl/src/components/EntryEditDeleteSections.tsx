import { ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import { TransactionForm } from "./TransactionForm";
import { TransferForm } from "./TransferForm";
import { toshl } from "../utils/toshl";
import type { Transaction } from "../utils/types";
import { isTransferEntry } from "../utils/toshl-model";
import { confirmEntryDeletion } from "./entry-delete";

type Props = {
  transaction: Transaction;
  /** Same types as `useNavigation()` (avoids duplicate-`@types/react` ReactNode mismatches in CI). */
  push: ReturnType<typeof useNavigation>["push"];
  pop: ReturnType<typeof useNavigation>["pop"];
  revalidate: () => void;
  /** Perform delete after user confirmed in this component. */
  onDeleted: (transaction: Transaction, mode?: "one" | "tail" | "all") => Promise<void>;
};

export function EntryEditDeleteSections({ transaction, push, pop, revalidate, onDeleted }: Props) {
  const transfer = isTransferEntry(transaction);
  const recurring = !!transaction.repeat;

  async function runDelete(mode?: "one" | "tail" | "all") {
    const resolvedMode = recurring ? mode : undefined;
    if (!(await confirmEntryDeletion(transaction, resolvedMode))) return;
    await onDeleted(transaction, resolvedMode);
  }

  if (transfer) {
    return (
      <>
        <ActionPanel.Section title="Edit">
          <Action
            title="Edit This Transfer"
            icon={Icon.Pencil}
            onAction={() =>
              push(
                <TransferForm
                  transaction={transaction}
                  recurringUpdateMode={recurring ? "one" : undefined}
                  onSaved={revalidate}
                />,
              )
            }
          />
          {recurring && (
            <>
              <Action
                title="Edit This & Future"
                icon={Icon.Forward}
                onAction={() =>
                  push(<TransferForm transaction={transaction} recurringUpdateMode="tail" onSaved={revalidate} />)
                }
              />
              <Action
                title="Edit All Occurrences"
                icon={Icon.List}
                onAction={() =>
                  push(<TransferForm transaction={transaction} recurringUpdateMode="all" onSaved={revalidate} />)
                }
              />
            </>
          )}
        </ActionPanel.Section>
        <ActionPanel.Section title="Delete">
          <Action
            title={recurring ? "Delete This Only" : "Delete Transfer"}
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => runDelete(recurring ? "one" : undefined)}
          />
          {recurring && (
            <>
              <Action
                title="Delete This & Future"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => runDelete("tail")}
              />
              <Action
                title="Delete All Occurrences"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => runDelete("all")}
              />
            </>
          )}
        </ActionPanel.Section>
      </>
    );
  }

  return (
    <>
      <ActionPanel.Section title="Edit">
        <Action
          title="Edit This Entry"
          icon={Icon.Pencil}
          onAction={() =>
            push(
              <TransactionForm
                type={transaction.amount < 0 ? "expense" : "income"}
                transaction={transaction}
                onSubmit={async (values) => {
                  await toshl.updateTransaction(transaction.id, values, recurring ? "one" : undefined);
                  revalidate();
                  pop();
                }}
              />,
            )
          }
        />
        {recurring && (
          <>
            <Action
              title="Edit This & Future"
              icon={Icon.Forward}
              onAction={() =>
                push(
                  <TransactionForm
                    type={transaction.amount < 0 ? "expense" : "income"}
                    transaction={transaction}
                    onSubmit={async (values) => {
                      await toshl.updateTransaction(transaction.id, values, "tail");
                      revalidate();
                      pop();
                    }}
                  />,
                )
              }
            />
            <Action
              title="Edit All Occurrences"
              icon={Icon.List}
              onAction={() =>
                push(
                  <TransactionForm
                    type={transaction.amount < 0 ? "expense" : "income"}
                    transaction={transaction}
                    onSubmit={async (values) => {
                      await toshl.updateTransaction(transaction.id, values, "all");
                      revalidate();
                      pop();
                    }}
                  />,
                )
              }
            />
          </>
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Delete">
        <Action
          title={recurring ? "Delete This Only" : "Delete Transaction"}
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() => runDelete(recurring ? "one" : undefined)}
        />
        {recurring && (
          <>
            <Action
              title="Delete This & Future"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => runDelete("tail")}
            />
            <Action
              title="Delete All Occurrences"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => runDelete("all")}
            />
          </>
        )}
      </ActionPanel.Section>
    </>
  );
}
