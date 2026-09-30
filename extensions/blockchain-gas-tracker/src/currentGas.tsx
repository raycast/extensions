import { ActionPanel, List, Action, Icon, Color, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

interface gasResp {
  status: string;
  message: string;
  result: {
    LastBlock: string;
    SafeGasPrice: string;
    ProposeGasPrice: string;
    FastGasPrice: string;
    suggestBaseFee: string;
    gasUsedRatio: string;
    UsdPrice: string;
  };
}

interface priceResp {
  status: string;
  message: string;
  result: {
    [key: string]: string;
  };
}

interface preference {
  ethscanKey: string;
  polygonscanKey: string;
  bscscanKey: string;
}

export default function Command() {
  const preference = getPreferenceValues<preference>();
  const [token, setToken] = useState<string>("eth");
  const [explorerUrl, setExplorerUrl] = useState<string>("https://etherscan.io/");
  const [apiUrl, setApiUrl] = useState<string>("https://api.etherscan.io/");
  const [apiKey, setApiKey] = useState<string>("NotARealApiToken");
  const [gasLimit, setGasLimit] = useState<number>(21000);
  const [roundFloat, setRoundFloat] = useState<number>();
  const { data: gasData, revalidate: gasRevalidate } = useFetch<gasResp>(
    `${apiUrl}api?module=gastracker&action=gasoracle&apikey=${apiKey}`,
    {
      keepPreviousData: true,
      onData: (data) => {
        if (data.status !== "1") {
          gasRevalidate();
        }
      },
    }
  );
  const { data: priceData, revalidate: priceRevalidate } = useFetch<priceResp>(
    `${apiUrl}api?module=stats&action=${token}price&apikey=${apiKey}`,
    {
      keepPreviousData: true,
      onData: (data) => {
        if (data.status !== "1") {
          priceRevalidate();
        }
      },
    }
  );
  let LastBlock: string | undefined;
  let lowPrice: string | undefined;
  let avgPrice: string | undefined;
  let fastPrice: string | undefined;
  let tokenPrice: string | undefined;
  if (token === "eth" || token === "matic") {
    LastBlock = gasData?.result?.LastBlock;
    lowPrice = gasData?.result?.SafeGasPrice;
    avgPrice = gasData?.result?.ProposeGasPrice;
    fastPrice = gasData?.result?.FastGasPrice;
    tokenPrice = priceData?.result[token + "usd"];
  } else if (token === "bnb") {
    LastBlock = gasData?.result?.LastBlock;
    lowPrice = gasData?.result?.SafeGasPrice;
    avgPrice = gasData?.result?.ProposeGasPrice;
    fastPrice = gasData?.result?.FastGasPrice;
    tokenPrice = gasData?.result?.UsdPrice;
  }

  function refresh() {
    LastBlock = undefined;
    tokenPrice = undefined;
    gasRevalidate();
    priceRevalidate();
  }

  function dropdownMenu() {
    return (
      <List.Dropdown
        tooltip="Select Network"
        defaultValue="eth"
        storeValue={true}
        onChange={(value) => {
          if (value === "eth") {
            setApiUrl("https://api.etherscan.io/");
            setExplorerUrl("https://etherscan.io/");
            setToken(value);
            setApiKey(preference.ethscanKey);
            setRoundFloat(2);
          } else if (value === "matic") {
            setApiUrl("https://api.polygonscan.com/");
            setExplorerUrl("https://polygonscan.com/");
            setToken(value);
            setApiKey(preference.polygonscanKey);
            setRoundFloat(5);
          } else if (value === "bnb") {
            setApiUrl("https://api.bscscan.com/");
            setExplorerUrl("https://bscscan.com/");
            setToken(value);
            setApiKey(preference.bscscanKey);
            setRoundFloat(5);
          }
        }}
      >
        <List.Dropdown.Item title="Ethereum" value="eth" />
        <List.Dropdown.Item title="Polygon" value="matic" />
        <List.Dropdown.Item title="Binance Smart Chain" value="bnb" />
      </List.Dropdown>
    );
  }

  function returnList(isLoading: boolean) {
    if (!isLoading) {
      return (
        <List
          navigationTitle="Show Current Gas"
          isLoading={isLoading}
          onSearchTextChange={(text) => {
            setGasLimit(Number(text));
          }}
          searchBarPlaceholder="Enter Gas Limit"
          searchBarAccessory={dropdownMenu()}
        >
          <List.Item
            icon={{
              source: Icon.Coins,
              tintColor: Color.Orange,
            }}
            title="Current Price (USD)"
            accessories={[{ text: `$${tokenPrice}` }]}
            actions={
              <ActionPanel>
                <Action title="Refresh" onAction={() => refresh()} />
              </ActionPanel>
            }
          />
          <List.Item
            icon={{
              source: Icon.CircleFilled,
              tintColor: Color.Green,
            }}
            title="Slow"
            subtitle={lowPrice + " Gwei"}
            actions={
              <ActionPanel>
                <Action title="Refresh" onAction={() => refresh()} />
              </ActionPanel>
            }
            accessories={[
              { text: `$${((Number(tokenPrice) / 1000000000) * Number(lowPrice) * gasLimit).toFixed(roundFloat)}` },
            ]}
          />
          <List.Item
            icon={{
              source: Icon.CircleFilled,
              tintColor: Color.Yellow,
            }}
            title="Average"
            subtitle={avgPrice + " Gwei"}
            actions={
              <ActionPanel>
                <Action title="Refresh" onAction={() => refresh()} />
              </ActionPanel>
            }
            accessories={[
              { text: `$${((Number(tokenPrice) / 1000000000) * Number(avgPrice) * gasLimit).toFixed(roundFloat)}` },
            ]}
          />
          <List.Item
            icon={{
              source: Icon.CircleFilled,
              tintColor: Color.Red,
            }}
            title="Fast"
            subtitle={fastPrice + " Gwei"}
            actions={
              <ActionPanel>
                <Action title="Refresh" onAction={() => refresh()} />
              </ActionPanel>
            }
            accessories={[
              { text: `$${((Number(tokenPrice) / 1000000000) * Number(fastPrice) * gasLimit).toFixed(roundFloat)}` },
            ]}
          />
          <List.Item
            icon={{
              source: Icon.EditShape,
              tintColor: Color.Blue,
            }}
            title="Last Block"
            subtitle={LastBlock}
            actions={
              <ActionPanel>
                <Action title="Refresh" onAction={() => refresh()} />
              </ActionPanel>
            }
          />
          <List.Item
            icon={{
              source: Icon.ArrowRightCircleFilled,
              tintColor: Color.Blue,
            }}
            title="Go to Gas Tracker"
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={explorerUrl + "/gastracker"} />
              </ActionPanel>
            }
          />
        </List>
      );
    } else {
      return (
        <List navigationTitle="Show Current Gas" isLoading={isLoading} searchBarAccessory={dropdownMenu()}>
          <List.Item
            icon={{
              source: Icon.Info,
              tintColor: Color.Blue,
            }}
            title="Loading..."
            actions={
              <ActionPanel>
                <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
          <List.Item
            icon={{
              source: Icon.Info,
              tintColor: Color.Blue,
            }}
            title="Tips: Add api keys in extension preferences to avoid waiting"
            actions={
              <ActionPanel>
                <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        </List>
      );
    }
  }

  return returnList(LastBlock === undefined || tokenPrice === undefined);
}
