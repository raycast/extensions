import { Detail, ActionPanel, Action, Icon, LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { Transaction } from "./lib/types";
import { relativeAge, formatDate } from "./lib/utils";

async function fetchTransaction(txid: string): Promise<Transaction> {
  const res = await fetch(`https://mempool.space/api/tx/${txid}`);
  if (!res.ok) {
    throw new Error(`Transaction not found (${res.status})`);
  }
  return (await res.json()) as Transaction;
}

function truncateTxid(txid: string): string {
  return `${txid.slice(0, 8)}...${txid.slice(-8)}`;
}

export default function Command({
  arguments: { txid },
}: LaunchProps<{ arguments: Arguments.LookUpTransaction }>) {
  const raw = txid.trim();

  if (!raw) {
    return (
      <Detail markdown="## Missing transaction ID\n\nPlease enter a valid Bitcoin transaction ID (TXID)." />
    );
  }

  const {
    isLoading,
    data: tx,
    error,
    revalidate,
  } = usePromise(fetchTransaction, [raw], { execute: true });

  if (isLoading) {
    return <Detail isLoading markdown="## Fetching transaction data…" />;
  }

  if (error || !tx) {
    return (
      <Detail
        markdown={`## Transaction not found\n\n${error?.message || "No transaction found for that TXID."}`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Search on Mempool"
              url="https://mempool.space"
            />
            <Action
              icon={Icon.RotateClockwise}
              title="Retry"
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
    );
  }

  const mempoolUrl = `https://mempool.space/tx/${tx.txid}`;

  const inputCount = tx.vin.length;
  const outputCount = tx.vout.length;

  const totalInput = tx.vin.reduce(
    (sum, vin) => sum + (vin.prevout?.value ?? 0),
    0,
  );
  const totalOutput = tx.vout.reduce((sum, vout) => sum + vout.value, 0);
  const feeSats = tx.fee;
  const feeBtc = feeSats / 100_000_000;
  const sizeKB = tx.size / 1000;
  const feeRate = tx.weight > 0 ? tx.fee / (tx.weight / 4) : 0;

  const confirmedIcon = tx.status.confirmed ? "✅" : "⏳";
  const statusLine = tx.status.confirmed
    ? `Confirmed in block **#${tx.status.block_height?.toLocaleString()}**`
    : "Unconfirmed (in mempool)";

  const blockInfo = tx.status.block_time
    ? `Mined ${formatDate(tx.status.block_time)} (${relativeAge(tx.status.block_time)})`
    : "";

  const markdown = `
## Transaction ${truncateTxid(tx.txid)}

${confirmedIcon} ${statusLine}

| Field | Value |
|---|---|
| **Full TXID** | \`${tx.txid}\` |
| **Size** | ${sizeKB.toFixed(1)} kB |
| **Weight** | ${tx.weight.toLocaleString()} WU |
| **Fee** | ${feeSats.toLocaleString()} sats (${feeBtc.toFixed(8)} BTC) |
| **Fee Rate** | ${feeRate.toFixed(1)} sat/vB |
| **Inputs** | ${inputCount} (${totalInput.toLocaleString()} sats) |
| **Outputs** | ${outputCount} (${totalOutput.toLocaleString()} sats) |
${tx.status.block_time ? `| **Block Time** | ${blockInfo} |` : ""}
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open on Mempool"
            url={mempoolUrl}
            icon={Icon.Globe}
          />
          <Action
            icon={Icon.RotateClockwise}
            title="Refresh"
            onAction={revalidate}
          />
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Txid"
              content={tx.txid}
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            />
            <Action.CopyToClipboard
              title="Copy Fee (Sats)"
              content={String(feeSats)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            />
            <Action.CopyToClipboard
              title="Copy All Details (JSON)"
              content={JSON.stringify(tx, null, 2)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
