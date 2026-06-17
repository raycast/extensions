import { Action, ActionPanel, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { LAMPORTS_PER_SOL, ParsedTransactionWithMeta } from "@solana/web3.js";
import type { FC } from "react";
import { resolveUrl, SolType } from "../../utils/explorerResolver";

interface ITransactionSectionProps {
  data: ParsedTransactionWithMeta;
  sig: string;
  cluster: string;
}

export const DetailsSection: FC<ITransactionSectionProps> = ({ data, sig, cluster }) => {
  return (
    <List.Item
      title="Transaction"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Signature" content={sig} />

          <Action.OpenInBrowser
            title="Open in Explorer"
            url={resolveUrl(sig, SolType.TRANSACTION, cluster)}
            icon={getFavicon(resolveUrl(sig, SolType.TRANSACTION, cluster))}
          />
        </ActionPanel>
      }
      detail={
        <>
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                {data.meta?.err && (
                  <List.Item.Detail.Metadata.Label key="Error" title="Error" text={data.meta.err.toString()} />
                )}
                {data.meta?.fee && (
                  <List.Item.Detail.Metadata.Label
                    key="Fee"
                    title="Fee"
                    text={`${data.meta.fee / LAMPORTS_PER_SOL} SOL`}
                  />
                )}
                {data.blockTime && (
                  <List.Item.Detail.Metadata.Label
                    key="Block Time"
                    title="Block Time"
                    text={new Date(data.blockTime * 1000).toLocaleString()}
                  />
                )}
                {data.transaction.message.recentBlockhash && (
                  <List.Item.Detail.Metadata.Label
                    key="Recent Blockhash"
                    title="Recent Blockhash"
                    text={data.transaction.message.recentBlockhash}
                  />
                )}
                {data.slot && <List.Item.Detail.Metadata.Label key="Slot" title="Slot" text={data.slot.toString()} />}
                {data.version && (
                  <List.Item.Detail.Metadata.Label key="Version" title="Version" text={data.version.toString()} />
                )}
              </List.Item.Detail.Metadata>
            }
          />
        </>
      }
    />
  );
};
