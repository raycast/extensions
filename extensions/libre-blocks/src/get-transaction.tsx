import { useState } from "react";
import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";
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
    data: any;
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
        return Icon.ArrowRight;
      case "issue":
        return Icon.Plus;
      case "open":
        return Icon.Folder;
      case "close":
        return Icon.XmarkCircle;
      case "retire":
        return Icon.Trash;
      case "create":
        return Icon.NewDocument;
      case "updateauth":
        return Icon.Lock;
      case "linkauth":
        return Icon.Link;
      case "unlinkauth":
        return Icon.Unlink;
      case "deleteauth":
        return Icon.Trash;
      case "newaccount":
        return Icon.Person;
      case "setcode":
        return Icon.Code;
      case "setabi":
        return Icon.Code;
      case "updatecode":
        return Icon.Code;
      case "updateabi":
        return Icon.Code;
      case "voteproducer":
        return Icon.Star;
      case "delegatebw":
        return Icon.ArrowRight;
      case "undelegatebw":
        return Icon.ArrowLeft;
      case "buyram":
        return Icon.Download;
      case "sellram":
        return Icon.Upload;
      case "buyrambytes":
        return Icon.Download;
      case "onblock":
        return Icon.Checkmark;
      default:
        return Icon.Document;
    }
  }

  function renderActionMetadata(action: TransactionAction) {
    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Transaction Information" />
        <List.Item.Detail.Metadata.Label 
          title="Transaction ID" 
          text={action.trx_id} 
          icon={Icon.Document}
        />
        <List.Item.Detail.Metadata.Label 
          title="Block" 
          text={`${action.block_num}`} 
          icon={Icon.Box}
        />
        <List.Item.Detail.Metadata.Label 
          title="Block ID" 
          text={action.block_id} 
          icon={Icon.Box}
        />
        <List.Item.Detail.Metadata.Label 
          title="Timestamp" 
          text={new Date(action.timestamp).toLocaleString()} 
          icon={Icon.Calendar}
        />
        <List.Item.Detail.Metadata.Label 
          title="Producer" 
          text={action.producer} 
          icon={Icon.Computer}
        />
        <List.Item.Detail.Metadata.Separator />
        
        <List.Item.Detail.Metadata.Label title="Action Details" />
        <List.Item.Detail.Metadata.Label 
          title="Contract" 
          text={action.act.account} 
          icon={Icon.Code}
        />
        <List.Item.Detail.Metadata.Label 
          title="Action" 
          text={action.act.name} 
          icon={getActionIcon(action.act.name)}
        />
        <List.Item.Detail.Metadata.Label 
          title="CPU Usage" 
          text={`${action.cpu_usage_us} µs`} 
          icon={Icon.Cpu}
        />
        {action.net_usage_words !== undefined && (
          <List.Item.Detail.Metadata.Label 
            title="NET Usage" 
            text={`${action.net_usage_words} words`} 
            icon={Icon.Globe}
          />
        )}
        <List.Item.Detail.Metadata.Separator />
        
        <List.Item.Detail.Metadata.Label title="Authorization" />
        {action.act.authorization.map((auth, index) => (
          <React.Fragment key={`auth-${index}`}>
            <List.Item.Detail.Metadata.Label 
              title={`Actor ${index + 1}`} 
              text={auth.actor} 
              icon={Icon.Person}
            />
            <List.Item.Detail.Metadata.Label 
              title={`Permission ${index + 1}`} 
              text={auth.permission} 
              icon={Icon.Lock}
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
                  icon={Icon.Person}
                />
                <List.Item.Detail.Metadata.Label 
                  title={`Delta ${index + 1}`} 
                  text={delta.delta} 
                  icon={Icon.HardDrive}
                />
              </React.Fragment>
            ))}
            <List.Item.Detail.Metadata.Separator />
          </>
        )}
        
        <List.Item.Detail.Metadata.Label title="Action Data" />
        {Object.entries(action.act.data).map(([key, value], index) => {
          
          let icon = Icon.Document;
          let displayValue = String(value);
          
          if (key === "from" || key === "to" || key === "sender" || key === "receiver") {
            icon = Icon.Person;
          } else if (key === "amount" || key === "quantity") {
            icon = Icon.BankNote;
          } else if (key === "memo") {
            icon = Icon.Message;
          } else if (key === "symbol") {
            icon = Icon.Coins;
          } else if (key === "precision") {
            icon = Icon.Number;
          } else if (key === "timestamp") {
            icon = Icon.Calendar;
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
          <Action
            title="Search"
            icon={Icon.MagnifyingGlass}
            onAction={performSearch}
          />
        </ActionPanel>
      }
      navigationTitle="Libre Transaction Explorer"
      isShowingDetail={hasSearched}
    >
      {!hasSearched ? (
        <List.EmptyView
          title="Enter transaction ID"
          description="Type a transaction ID and click Search to find details"
          icon={Icon.MagnifyingGlass}
        />
      ) : transaction && transaction.actions && transaction.actions.length > 0 ? (
        transaction.actions.map((action, index) => (
          <List.Item
            key={`action-${index}`}
            id={`action-${index}`}
            title={`${action.act.name} (${action.act.account})`}
            subtitle={`Action ${index + 1} of ${transaction.actions.length}`}
            icon={getActionIcon(action.act.name)}
            detail={
              <List.Item.Detail
                metadata={renderActionMetadata(action)}
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title={`View Action ${index + 1}`}
                  onAction={() => setSelectedAction(action)}
                />
                <Action.OpenInBrowser
                  title="View on LibreBlocks.io"
                  url={`https://www.libreblocks.io/tx/${action.trx_id}`}
                />
                <Action.CopyToClipboard
                  title="Copy Transaction ID"
                  content={action.trx_id}
                />
              </ActionPanel>
            }
            selected={selectedAction?.action_ordinal === action.action_ordinal}
          />
        ))
      ) : (
        <List.EmptyView
          title="No actions found"
          description="This transaction has no actions or could not be found"
          icon={Icon.XmarkCircle}
        />
      )}
    </List>
  );
}
