import { Action, ActionPanel, Icon, List, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import type { GetLatestTransactionsV1TxLatestGetQuery, LatestNetworkTransactionItem } from "@sparkscan/api-types";
import { useState } from "react";

import { BASE_HEADERS } from "./lib/constants";
import type { Preferences } from "./lib/preferences";
import { addRaycastUTM } from "./lib/url";
import { capitalize, formatTimestamp, getTypeLabel, truncateKey } from "./lib/utils";

type Result = GetLatestTransactionsV1TxLatestGetQuery["Response"] | GetLatestTransactionsV1TxLatestGetQuery["Errors"];

function getSenderAndRecipientAddresses(tx: LatestNetworkTransactionItem): string[] {
  const keywords = [];

  if (tx.from?.pubkey || tx.from?.identifier) {
    keywords.push(tx.from?.pubkey || tx.from?.identifier);
  }

  if (tx.to?.pubkey || tx.to?.identifier) {
    keywords.push(tx.to?.pubkey || tx.to?.identifier);
  }

  return keywords;
}

function getTokenSenderAndRecipientKeywords(tx: LatestNetworkTransactionItem): string[] {
  if (tx.type === "token_multi_transfer" && tx.multiIoDetails) {
    const { inputs = [], outputs = [] } = tx.multiIoDetails as {
      inputs: Array<{ address?: string }>;
      outputs: Array<{ address?: string }>;
    };

    const uniqueSenders = Array.from(new Set(inputs.map((i) => i.address).filter(Boolean))).filter(
      (address) => address !== undefined,
    );
    const uniqueRecipients = Array.from(new Set(outputs.map((o) => o.address).filter(Boolean))).filter(
      (address) => address !== undefined,
    );

    return [...uniqueSenders, ...uniqueRecipients];
  }
  return [];
}

// Produce a human-readable label for either the sender (isSender = true)
// or recipient (isSender = false) based on transaction details. Mirrors
// the logic used in the Sparkscan web app but simplified for Raycast.
const getAddressLabel = (tx: LatestNetworkTransactionItem, isSender: boolean): string => {
  // Handle token_multi_transfer separately – potentially many inputs/outputs
  if (tx.type === "token_multi_transfer" && tx.multiIoDetails) {
    const { inputs = [], outputs = [] } = tx.multiIoDetails as {
      inputs: Array<{ address?: string }>;
      outputs: Array<{ address?: string }>;
    };

    // Extract unique sender / recipient addresses
    const uniqueSenders = Array.from(new Set(inputs.map((i) => i.address).filter(Boolean)));
    const uniqueRecipients = Array.from(new Set(outputs.map((o) => o.address).filter(Boolean)));

    // Filter out change outputs (outputs that go back to one of the senders)
    const actualRecipients = uniqueRecipients.filter((addr) => !uniqueSenders.includes(addr));

    if (isSender) {
      if (uniqueSenders.length > 1) return `${uniqueSenders.length} Senders`;
      return uniqueSenders[0] ? truncateKey(uniqueSenders[0]) : "Unknown";
    }

    if (actualRecipients.length > 1) return `${actualRecipients.length} Recipients`;
    if (actualRecipients[0]) return truncateKey(actualRecipients[0]);

    // All outputs went back to sender – self-transfer
    if (actualRecipients.length === 0 && uniqueSenders.length === 1) {
      return `${truncateKey(uniqueSenders[0])} (self)`;
    }

    return "Unknown";
  }

  // Special-case mint / burn semantics similar to web app
  if (isSender && tx.type === "token_mint") return "Issuer";
  if (!isSender && tx.type === "token_burn") return "Burn";

  const party = isSender ? tx.from : tx.to;
  if (!party) return "Unknown";

  switch (party.type) {
    case "spark":
      return party.identifier ? truncateKey(party.identifier) : "Spark";
    case "bitcoin":
      return party.identifier ? truncateKey(party.identifier) : "Bitcoin";
    case "lightning":
      return "Lightning";
    default:
      return party.identifier ? truncateKey(party.identifier) : "Unknown";
  }
};

// Determine the correct mempool base URL based on the current network
const getMempoolBaseUrl = (network: string) => {
  return network.toUpperCase() === "REGTEST" ? "https://mempool.regtest.flashnet.xyz" : "https://mempool.space";
};

// Remove hyphens from Spark transaction IDs so they match Sparkscan routing
const removeHyphens = (id: string) => id.replaceAll("-", "");

// Build the URL that should be opened when the user selects a transaction
const getTransactionUrl = (tx: LatestNetworkTransactionItem, network: string) => {
  // For on-chain Bitcoin transactions we want to open Mempool
  if (tx.type === "bitcoin_deposit" || tx.type === "bitcoin_withdrawal") {
    // Fallback to Sparkscan if, for some reason, there is no Bitcoin txid
    if (!tx.bitcoinTxid) {
      return `https://sparkscan.io/tx/${removeHyphens(tx.id)}`;
    }
    return `${getMempoolBaseUrl(network)}/tx/${tx.bitcoinTxid}`;
  }

  // For every other transaction type we open Sparkscan itself
  return `https://sparkscan.io/tx/${removeHyphens(tx.id)}`;
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const [network, setNetwork] = useState<"MAINNET" | "REGTEST">(preferences.defaultNetwork);
  const [details, setDetails] = useState<boolean>(preferences.defaultDetails);

  const { data, pagination, isLoading } = useFetch(
    (options) =>
      `https://api.sparkscan.io/v1/tx/latest?${new URLSearchParams({
        network: network.toUpperCase(),
        offset: String(options.page * Number(preferences.transactionLimit)),
        limit: preferences.transactionLimit,
      })}`,
    {
      headers: {
        ...BASE_HEADERS,
      },
      mapResult(res: Result) {
        // If the API returns an error shape, surface it immediately
        if ("detail" in res) {
          console.error("Failed to fetch latest transactions", res.detail);
          throw new Error("Failed to fetch latest transactions");
        }
        const data = res as GetLatestTransactionsV1TxLatestGetQuery["Response"];

        // Expose the raw array through the `data` field expected by Raycast's `useFetch`
        return {
          data,
          hasMore: data.length === Number(preferences.transactionLimit),
        };
      },
      keepPreviousData: true,
      initialData: [],
    },
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={details}
      navigationTitle="Latest transactions"
      searchBarPlaceholder="Search by Address / Transaction ID / Token"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Currently selected network"
          value={network}
          onChange={(network) => {
            setNetwork(network as "MAINNET" | "REGTEST");
          }}
        >
          <List.Dropdown.Item title="Mainnet" value={"MAINNET"} />
          <List.Dropdown.Item title="Regtest" value={"REGTEST"} />
        </List.Dropdown>
      }
      pagination={pagination}
    >
      {(data || []).map((item) => {
        return (
          <List.Item
            key={item.id}
            title={getAddressLabel(item, true)}
            accessories={[
              {
                text: getAddressLabel(item, false),
              },
            ]}
            keywords={[...getSenderAndRecipientAddresses(item), item.id, ...getTokenSenderAndRecipientKeywords(item)]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  url={addRaycastUTM(getTransactionUrl(item, network.toUpperCase()), "latest-transactions")}
                />
                <Action.CopyToClipboard
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  content={addRaycastUTM(getTransactionUrl(item, network.toUpperCase()), "latest-transactions")}
                />
                <Action
                  title={details ? "Hide Details" : "Show Details"}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  icon={Icon.Info}
                  onAction={() => setDetails(!details)}
                />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Type"
                      text={getTypeLabel(item.type)}
                      icon={Icon.ArrowRight}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Status"
                      text={capitalize(item.status)}
                      icon={Icon.Checkmark}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Timestamp"
                      text={formatTimestamp(item.createdAt || undefined)}
                      icon={Icon.Clock}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Value"
                      text={`$${item.valueUsd.toLocaleString()}`}
                      icon={Icon.Coins}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        );
      })}
    </List>
  );
}
