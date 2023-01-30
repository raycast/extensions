import { Action, ActionPanel, Icon, Image, List, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { Connection } from "@solana/web3.js";
import { FC, useRef } from "react";
import { TokenDetailView } from "./TokenDetailView";
import axios from "axios";
import { Token } from "../../types/tokens";

interface IOtherViewProps {
  query: string;
  connection: Connection;
  cluster: string;
}

const OtherView: FC<IOtherViewProps> = ({ query, connection, cluster }) => {
  const abortable = useRef<AbortController>();

  const { pop } = useNavigation();

  const {
    isLoading: isTokensLoading,
    revalidate: revalidateTokens,
    data: tokens,
  } = usePromise(
    async (query: string) => {
      let tokens: Token[];

      if (cluster === "mainnet-beta") {
        const { data } = await axios.get("https://cache.jup.ag/tokens");
        console.log("data", data);
        tokens = data;
      } else if (cluster === "devnet") {
        const { data } = await axios.get("https://api.jup.ag/api/tokens/devnet");
        tokens = data;
      } else {
        tokens = [];
      }

      const filteredTokens = tokens.filter((token) => token.name.toLowerCase().indexOf(query) > -1).slice(0, 10);
      console.log("filteredTokens", filteredTokens);
      return filteredTokens;
    },
    [query],
    { abortable }
  );

  console.log("tokens", tokens);

  const revalidateAll = () => {
    revalidateTokens();
  };

  return (
    <List
      searchBarPlaceholder={query}
      filtering={false}
      onSearchTextChange={() => pop()}
      isLoading={isTokensLoading}
      actions={
        <ActionPanel>
          <Action title="Reload" onAction={() => revalidateAll()} />
        </ActionPanel>
      }
    >
      <List.Section title="Tokens">
        {tokens?.map((token) => (
          <List.Item
            title={token.symbol}
            icon={{ source: token.logoURI ?? Icon.Circle, mask: Image.Mask.Circle, fallback: "command-icon.png" }}
            actions={
              <ActionPanel>
                <Action.Push title="View Token Details" target={<TokenDetailView token={token} />} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
};

export default OtherView;
