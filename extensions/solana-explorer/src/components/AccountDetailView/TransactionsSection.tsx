import { Action, ActionPanel, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { ConfirmedSignatureInfo, Connection } from "@solana/web3.js";
import type { FC } from "react";
import { resolveUrl, SolType } from "../../utils/explorerResolver";
import TransactionDetailView from "../TransactionDetailView";

interface ITransactionsSectionProps {
  connection: Connection;
  transactionsData: ConfirmedSignatureInfo[] | undefined;
  cluster: string;
}

export const TransactionsSection: FC<ITransactionsSectionProps> = ({ connection, transactionsData, cluster }) => {
  return (
    <List.Section title="Transactions">
      {transactionsData?.map((transaction, index) => (
        <List.Item
          title={transaction.signature}
          key={index}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Transaction Details"
                target={<TransactionDetailView key={index} signature={transaction.signature} connection={connection} />}
              />
              <Action.CopyToClipboard title="Copy Signature" content={transaction.signature} />
              <Action.OpenInBrowser
                title="Open in Explorer"
                url={resolveUrl(transaction.signature, SolType.TRANSACTION, cluster)}
                icon={getFavicon(resolveUrl(transaction.signature, SolType.TRANSACTION, cluster))}
                shortcut={{ modifiers: ["cmd", "opt"], key: "enter" }}
              />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Signature" text={transaction.signature} />
                  <List.Item.Detail.Metadata.Label title="Block" text={transaction.slot.toString()} />
                  {transaction.memo && <List.Item.Detail.Metadata.Label title="Memo" text={transaction.memo} />}
                  {transaction.blockTime && (
                    <List.Item.Detail.Metadata.Label
                      title="Block TIme"
                      text={new Date(transaction.blockTime * 1000).toLocaleString()}
                    />
                  )}
                  <List.Item.Detail.Metadata.Label title="Slot" text={transaction.slot.toString()} />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List.Section>
  );
};
