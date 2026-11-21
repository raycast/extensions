import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { categoryOf } from "../categories";
import { saveToDownloads, toCsv, TRANSACTION_COLUMNS, transactionRow } from "../export";
import { alignedText, formatDate, formatDateTime, formatSignedCurrency, humanize } from "../format";
import { Transaction } from "../mercury";

/** A card purchase is from a merchant; money out goes to a recipient; money in comes from a sender. */
export function partyRole(transaction: Transaction): "Merchant" | "Recipient" | "Sender" {
  if (transaction.kind === "debitCardTransaction" || transaction.kind === "creditCardTransaction") return "Merchant";
  return transaction.amount < 0 ? "Recipient" : "Sender";
}

function fields(
  transaction: Transaction,
  accountName: string,
  cardLabel?: string,
): Array<[string, string | null | undefined]> {
  const name = transaction.counterpartyNickname || transaction.counterpartyName;
  return [
    ["Amount", formatSignedCurrency(transaction.amount)],
    [partyRole(transaction), name],
    ["Status", humanize(transaction.status)],
    ["Reason", transaction.reasonForFailure],
    ["Account", accountName],
    ["Card", cardLabel],
    ["Category", categoryOf(transaction)?.label],
    ["Type", humanize(transaction.kind)],
    ["Created", formatDateTime(transaction.createdAt)],
    ["Posted", transaction.postedAt ? formatDate(transaction.postedAt) : undefined],
    [
      "Expected",
      !transaction.postedAt && transaction.status === "pending" && transaction.estimatedDeliveryDate
        ? formatDate(transaction.estimatedDeliveryDate)
        : undefined,
    ],
    ["Note", transaction.note],
    ["Memo", transaction.externalMemo],
    ["Bank description", transaction.bankDescription],
    ["Receipt", transaction.attachments?.find((attachment) => attachment.attachmentType === "receipt")?.fileName],
    ["Transaction ID", transaction.id],
  ];
}

export function transactionAsText(transaction: Transaction, accountName: string, cardLabel?: string): string {
  const all = fields(transaction, accountName, cardLabel);
  const name = transaction.counterpartyNickname || transaction.counterpartyName;
  return alignedText(
    [name, `${formatSignedCurrency(transaction.amount)} · ${humanize(transaction.status)}`],
    [all.slice(1, 4), all.slice(4, 8), all.slice(8, 11), all.slice(11)],
  );
}

export function TransactionDetails({
  transaction,
  accountName,
  cardLabel,
  primary = "copy",
}: {
  transaction: Transaction;
  accountName: string;
  cardLabel?: string;
  /** Card transactions open in Mercury first; everything else copies first. */
  primary?: "copy" | "open";
}) {
  const name = transaction.counterpartyNickname || transaction.counterpartyName;
  const text = transactionAsText(transaction, accountName, cardLabel);
  const csv = toCsv(TRANSACTION_COLUMNS, [transactionRow(transaction, accountName)]);
  const filenameBase = `mercury-${name.replace(/[^\w]+/g, "-").toLowerCase()}`;
  const category = categoryOf(transaction);

  const openInMercury = (
    <Action.OpenInBrowser
      key="open"
      title="Open in Mercury"
      icon={getFavicon("https://mercury.com")}
      url={transaction.dashboardLink}
    />
  );
  const copyAsText = <Action.CopyToClipboard key="copy" title="Copy as Text" content={text} />;

  return (
    <List navigationTitle={`${name} · ${formatSignedCurrency(transaction.amount)}`}>
      {fields(transaction, accountName, cardLabel)
        .filter((field): field is [string, string] => Boolean(field[1]))
        .map(([label, value]) => (
          <List.Item
            key={label}
            title={label}
            accessories={[
              label === "Category" && category
                ? { tag: { value, color: category.color } }
                : {
                    text: {
                      value,
                      color:
                        label === "Reason"
                          ? Color.Red
                          : label === "Amount"
                            ? transaction.amount < 0
                              ? Color.Red
                              : Color.Green
                            : undefined,
                    },
                  },
            ]}
            actions={
              <ActionPanel>
                {primary === "open" ? [openInMercury, copyAsText] : [copyAsText]}
                <Action.CopyToClipboard title="Copy as CSV" icon={Icon.Document} content={csv} />
                <Action
                  title="Export as CSV"
                  icon={Icon.Download}
                  onAction={() => saveToDownloads(filenameBase, ".csv", csv, "transaction")}
                />
                {primary === "copy" && openInMercury}
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
