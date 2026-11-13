import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { APP_URL } from "../lib/config";
import {
  accountName,
  accountUrl,
  dateLabel,
  decimal,
  markdown,
  money,
  transactionDate,
  transactionDescription,
  transactionName,
} from "../lib/format";
import type { Transaction } from "../lib/types";
import type { ReactNode } from "react";
import { CommonActions } from "./common";
import { transactionMetadata } from "../lib/transaction-details";
import { merchantIcon } from "./merchant-icon";

function description(transaction: Transaction) {
  return `# ${markdown(transactionName(transaction))}\n\n## ${markdown(money(transaction.amount, transaction.currency))}\n\n${markdown(transactionDescription(transaction) || "No description provided.")}`;
}

function metadata(transaction: Transaction) {
  const Metadata = List.Item.Detail.Metadata;
  return (
    <Metadata>
      {transactionMetadata(transaction).map(([title, text], index) =>
        title === "Status" ? (
          <Metadata.TagList key={index} title={title}>
            <Metadata.TagList.Item text={text} color={transaction.booked ? Color.Green : Color.Orange} />
          </Metadata.TagList>
        ) : (
          <Metadata.Label key={index} title={title} text={text} />
        ),
      )}
    </Metadata>
  );
}

export function TransactionDetail({ transaction }: { transaction: Transaction }) {
  return (
    <List navigationTitle="Transaction Details" searchBarPlaceholder="Find a transaction field…">
      {transactionMetadata(transaction).map(([title, value], index) => (
        <List.Item
          key={index}
          id={`field-${index}`}
          title={title}
          keywords={[value]}
          accessories={
            title === "Status"
              ? [{ tag: { value, color: transaction.booked ? Color.Green : Color.Orange } }]
              : [{ text: value, tooltip: value }]
          }
          actions={<TransactionActions transaction={transaction} selectedField={value} />}
        />
      ))}
    </List>
  );
}

function TransactionActions({
  transaction,
  children,
  refresh,
  pushDetail = false,
  selectedField,
}: {
  transaction: Transaction;
  children?: ReactNode;
  refresh?: () => void;
  pushDetail?: boolean;
  selectedField?: string;
}) {
  return (
    <ActionPanel>
      {selectedField !== undefined && (
        <Action.CopyToClipboard
          title="Copy Field Value"
          content={selectedField}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      )}
      {pushDetail && (
        <Action.Push
          title="View Transaction"
          icon={Icon.Receipt}
          target={<TransactionDetail transaction={transaction} />}
        />
      )}
      {transaction.financial_account && (
        <Action.OpenInBrowser
          title="Open Account in Synci"
          url={accountUrl(transaction.financial_account)}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
      )}
      <Action.OpenInBrowser title="Open Transactions in Synci" url={`${APP_URL}/transactions`} />
      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard
          title="Copy Amount"
          content={String(transaction.amount)}
          shortcut={selectedField === undefined ? Keyboard.Shortcut.Common.Copy : undefined}
        />
        <Action.CopyToClipboard
          title="Copy Transaction"
          content={`${transactionName(transaction)}\n${money(transaction.amount, transaction.currency)}\n${dateLabel(transactionDate(transaction))} · ${accountName(transaction.financial_account)}\n${transactionDescription(transaction)}`}
        />
        <Action.CopyToClipboard title="Copy Transaction ID" content={String(transaction.id)} />
        <Action.CopyToClipboard title="Copy Transaction JSON" content={JSON.stringify(transaction, null, 2)} />
      </ActionPanel.Section>
      {children}
      <CommonActions refresh={refresh} />
    </ActionPanel>
  );
}

export function TransactionItem({
  transaction,
  showDetails = false,
  showDate = true,
  children,
  refresh,
}: {
  transaction: Transaction;
  showDetails?: boolean;
  showDate?: boolean;
  children?: ReactNode;
  refresh?: () => void;
}) {
  const incoming = decimal(transaction.amount)?.isPositive();
  return (
    <List.Item
      id={String(transaction.id)}
      title={transactionName(transaction)}
      subtitle={showDetails ? undefined : accountName(transaction.financial_account)}
      icon={merchantIcon([transaction])}
      accessories={[
        ...(!transaction.booked ? [{ tag: { value: "Pending", color: Color.Orange } }] : []),
        {
          text: {
            value: money(transaction.amount, transaction.currency),
            color: incoming ? Color.Green : Color.PrimaryText,
          },
          tooltip: `${transaction.amount} ${transaction.currency}`,
        },
        ...(!showDetails && showDate
          ? [{ text: dateLabel(transactionDate(transaction)), tooltip: "Synci mapped date" }]
          : []),
      ]}
      keywords={[
        accountName(transaction.financial_account),
        transactionDescription(transaction),
        transaction.currency,
        String(transaction.amount),
        money(transaction.amount, transaction.currency),
        transactionDate(transaction) || "",
        String(transaction.id),
      ]}
      detail={
        showDetails ? (
          <List.Item.Detail markdown={description(transaction)} metadata={metadata(transaction)} />
        ) : undefined
      }
      actions={
        <TransactionActions transaction={transaction} pushDetail refresh={refresh}>
          {children}
        </TransactionActions>
      }
    />
  );
}
