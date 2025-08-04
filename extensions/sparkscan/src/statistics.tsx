import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import type { GetNetworkStatsV1StatsSummaryGetQuery } from "@sparkscan/api-types";
import { useState } from "react";

import { BASE_HEADERS } from "./lib/constants";
import type { Preferences } from "./lib/preferences";
import { addRaycastUTM } from "./lib/url";

type Result = GetNetworkStatsV1StatsSummaryGetQuery["Response"] | GetNetworkStatsV1StatsSummaryGetQuery["Errors"];

const actions = (network: "MAINNET" | "REGTEST") => {
  return (
    <ActionPanel>
      <Action.OpenInBrowser
        url={addRaycastUTM(`https://www.sparkscan.io/stats?network=${network.toLowerCase()}`, "statistics")}
      />
    </ActionPanel>
  );
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const [network, setNetwork] = useState<"MAINNET" | "REGTEST">(preferences.defaultNetwork);

  const { data, isLoading } = useFetch(
    `https://api.sparkscan.io/v1/stats/summary?${new URLSearchParams({ network: network.toUpperCase() })}`,
    {
      headers: {
        ...BASE_HEADERS,
      },
      mapResult(res: Result) {
        if ("detail" in res) {
          console.error("Failed to fetch statistics", res.detail);
          throw new Error("Failed to fetch statistics");
        }
        const data = res as GetNetworkStatsV1StatsSummaryGetQuery["Response"];

        return {
          data,
        };
      },
    },
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Spark network statistics"
      searchBarPlaceholder="Search by statistic name"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Selected network"
          value={network}
          onChange={(network) => {
            setNetwork(network as "MAINNET" | "REGTEST");
          }}
        >
          <List.Dropdown.Item title="Mainnet" value={"MAINNET"} />
          <List.Dropdown.Item title="Regtest" value={"REGTEST"} />
        </List.Dropdown>
      }
    >
      {data && (
        <>
          <List.Item
            title="Total Value Locked (USD)"
            accessories={[
              {
                text: `$${data.totalValueLockedUsd.toLocaleString()}`,
                icon: Icon.Coins,
              },
            ]}
            actions={actions(network)}
          />
          <List.Item
            title="Active Accounts"
            accessories={[{ text: data.activeAccounts.toLocaleString(), icon: Icon.Person }]}
            actions={actions(network)}
          />
          <List.Item
            title="Transactions (24h)"
            accessories={[
              {
                text: data.transactions24h.toLocaleString(),
                icon: Icon.ArrowsExpand,
              },
            ]}
            actions={actions(network)}
          />
          <List.Item
            title="Current BTC Price (USD)"
            accessories={[
              {
                text: `$${data.currentBtcPriceUsd.toLocaleString()}`,
                icon: Icon.Coins,
              },
            ]}
            actions={actions(network)}
          />
        </>
      )}
    </List>
  );
}
