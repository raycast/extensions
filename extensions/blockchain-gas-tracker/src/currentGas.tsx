import { ActionPanel, Detail, List, Action, Icon, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

type gasResp = {
  status: string;
  message: string;
  result: {
    LastBlock: string;
    SafeGasPrice: string;
    ProposeGasPrice: string;
    FastGasPrice: string;
    suggestBaseFee: string;
    gasUsedRatio: string;
  };
};

export default function Command() {
  const [explorerUrl, setExplorerUrl] = useState<string>("https://etherscan.io/");
  const [apiUrl, setApiUrl] = useState<string>("https://api.etherscan.io/");
  const { isLoading, data, revalidate } = useFetch<gasResp>(apiUrl + "api?module=gastracker&action=gasoracle");
  const { LastBlock, SafeGasPrice, ProposeGasPrice, FastGasPrice } = data?.result || {};

  return (
    <List
      navigationTitle="Ethereum Mainnet"
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Network"
          defaultValue="eth"
          storeValue={true}
          onChange={(value) => {
            if (value === "eth") {
              setApiUrl("https://api.etherscan.io/");
              setExplorerUrl("https://etherscan.io/");
            } else if (value === "polygon") {
              setApiUrl("https://api.polygonscan.com/");
              setExplorerUrl("https://polygonscan.com/");
            }
          }}
        >
          <List.Dropdown.Item title="Ethereum" value="eth" />
          <List.Dropdown.Item title="Polygon" value="polygon" />
        </List.Dropdown>
      }
    >
      <List.Item
        icon={{
          source: Icon.EditShape,
          tintColor: Color.Blue,
        }}
        title="Last Block"
        subtitle={LastBlock}
        actions={
          <ActionPanel>
            <Action title="Reload" onAction={() => revalidate()} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={{
          source: Icon.CircleFilled,
          tintColor: Color.Green,
        }}
        title="Low"
        subtitle={SafeGasPrice + " Gwei"}
        actions={
          <ActionPanel>
            <Action title="Reload" onAction={() => revalidate()} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={{
          source: Icon.CircleFilled,
          tintColor: Color.Yellow,
        }}
        title="Average"
        subtitle={ProposeGasPrice + " Gwei"}
        actions={
          <ActionPanel>
            <Action title="Reload" onAction={() => revalidate()} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={{
          source: Icon.CircleFilled,
          tintColor: Color.Red,
        }}
        title="High"
        subtitle={FastGasPrice + " Gwei"}
        actions={
          <ActionPanel>
            <Action title="Reload" onAction={() => revalidate()} />
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
}
