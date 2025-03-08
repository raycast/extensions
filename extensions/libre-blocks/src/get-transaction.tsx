import { useState } from "react";
import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import React from "react";

interface Transaction {
  trx_id: string;
  executed: boolean;
  lib: number;
  actions: TransactionAction[];
}

interface TransactionAction {
  action_ordinal: number;
  creator_action_ordinal: number;
  act: {
    account: string;
    name: string;
    authorization: {
      actor: string;
      permission: string;
    }[];
    data: Record<string, unknown>;
  };
  account_ram_deltas?: {
    account: string;
    delta: string;
  }[];
  block_num: number;
  block_id: string;
  producer: string;
  trx_id: string;
  global_sequence: number;
  cpu_usage_us: number;
  net_usage_words?: number;
  signatures?: string[];
  inline_count?: number;
  inline_filtered?: boolean;
  receipts: {
    receiver: string;
    global_sequence: string;
    recv_sequence: string;
    auth_sequence: {
      account: string;
      sequence: string;
    }[];
  }[];
  timestamp: string;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [selectedAction, setSelectedAction] = useState<TransactionAction | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  async function performSearch() {
    if (searchText.length === 0) return;

    setIsLoading(true);
    try {
      const response = await fetch(`https://lb.libre.org/v2/history/get_transaction?id=${searchText}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (data.executed === undefined && data.actions === undefined) {
        throw new Error("Transaction not found or not executed yet");
      }

      setTransaction(data);
      setHasSearched(true);

      if (data.actions && data.actions.length > 0) {
        setSelectedAction(data.actions[0]);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Transaction Found",
        message: "Transaction details have been loaded",
      });
    } catch (error) {
      setTransaction(null);
      setHasSearched(false);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function getActionIcon(actionName: string) {
    switch (actionName) {
      case "transfer":
        return { source: "arrow.right" };
      case "issue":
        return { source: "plus" };
      case "open":
        return { source: "folder" };
      case "close":
        return { source: "xmark.circle" };
      case "retire":
        return { source: "trash" };
      case "create":
        return { source: "new.document" };
      case "updateauth":
        return { source: "lock" };
      case "linkauth":
        return { source: "link" };
      case "unlinkauth":
        return { source: "unlink" };
      case "deleteauth":
        return { source: "trash" };
      case "newaccount":
        return { source: "person" };
      case "setcode":
        return { source: "code" };
      case "setabi":
        return { source: "code" };
      case "updatecode":
        return { source: "code" };
      case "updateabi":
        return { source: "code" };
      case "voteproducer":
        return { source: "star" };
      case "delegatebw":
        return { source: "arrow.right" };
      case "undelegatebw":
        return { source: "arrow.left" };
      case "buyram":
        return { source: "download" };
      case "sellram":
        return { source: "upload" };
      case "buyrambytes":
        return { source: "download" };
      case "onblock":
        return { source: "checkmark" };
      default:
        return { source: "document" };
    }
  }

  function renderActionMetadata(action: TransactionAction) {
    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Transaction Information" />
        <List.Item.Detail.Metadata.Label title="Transaction ID" text={action.trx_id} icon={{ source: "document" }} />
        <List.Item.Detail.Metadata.Label title="Block" text={`${action.block_num}`} icon={{ source: "box" }} />
        <List.Item.Detail.Metadata.Label title="Block ID" text={action.block_id} icon={{ source: "box" }} />
        <List.Item.Detail.Metadata.Label
          title="Timestamp"
          text={new Date(action.timestamp).toLocaleString()}
          icon={{ source: "calendar" }}
        />
        <List.Item.Detail.Metadata.Label title="Producer" text={action.producer} icon={{ source: "desktop" }} />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Action Details" />
        <List.Item.Detail.Metadata.Label title="Contract" text={action.act.account} icon={{ source: "code" }} />
        <List.Item.Detail.Metadata.Label title="Action" text={action.act.name} icon={getActionIcon(action.act.name)} />
        <List.Item.Detail.Metadata.Label
          title="CPU Usage"
          text={`${action.cpu_usage_us} µs`}
          icon={{ source: "cpu" }}
        />
        {action.net_usage_words !== undefined && (
          <List.Item.Detail.Metadata.Label
            title="NET Usage"
            text={`${action.net_usage_words} words`}
            icon={{ source: "globe" }}
          />
        )}
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Authorization" />
        {action.act.authorization.map((auth, index) => (
          <React.Fragment key={`auth-${index}`}>
            <List.Item.Detail.Metadata.Label
              title={`Actor ${index + 1}`}
              text={auth.actor}
              icon={{ source: "person" }}
            />
            <List.Item.Detail.Metadata.Label
              title={`Permission ${index + 1}`}
              text={auth.permission}
              icon={{ source: "lock" }}
            />
          </React.Fragment>
        ))}
        <List.Item.Detail.Metadata.Separator />

        {action.account_ram_deltas && action.account_ram_deltas.length > 0 && (
          <>
            <List.Item.Detail.Metadata.Label title="RAM Changes" />
            {action.account_ram_deltas.map((delta, index) => (
              <React.Fragment key={`ram-${index}`}>
                <List.Item.Detail.Metadata.Label
                  title={`Account ${index + 1}`}
                  text={delta.account}
                  icon={{ source: "person" }}
                />
                <List.Item.Detail.Metadata.Label
                  title={`Delta ${index + 1}`}
                  text={delta.delta}
                  icon={{ source: "hard.drive" }}
                />
              </React.Fragment>
            ))}
            <List.Item.Detail.Metadata.Separator />
          </>
        )}

        <List.Item.Detail.Metadata.Label title="Action Data" />
        {Object.entries(action.act.data).map(([key, value], index) => {
          let icon = { source: "document" };
          let displayValue = String(value);

          if (key === "from" || key === "to" || key === "sender" || key === "receiver") {
            icon = { source: "person" };
          } else if (key === "amount" || key === "quantity") {
            icon = { source: "bank.note" };
          } else if (key === "memo") {
            icon = { source: "message" };
          } else if (key === "symbol") {
            icon = { source: "coins" };
          } else if (key === "precision") {
            icon = { source: "number" };
          } else if (key === "timestamp") {
            icon = { source: "calendar" };
            displayValue = new Date(String(value)).toLocaleString();
          }

          return (
            <List.Item.Detail.Metadata.Label
              key={`data-${index}`}
              title={key.charAt(0).toUpperCase() + key.slice(1)}
              text={displayValue}
              icon={icon}
            />
          );
        })}
      </List.Item.Detail.Metadata>
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter transaction ID"
      searchBarAccessory={
        <ActionPanel>
          <Action title="Search" icon={{ source: "magnifyingglass" }} onAction={performSearch} />
        </ActionPanel>
      }
      navigationTitle="Libre Transaction Explorer"
      isShowingDetail={hasSearched}
    >
      {!hasSearched ? (
        <List.EmptyView
          title="Enter transaction ID"
          description="Type a transaction ID and click Search to find details"
          icon={{ source: "magnifyingglass" }}
        />
      ) : transaction && transaction.actions && transaction.actions.length > 0 ? (
        transaction.actions.map((action, index) => (
          <List.Item
            key={`action-${index}`}
            id={`action-${index}`}
            title={`${action.act.name.charAt(0).toUpperCase() + action.act.name.slice(1)} (${action.act.account})${selectedAction?.action_ordinal === action.action_ordinal ? " ✓" : ""}`}
            subtitle={`Action ${index + 1} of ${transaction.actions.length}`}
            icon={getActionIcon(action.act.name)}
            detail={<List.Item.Detail metadata={renderActionMetadata(action)} />}
            actions={
              <ActionPanel>
                <Action title={`View Action ${index + 1}`} onAction={() => setSelectedAction(action)} />
                <Action.OpenInBrowser
                  title="View on Libreblocks.io"
                  url={`https://www.libreblocks.io/tx/${action.trx_id}`}
                />
                <Action.CopyToClipboard title="Copy Transaction Id" content={action.trx_id} />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView
          title="No actions found"
          description="This transaction has no actions or could not be found"
          icon={{ source: "xmark.circle" }}
        />
      )}
    </List>
  );
}
