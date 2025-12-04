import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { FC } from "react";
import { Account } from "../../types";
import { resolveUrl, SolType } from "../../utils/explorerResolver";
import AccountDetailView from "../AccountDetailView";

interface IAccountsSectionProps {
  accounts: Account[] | undefined;
  connection: Connection;
  cluster: string;
}

export const AccountsSection: FC<IAccountsSectionProps> = ({ accounts, connection, cluster }) => {
  return (
    <List.Section title="Accounts">
      {accounts &&
        accounts.map((accountKey, index) => (
          <List.Item
            key={index}
            title={accountKey.pubkey}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Account Details"
                  target={<AccountDetailView key={index} pubkey={accountKey.pubkey} connection={connection} />}
                />
                <Action.CopyToClipboard title="Copy Address" content={accountKey.pubkey} />
                <Action.OpenInBrowser
                  title="Open in Explorer"
                  url={resolveUrl(accountKey.pubkey, SolType.ADDRESS, cluster)}
                  icon={getFavicon(resolveUrl(accountKey.pubkey, SolType.ADDRESS, cluster))}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "enter" }}
                />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Address" text={accountKey.pubkey} />
                    <List.Item.Detail.Metadata.TagList title="Details">
                      {accountKey.isSigner && (
                        <List.Item.Detail.Metadata.TagList.Item text="Signer" color={Color.Blue} />
                      )}
                      {accountKey.isWritable && (
                        <List.Item.Detail.Metadata.TagList.Item text="Writable" color={Color.Purple} />
                      )}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Balance Change"
                      text={`${accountKey.balanceChange / LAMPORTS_PER_SOL} SOL`}
                      icon={{
                        source:
                          accountKey.balanceChange === 0
                            ? Icon.CircleFilled
                            : accountKey.balanceChange > 0
                              ? Icon.ArrowUpCircleFilled
                              : Icon.ArrowDownCircleFilled,
                        tintColor:
                          accountKey.balanceChange === 0
                            ? Color.Blue
                            : accountKey.balanceChange > 0
                              ? Color.Green
                              : Color.Red,
                      }}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Pre Balance"
                      text={`${accountKey.preBalance / LAMPORTS_PER_SOL} SOL`}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Post Balance"
                      text={`${accountKey.postBalance / LAMPORTS_PER_SOL} SOL`}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
    </List.Section>
  );
};
