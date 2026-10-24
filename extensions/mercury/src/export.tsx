import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { Action, ActionPanel, Clipboard, Icon, Keyboard, showInFinder, showToast, Toast } from "@raycast/api";
import { uniquePath } from "@chrismessina/raycast-downloader";
import { showFailureToast } from "@raycast/utils";
import { formatDateTime } from "./format";
import { categoryOf } from "./categories";
import { copyErrorAction, Transaction } from "./mercury";

// Serializers follow raycast-attio's export-format.ts, with one change for money: a plain number
// such as "-6.75" is not a formula, and prefixing it with an apostrophe would make every debit
// import as text instead of a number.

function neutralizeFormula(field: string): string {
  if (/^-?\d+(\.\d+)?$/.test(field)) return field;
  return /^[=+\-@\t\r]/.test(field) ? `'${field}` : field;
}

function escapeCsvField(field: string): string {
  const safe = neutralizeFormula(field);
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(columns: string[], rows: string[][]): string {
  return [columns, ...rows].map((row) => row.map(escapeCsvField).join(",")).join("\n") + "\n";
}

function toMarkdownTable(columns: string[], rows: string[][]): string {
  const cell = (value: string) => value.replace(/\|/g, "\\|").replace(/\n/g, " ");
  return [
    `| ${columns.map(cell).join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
  ].join("\n");
}

function toTsv(columns: string[], rows: string[][]): string {
  return [columns, ...rows]
    .map((row) => row.map((field) => neutralizeFormula(field).replace(/[\t\n]/g, " ")).join("\t"))
    .join("\n");
}

export const TRANSACTION_COLUMNS = [
  "Date",
  "Name",
  "Amount",
  "Status",
  "Account",
  "Category",
  "Type",
  "Note",
  "Memo",
  "Transaction ID",
];

export function transactionRow(transaction: Transaction, accountName: string): string[] {
  return [
    formatDateTime(transaction.createdAt),
    transaction.counterpartyNickname || transaction.counterpartyName,
    transaction.amount.toFixed(2),
    transaction.status,
    accountName,
    categoryOf(transaction)?.label ?? "",
    transaction.kind,
    transaction.note ?? "",
    transaction.externalMemo ?? "",
    transaction.id,
  ];
}

function timestamp() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
}

/** Write a file to ~/Downloads with a timestamped name, and offer Show in Finder and Copy Path. */
export async function saveToDownloads(filenameBase: string, extension: string, content: string, noun: string) {
  try {
    const directory = join(homedir(), "Downloads");
    mkdirSync(directory, { recursive: true });
    // Two exports in the same minute get "name (2)" instead of overwriting the first; "wx" refuses
    // to overwrite if another process took the name in between.
    const filePath = uniquePath(directory, `${filenameBase}-${timestamp()}${extension}`);
    writeFileSync(filePath, content, { encoding: "utf8", flag: "wx" });
    await showToast({
      style: Toast.Style.Success,
      title: `Saved ${noun}`,
      message: basename(filePath),
      primaryAction: {
        title: "Show in Finder",
        shortcut: { modifiers: ["cmd", "shift"], key: "f" },
        onAction: () => showInFinder(filePath),
      },
      secondaryAction: {
        title: "Copy Path",
        shortcut: Keyboard.Shortcut.Common.CopyPath,
        onAction: () => Clipboard.copy(filePath),
      },
    });
  } catch (error) {
    await showFailureToast(error, { title: `Couldn't save ${noun}`, primaryAction: copyErrorAction(error) });
  }
}

/** Submenu that exports every row the user is currently looking at. */
export function ExportTransactionsSubmenu({ filenameBase, rows }: { filenameBase: string; rows: string[][] }) {
  const noun = `${rows.length} ${rows.length === 1 ? "transaction" : "transactions"}`;
  return (
    <ActionPanel.Submenu
      title={`Export ${rows.length} ${rows.length === 1 ? "Transaction" : "Transactions"}`}
      icon={Icon.Download}
    >
      <Action
        title="Export as CSV"
        icon={Icon.Document}
        onAction={() => saveToDownloads(filenameBase, ".csv", toCsv(TRANSACTION_COLUMNS, rows), noun)}
      />
      <Action
        title="Export as Markdown"
        icon={Icon.Document}
        onAction={() => saveToDownloads(filenameBase, ".md", toMarkdownTable(TRANSACTION_COLUMNS, rows) + "\n", noun)}
      />
      <Action
        title="Export as Plain Text"
        icon={Icon.Document}
        onAction={() => saveToDownloads(filenameBase, ".txt", toTsv(TRANSACTION_COLUMNS, rows) + "\n", noun)}
      />
    </ActionPanel.Submenu>
  );
}
