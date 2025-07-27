import { useState } from "react";
import { getPreferenceValues, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface Preferences {
  defaultNetwork: "MAINNET" | "REGTEST";
}

type Result =
  | {
      totalValueLockedSats: number;
      totalValueLockedUsd: number;
      activeAccounts: number;
      transactions24h: number;
      currentBtcPriceUsd: number;
    }
  | {
      detail: unknown[];
    };

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const [network, setNetwork] = useState<"MAINNET" | "REGTEST">(preferences.defaultNetwork);

  const { data, isLoading } = useFetch(
    `https://api.sparkscan.io/v1/stats/summary?${new URLSearchParams({ network: network.toUpperCase() })}`,
    {
      headers: {
        "User-Agent": "sparkscan-raycast-extension",
      },
      mapResult(res: Result) {
        if ("detail" in res) throw new Error("Failed to fetch statistics");

        return {
          data: res,
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
    >
      {data && (
        <>
          <List.Item
            title="Total Value Locked (USD)"
            accessories={[{ text: `$${data.totalValueLockedUsd.toLocaleString()}`, icon: Icon.Coins }]}
          />
          <List.Item
            title="Active Accounts"
            accessories={[{ text: data.activeAccounts.toLocaleString(), icon: Icon.Person }]}
          />
          <List.Item
            title="Transactions (24h)"
            accessories={[{ text: data.transactions24h.toLocaleString(), icon: Icon.ArrowsExpand }]}
          />
          <List.Item
            title="Current BTC Price (USD)"
            accessories={[{ text: `$${data.currentBtcPriceUsd.toLocaleString()}`, icon: Icon.Coins }]}
          />
        </>
      )}
    </List>
  );
}
