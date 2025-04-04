import { Icon, List, Image, ActionPanel, Action } from "@raycast/api";
import { getFavicon, usePromise } from "@raycast/utils";
import { Cluster, clusterApiUrl, Connection } from "@solana/web3.js";
import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import { Token } from "../../types/tokens";
import { resolveUrl, SolType } from "../../utils/explorerResolver";
import { getIconForType } from "../../utils/icons";
import { isNumeric } from "../../utils/isNumeric";
import { getPreviousSearches, putInStorage, StorageItem } from "../../utils/storage";
import { truncateAddress, truncateSig } from "../../utils/truncate";
import AccountDetailView from "../AccountDetailView";
import { TokenDetailView } from "../TokenDetailView";
import TransactionDetailView from "../TransactionDetailView";

interface Props {
  cluster: Cluster;
}

const Command = ({ cluster }: Props) => {
  const [query, setQuery] = useState<string>();
  const [debouncedQuery] = useDebounce(query?.trim().replace(new RegExp('"', "g"), ""), 200);
  const [previousSearches, setPreviousSearches] = useState<StorageItem[]>([]);
  const [allTokens, setTokens] = useState<Token[]>([]);

  const abortable = useRef<AbortController>();

  const {
    isLoading: isTokensLoading,
    revalidate: revalidateTokens,
    data: tokens,
  } = usePromise(
    async (query: string) => {
      const filteredTokens = allTokens.filter((token) => token.symbol.toLowerCase().indexOf(query) > -1).slice(0, 10);
      return filteredTokens;
    },
    [debouncedQuery as string],
    { abortable, execute: !!debouncedQuery },
  );

  const revalidateAll = () => {
    revalidateTokens();
  };

  useEffect(() => {
    const getTokens = async () => {
      if (cluster === "mainnet-beta") {
        const { data } = await axios.get("https://cache.jup.ag/tokens");
        setTokens(data);
      } else if (cluster === "devnet") {
        const { data } = await axios.get("https://api.jup.ag/api/tokens/devnet");
        setTokens(data);
      }
    };

    getTokens().catch(console.log);
  }, []);

  useEffect(() => {
    const loadPrevious = async () => {
      const previousSearches = await getPreviousSearches();

      setPreviousSearches(previousSearches.filter((item) => item.cluster === cluster));
    };
    loadPrevious().catch(console.log);
  }, []);

  const connection = useMemo(() => {
    return new Connection(clusterApiUrl(cluster));
  }, [cluster]);

  if (debouncedQuery) {
    if (debouncedQuery.length === 44) {
      putInStorage(debouncedQuery, SolType.ADDRESS, cluster);
      return <AccountDetailView pubkey={debouncedQuery} connection={connection} />;
    } else if (debouncedQuery.length === 88) {
      putInStorage(debouncedQuery, SolType.TRANSACTION, cluster);
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
                    <Action.Push
                      title="View Token Details"
                      target={<TokenDetailView token={token} cluster={cluster} />}
                      onPush={() => putInStorage(token.symbol, SolType.TOKEN, cluster)}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>

          {isNumeric(debouncedQuery) && (
            <List.Section title="Block">
              <List.Item
                title={`Slot #${debouncedQuery}`}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="Open in Explorer"
                      url={resolveUrl(debouncedQuery, SolType.BLOCK, cluster)}
                      icon={getFavicon(resolveUrl(debouncedQuery, SolType.BLOCK, cluster))}
                      onOpen={() => putInStorage(debouncedQuery, SolType.BLOCK, cluster)}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
        </List>
      );
    }
  } else {
    return (
      <List searchBarPlaceholder="Search by address or transaction signature" onSearchTextChange={setQuery} throttle>
        <List.EmptyView title="Type a account address or transaction signature" />
        <List.Section title="Previous Searches">
          {allTokens &&
            previousSearches.map((item) => (
              <List.Item
                key={item.data}
                title={
                  item.type === SolType.TRANSACTION
                    ? truncateSig(item.data)
                    : item.type === SolType.ADDRESS
                      ? truncateAddress(item.data)
                      : item.data
                }
                icon={{ source: getIconForType(item.type), mask: Image.Mask.Circle, fallback: "command-icon.png" }}
                accessories={[{ text: item.type, icon: getIconForType(item.type) }]}
                actions={
                  <ActionPanel>
                    {item.type === SolType.ADDRESS && (
                      <Action.Push
                        title="View Account Details"
                        target={<AccountDetailView pubkey={item.data} connection={connection} />}
                      />
                    )}

                    {item.type === SolType.TRANSACTION && (
                      <Action.Push
                        title="View Transaction Details"
                        target={<TransactionDetailView signature={item.data} connection={connection} />}
                      />
                    )}

                    {item.type === SolType.TOKEN && allTokens.find((token) => token.symbol === item.data) && (
                      <Action.Push
                        title="View Token Details"
                        target={
                          <TokenDetailView
                            token={allTokens.find((token) => token.symbol === item.data) as Token}
                            cluster={cluster}
                          />
                        }
                      />
                    )}

                    {item.type === SolType.BLOCK && (
                      <Action.OpenInBrowser
                        title="Open in Explorer"
                        url={resolveUrl(item.data, SolType.BLOCK, cluster)}
                        icon={getFavicon(resolveUrl(item.data, SolType.BLOCK, cluster))}
                      />
                    )}
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      </List>
    );
  }
};

export default Command;
