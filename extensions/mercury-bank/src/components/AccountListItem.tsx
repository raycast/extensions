import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type { MercuryAccount } from "../lib/types";
import {
  formatCurrency,
  getAccountStatusColor,
  maskAccountNumber,
} from "../lib/utils";
import { ACCOUNT_KIND_LABELS } from "../lib/constants";
import { AccountSwitcherActions } from "./AccountSwitcher";
import { AccountTransactions } from "./AccountTransactions";

interface AccountListItemProps {
  account: MercuryAccount;
  apiKey: string;
  accountName: string;
  showDetail?: boolean;
  toggleDetail?: () => void;
}

function AccountDetail({ account }: { account: MercuryAccount }) {
  const statusColor = getAccountStatusColor(account.status);
  const kindLabel = ACCOUNT_KIND_LABELS[account.kind] ?? account.kind;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Balance"
            text={{
              value: formatCurrency(account.availableBalance ?? 0),
              color:
                (account.availableBalance ?? 0) >= 0 ? Color.Green : Color.Red,
            }}
          />
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={account.status || "Unknown"}
              color={statusColor}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label title="Type" text={kindLabel} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Account Number"
            text={maskAccountNumber(account.accountNumber || "")}
          />
          <List.Item.Detail.Metadata.Label
            title="Routing Number"
            text={account.routingNumber || "—"}
          />
          {account.legalBusinessName && (
            <List.Item.Detail.Metadata.Label
              title="Legal Name"
              text={account.legalBusinessName}
            />
          )}
          {account.dashboardLink && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Link
                title="Dashboard"
                target={account.dashboardLink}
                text="Open in Mercury"
              />
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function AccountListItem({
  account,
  apiKey,
  accountName,
  showDetail = false,
  toggleDetail,
}: AccountListItemProps) {
  const statusColor = getAccountStatusColor(account.status);
  const kindLabel = ACCOUNT_KIND_LABELS[account.kind] ?? account.kind;

  const accessories: List.Item.Accessory[] = showDetail
    ? [
        {
          text: {
            value: formatCurrency(account.availableBalance ?? 0),
            color:
              (account.availableBalance ?? 0) >= 0 ? Color.Green : Color.Red,
          },
        },
      ]
    : [
        {
          tag: {
            value: account.status || "Unknown",
            color: statusColor,
          },
        },
        {
          text: {
            value: formatCurrency(account.availableBalance ?? 0),
            color:
              (account.availableBalance ?? 0) >= 0 ? Color.Green : Color.Red,
          },
        },
      ];

  return (
    <List.Item
      title={
        account.nickname ||
        account.name ||
        `Account ${maskAccountNumber(account.accountNumber || "")}`
      }
      subtitle={`${kindLabel} ${maskAccountNumber(account.accountNumber || "")}`}
      icon={{ source: Icon.BankNote, tintColor: Color.Green }}
      accessories={accessories}
      detail={showDetail ? <AccountDetail account={account} /> : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="View Transactions"
              icon={Icon.List}
              target={
                <AccountTransactions
                  apiKey={apiKey}
                  account={account}
                  accountName={accountName}
                />
              }
            />
            {account.dashboardLink && (
              <Action.OpenInBrowser
                title="Open in Mercury"
                url={account.dashboardLink}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            )}
            <Action.CopyToClipboard
              title="Copy Account Number"
              content={account.accountNumber || ""}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Routing Number"
              content={account.routingNumber || ""}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Balance"
              content={formatCurrency(account.availableBalance ?? 0)}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
            {toggleDetail && (
              <Action
                title={showDetail ? "Hide Details" : "Show Details"}
                icon={Icon.Sidebar}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                onAction={toggleDetail}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <AccountSwitcherActions />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}