import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type { Transaction } from "../lib/types";
import {
  formatCurrency,
  formatDate,
  getTransactionStatusIcon,
} from "../lib/utils";
import {
  PAYMENT_METHOD_LABELS,
  TRANSACTION_STATUS_LABELS,
} from "../lib/constants";
import { AccountSwitcherActions } from "./AccountSwitcher";

interface TransactionListItemProps {
  transaction: Transaction;
  showDetail?: boolean;
  showAccountActions?: boolean;
  toggleDetail?: () => void;
}

function TransactionDetail({ transaction }: { transaction: Transaction }) {
  const statusIcon = getTransactionStatusIcon(transaction.status);
  const statusLabel =
    TRANSACTION_STATUS_LABELS[transaction.status] ?? transaction.status;
  const methodLabel = transaction.paymentMethod
    ? (PAYMENT_METHOD_LABELS[transaction.paymentMethod] ??
      transaction.paymentMethod)
    : null;
  const categoryName =
    transaction.customCategory?.name ??
    transaction.categoryData?.name ??
    transaction.mercuryCategory ??
    null;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Amount"
            text={{
              value: formatCurrency(transaction.amount),
              color: transaction.amount >= 0 ? Color.Green : Color.Red,
            }}
          />
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={statusLabel}
              color={statusIcon.tintColor}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label
            title="Date"
            text={formatDate(transaction.createdAt)}
          />
          {transaction.postedAt && (
            <List.Item.Detail.Metadata.Label
              title="Posted"
              text={formatDate(transaction.postedAt)}
            />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Counterparty"
            text={transaction.counterpartyName || "Unknown"}
          />
          {methodLabel && (
            <List.Item.Detail.Metadata.Label
              title="Payment Method"
              text={methodLabel}
            />
          )}
          <List.Item.Detail.Metadata.Label
            title="Kind"
            text={transaction.kind}
          />
          <List.Item.Detail.Metadata.Separator />
          {categoryName && (
            <List.Item.Detail.Metadata.TagList title="Category">
              <List.Item.Detail.Metadata.TagList.Item
                text={categoryName}
                color={Color.Blue}
              />
            </List.Item.Detail.Metadata.TagList>
          )}
          {transaction.note && (
            <List.Item.Detail.Metadata.Label
              title="Note"
              text={transaction.note}
            />
          )}
          {transaction.externalMemo && (
            <List.Item.Detail.Metadata.Label
              title="Memo"
              text={transaction.externalMemo}
            />
          )}
          {transaction.dashboardLink && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Link
                title="Dashboard"
                target={transaction.dashboardLink}
                text="Open in Mercury"
              />
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function TransactionListItem({
  transaction,
  showDetail = false,
  showAccountActions = true,
  toggleDetail,
}: TransactionListItemProps) {
  const statusIcon = getTransactionStatusIcon(transaction.status);

  const accessories: List.Item.Accessory[] = showDetail
    ? [
        {
          text: {
            value: formatCurrency(transaction.amount),
            color: transaction.amount >= 0 ? Color.Green : Color.Red,
          },
        },
      ]
    : [
        {
          tag: {
            value:
              TRANSACTION_STATUS_LABELS[transaction.status] ??
              transaction.status,
            color: statusIcon.tintColor,
          },
        },
        { text: formatDate(transaction.createdAt) },
        {
          text: {
            value: formatCurrency(transaction.amount),
            color: transaction.amount >= 0 ? Color.Green : Color.Red,
          },
        },
      ];

  return (
    <List.Item
      title={
        transaction.counterpartyName || transaction.bankDescription || "Unknown"
      }
      subtitle={transaction.note ?? transaction.externalMemo ?? undefined}
      icon={statusIcon}
      accessories={accessories}
      detail={
        showDetail ? <TransactionDetail transaction={transaction} /> : undefined
      }
      keywords={[
        transaction.counterpartyName,
        transaction.bankDescription ?? "",
        transaction.note ?? "",
      ].filter(Boolean)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {transaction.dashboardLink && (
              <Action.OpenInBrowser
                title="Open in Mercury"
                url={transaction.dashboardLink}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            )}
            <Action.CopyToClipboard
              title="Copy Amount"
              content={formatCurrency(transaction.amount)}
            />
            <Action.CopyToClipboard
              title="Copy Counterparty"
              content={transaction.counterpartyName || ""}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            {toggleDetail && (
              <Action
                title={showDetail ? "Hide Details" : "Show Details"}
                icon={Icon.Sidebar}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                onAction={toggleDetail}
              />
            )}
            <Action.CopyToClipboard
              title="Copy Transaction Id"
              content={transaction.id}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          {showAccountActions && (
            <ActionPanel.Section>
              <AccountSwitcherActions />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}

export function transactionSection(
  title: string,
  transactions: Transaction[],
): { title: string; transactions: Transaction[] } {
  return { title, transactions };
}

export function groupTransactionsByDate(
  transactions: Transaction[],
): Map<string, Transaction[]> {
  const groups = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const date = formatDate(tx.createdAt);
    const existing = groups.get(date) ?? [];
    existing.push(tx);
    groups.set(date, existing);
  }
  return groups;
}