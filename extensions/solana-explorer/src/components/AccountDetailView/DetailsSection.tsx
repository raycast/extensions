import { Action, ActionPanel, Color, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { AccountInfo, LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { FC } from "react";

interface IDEtailsSectionProps {
  accData: AccountInfo<Buffer> | null | undefined;
  pubkey: string;
  cluster: string;
}

export const DetailsSection: FC<IDEtailsSectionProps> = ({ accData, pubkey, cluster }) => {
  return (
    <List.Item
      title="Details"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Address" content={pubkey} />
          <Action.OpenInBrowser
            title="Open in Solana Explorer"
            url={`https://explorer.solana.com/address/${pubkey}?cluster=${cluster}`}
            icon={getFavicon("https://explorer.solana.com")}
          />
          <Action.OpenInBrowser
            title="Open in Solscan"
            url={`https://solscan.io/account/${pubkey}?cluster=${cluster}`}
            icon={getFavicon("https://solscan.io")}
            shortcut={{ modifiers: ["cmd", "opt"], key: "enter" }}
          />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Address" text={pubkey} />
              <List.Item.Detail.Metadata.Label
                title="Balance"
                text={`${(accData?.lamports || 0) / LAMPORTS_PER_SOL} SOL`}
              />
              {accData?.owner && <List.Item.Detail.Metadata.Label title="Owner" text={accData.owner.toString()} />}
              <List.Item.Detail.Metadata.TagList title="Executable">
                <List.Item.Detail.Metadata.TagList.Item
                  text={accData?.executable ? "Yes" : "No"}
                  color={accData?.executable ? Color.Green : Color.Red}
                />
              </List.Item.Detail.Metadata.TagList>
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
};
