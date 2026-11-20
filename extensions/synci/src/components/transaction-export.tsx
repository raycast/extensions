import { Action, ActionPanel, Clipboard, Icon, open, showToast, Toast } from "@raycast/api";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { exportTransactions } from "../lib/transaction-export";
import type { Transaction } from "../lib/types";

export function TransactionExport({ transactions }: { transactions: Transaction[] }) {
  if (!transactions.length) return null;
  const exportData = async (format: "csv" | "tsv") => {
    try {
      const content = exportTransactions(transactions, format);
      if (format === "tsv") {
        await Clipboard.copy(content);
        await showToast({ style: Toast.Style.Success, title: `Copied ${transactions.length} loaded transactions` });
      } else {
        const directory = join(homedir(), "Downloads");
        await mkdir(directory, { recursive: true });
        const file = join(
          directory,
          `synci-transactions-${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}.csv`,
        );
        await writeFile(file, "\uFEFF" + content, { encoding: "utf8", flag: "wx", mode: 0o600 });
        await showToast({
          style: Toast.Style.Success,
          title: `Exported ${transactions.length} loaded transactions`,
          message: "Saved to Downloads",
          primaryAction: { title: "Open CSV", onAction: () => open(file) },
        });
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't export transactions",
        message: "Try again or check access to your Downloads folder.",
      });
    }
  };
  return (
    <ActionPanel.Submenu title={`Export ${transactions.length} Loaded Transactions`} icon={Icon.Download}>
      <Action title="Save CSV to Downloads" icon={Icon.Document} onAction={() => exportData("csv")} />
      <Action title="Copy for Spreadsheet" icon={Icon.Clipboard} onAction={() => exportData("tsv")} />
    </ActionPanel.Submenu>
  );
}
