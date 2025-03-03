import { useState } from "react";
import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";
import fetch from "node-fetch";
import React from "react";

interface AccountData {
  account: {
    account_name: string;
    core_liquid_balance?: string;
    ram_usage: number;
    ram_quota: number;
    cpu_limit: {
      used: number;
      max: number;
    };
    net_limit: {
      used: number;
      max: number;
    };
    created: string;
  };
}

interface TokenBalance {
  symbol: string;
  name: string;
  label: string;
  assetType: string;
  contractName: string;
  enabled: boolean;
  precision: number;
  balanceUnit: string;
  totalBalance: number;
  availableBalance: number;
  order: number;
  apy: number;
  usdPrice: number;
  icon: string;
}

interface ChainlinkPrice {
  pair: string;
  source: string;
  price: string;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [selectedView, setSelectedView] = useState<"generalInfo" | "balances">("generalInfo");
  const [hasSearched, setHasSearched] = useState(false);

  async function fetchPriceFeeds() {
    try {
      const response = await fetch("https://lb.libre.org/v1/chain/get_table_rows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          json: true,
          code: "chainlink",
          scope: "chainlink",
          table: "feed",
          limit: "100",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Chainlink data:", JSON.stringify(data));

      if (data.rows && Array.isArray(data.rows)) {
        return data.rows;
      }
      return [];
    } catch (error) {
      console.error("Error fetching price feeds:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error Fetching Price Feeds",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
      return [];
    }
  }

  function getUsdPrice(symbol: string, feeds: ChainlinkPrice[]): number {
    if (feeds.length === 0) return 0;

    let pairName = "";
    switch (symbol.toUpperCase()) {
      case "BTC":
        pairName = "btcusd";
        break;
      case "LIBRE":
        pairName = "libreusd";
        break;
      case "USDT":
        return 1.0;
      default:
        return 0;
    }

    const feed = feeds.find((feed) => feed.pair === pairName);
    if (!feed) return 0;

    return parseFloat(feed.price);
  }

  async function fetchAccountBalances(accountName: string, feeds: ChainlinkPrice[]) {
    try {
      const response = await fetch(`https://server.production.bitcoinlibre.io/supported-tokens-v3/${accountName}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (Array.isArray(data)) {
        const updatedBalances = data.map((token) => {
          const realUsdPrice = getUsdPrice(token.symbol, feeds);
          //check
          return {
            ...token,
            usdPrice: realUsdPrice > 0 ? realUsdPrice : token.usdPrice,
          };
        });

        console.log("Updated balances:", JSON.stringify(updatedBalances));
        setBalances(updatedBalances);
      } else {
        setBalances([]);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error Parsing Balances",
          message: "Could not parse token balances data",
        });
      }
    } catch (error) {
      console.error("Error fetching token balances:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error Fetching Balances",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
      setBalances([]);
    }
  }

  async function performSearch() {
    if (searchText.length === 0) return;

    setIsLoading(true);
    try {
      const feeds = await fetchPriceFeeds();

      const response = await fetch(`https://lb.libre.org/v2/state/get_account?account=${searchText}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAccountData(data);
      setHasSearched(true);

      await fetchAccountBalances(searchText, feeds);

      await showToast({
        style: Toast.Style.Success,
        title: "Account Found",
        message: "Account details have been loaded",
      });
    } catch (error) {
      setAccountData(null);
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

  function renderGeneralInfoMetadata() {
    if (!accountData) return null;

    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Account Information" />
        <List.Item.Detail.Metadata.Label
          title="Account Name"
          text={accountData.account.account_name}
          icon={Icon.Person}
        />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Balance" />
        <List.Item.Detail.Metadata.Label
          title="Core Liquid Balance"
          text={accountData.account.core_liquid_balance || "0 LIBRE"}
          icon={Icon.BankNote}
        />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Resource Usage" />
        <List.Item.Detail.Metadata.Label
          title="RAM"
          text={`${accountData.account.ram_usage}/${accountData.account.ram_quota} bytes`}
          icon={{ source: "cpu" }}
        />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label
          title="CPU"
          text={`${accountData.account.cpu_limit.used}/${accountData.account.cpu_limit.max} µs`}
          icon={{ source: "cpu" }}
        />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label
          title="NET"
          text={`${accountData.account.net_limit.used}/${accountData.account.net_limit.max} bytes`}
          icon={Icon.Globe}
        />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Created" text={accountData.account.created} icon={Icon.Calendar} />
        <List.Item.Detail.Metadata.Separator />
      </List.Item.Detail.Metadata>
    );
  }

  function formatUsdValue(amount: number, price: number): string {
    const value = amount * price;

    if (value >= 1000) {
      return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    if (value < 0.01 && value > 0) {
      return `$${value.toFixed(6)}`;
    }

    return `$${value.toFixed(2)}`;
  }

  function renderBalancesMetadata() {
    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Token Balances" />

        {balances.length === 0 ? (
          <List.Item.Detail.Metadata.Label title="No Tokens" text="No token balances found" icon={Icon.XmarkCircle} />
        ) : (
          balances.map((token, index) => {
            const tokenKey = `token-${token.symbol}-${index}`;

            return (
              <React.Fragment key={tokenKey}>
                <List.Item.Detail.Metadata.Label
                  title={token.name}
                  text={`${token.totalBalance} ${token.balanceUnit}`}
                  icon={{ source: token.icon }}
                />
                <List.Item.Detail.Metadata.Label
                  title="USD Value"
                  text={formatUsdValue(token.totalBalance, token.usdPrice)}
                  icon={Icon.BankNote}
                />
                <List.Item.Detail.Metadata.Label
                  title="USD Price"
                  text={
                    token.symbol === "BTC"
                      ? `$${parseFloat(token.usdPrice.toString()).toLocaleString("en-US")}`
                      : `$${parseFloat(token.usdPrice.toString()).toFixed(token.symbol === "USDT" ? 2 : 6)}`
                  }
                  icon={{ source: "tag" }}
                />
                {token.apy > 0 && (
                  <List.Item.Detail.Metadata.Label title="APY" text={`${token.apy}%`} icon={{ source: "percent" }} />
                )}
                <List.Item.Detail.Metadata.Label title="Contract" text={token.contractName} icon={Icon.Document} />
                {index < balances.length - 1 && <List.Item.Detail.Metadata.Separator />}
              </React.Fragment>
            );
          })
        )}
      </List.Item.Detail.Metadata>
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter Libre account name"
      searchBarAccessory={
        <ActionPanel>
          <Action title="Search" icon={Icon.MagnifyingGlass} onAction={performSearch} />
        </ActionPanel>
      }
      navigationTitle="Libre Account Explorer"
      isShowingDetail={hasSearched}
    >
      {!hasSearched ? (
        <List.EmptyView
          title="Enter account name"
          description="Type an account name and click Search to find details"
          icon={Icon.MagnifyingGlass}
        />
      ) : (
        <>
          <List.Item
            id="general-info"
            title={`General Info ${selectedView === "generalInfo" ? "✓" : ""}`}
            icon={Icon.Info}
            detail={<List.Item.Detail metadata={renderGeneralInfoMetadata()} />}
            actions={
              <ActionPanel>
                <Action title="View General Info" onAction={() => setSelectedView("generalInfo")} />
              </ActionPanel>
            }
          />
          <List.Item
            id="balances"
            title={`Balances ${selectedView === "balances" ? "✓" : ""}`}
            icon={Icon.Coins}
            detail={<List.Item.Detail metadata={renderBalancesMetadata()} />}
            actions={
              <ActionPanel>
                <Action title="View Balances" onAction={() => setSelectedView("balances")} />
              </ActionPanel>
            }
          />
        </>
      )}
    </List>
  );
}
