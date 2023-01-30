import { Icon, List, Image, ActionPanel, Action } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { Cluster, clusterApiUrl, Connection } from "@solana/web3.js";
import axios from "axios";
import { useMemo, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import { Token } from "../../types/tokens";
import { isNumeric } from "../../utils/isNumeric";
import AccountDetailView from "../AccountDetailView";
import { TokenDetailView } from "../OtherView/TokenDetailView";
import TransactionDetailView from "../TransactionDetailView";

interface Props {
  cluster: Cluster;
}

const Command = ({ cluster }: Props) => {
  const [query, setQuery] = useState<string>();
  const [debouncedQuery] = useDebounce(query?.trim().replace(new RegExp('"', "g"), ""), 200);

  const abortable = useRef<AbortController>();

  const {
    isLoading: isTokensLoading,
    revalidate: revalidateTokens,
    data: tokens,
  } = usePromise(
    async (query: string) => {
      let tokens: Token[];

      if (cluster === "mainnet-beta") {
        const { data } = await axios.get("https://cache.jup.ag/tokens");
        tokens = data;
      } else if (cluster === "devnet") {
        const { data } = await axios.get("https://api.jup.ag/api/tokens/devnet");
        tokens = data;
      } else {
        tokens = [];
      }

      const filteredTokens = tokens.filter((token) => token.symbol.toLowerCase().indexOf(query) > -1).slice(0, 10);
      return filteredTokens;
    },
    [debouncedQuery as string],
    { abortable, execute: !!debouncedQuery }
  );

  const revalidateAll = () => {
    revalidateTokens();
  };

  const connection = useMemo(() => {
    return new Connection(clusterApiUrl(cluster));
  }, [cluster]);

  if (debouncedQuery) {
    if (debouncedQuery.length === 44) {
      return <AccountDetailView pubkey={debouncedQuery} connection={connection} />;
    } else if (debouncedQuery.length === 88) {
      return <TransactionDetailView signature={debouncedQuery} connection={connection} />;
    } else {
      return (
        <List
          searchBarPlaceholder={query}
          filtering={false}
          onSearchTextChange={setQuery}
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

          {isNumeric(debouncedQuery) && (
            <>
              <List.Section title="Block">
                <List.Item
                  title={`Slot #${debouncedQuery}`}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser url={"https://google.com"} />
                      {/* TODO: fix url */}
                    </ActionPanel>
                  }
                />
              </List.Section>

              <List.Section title="Epoch">
                <List.Item
                  title={`Epoch #${debouncedQuery}`}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser url={"https://google.com"} />
                      {/* TODO: fix url */}
                    </ActionPanel>
                  }
                />
              </List.Section>
            </>
          )}
        </List>
      );
    }
  } else {
    return (
      <List searchBarPlaceholder="Search by address or transaction signature" onSearchTextChange={setQuery} throttle>
        <List.EmptyView title="Type a account address or transaction signature" />
      </List>
    );
  }
};

export default Command;
