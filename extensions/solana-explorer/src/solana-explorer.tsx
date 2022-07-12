import { ActionPanel, Icon, Image, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Repository } from "./blockchain/repository";
import { BlockchainConfig } from "./blockchain/config";
import {
  AccountSearchResult,
  BlockSearchResult,
  EpochSearchResult,
  SearchResult,
  TokenSearchResult,
} from "./blockchain/model/search-result";
import { Action } from "@raycast/api";

export default function Command() {
  const [lastQuery, setLastQuery] = useState<string>("");
  const [repository] = useState<Repository>(new Repository(BlockchainConfig.mainnet()));
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchItems, setSearchItems] = useState<SearchResult[]>([]);

  const queryOnChange = async (query: string) => {
    setLastQuery(query);
    if (!isReady) return;
    try {
      // Remove special characters
      query = query.replace(new RegExp('"', "g"), "");

      setIsLoading(true);
      const result = await repository.search(query);
      setSearchItems(result);
    } catch (error) {
      if (error instanceof Error) showToast(Toast.Style.Failure, "Failed initializing", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    repository
      .connect()
      .then(() => {
        setIsReady(true);
        return queryOnChange(lastQuery);
      })
      .catch((error) => showToast(Toast.Style.Failure, "Failed initializing", error.message))
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <List isLoading={isLoading || !isReady} onSearchTextChange={queryOnChange} throttle={true}>
      {/*Account*/}
      {searchItems.find((item) => item.constructor == AccountSearchResult) != null && (
        <List.Section title="Transaction">
          {searchItems
            .filter((item) => item.constructor == AccountSearchResult)
            .map((item) => {
              const _item = item as AccountSearchResult;
              return (
                <List.Item
                  title={`${_item.pubKey}`}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser url={_item.actionUrl} />
                    </ActionPanel>
                  }
                />
              );
            })}
        </List.Section>
      )}

      {/* Tokens*/}
      {searchItems.find((item) => item.constructor == TokenSearchResult) != null && (
        <List.Section title="Tokens">
          {searchItems
            .filter((item) => item.constructor == TokenSearchResult)
            .map((item) => {
              const _item = item as TokenSearchResult;
              return (
                <List.Item
                  title={`${_item.name}`}
                  icon={{ source: _item.icon ?? Icon.Circle, mask: Image.Mask.Circle, fallback: "command-icon.png" }}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser url={_item.actionUrl} />
                    </ActionPanel>
                  }
                />
              );
            })}
        </List.Section>
      )}

      {/*Block*/}
      {searchItems.find((item) => item.constructor == BlockSearchResult) != null && (
        <List.Section id="block" title="Block">
          {searchItems
            .filter((item) => item.constructor == BlockSearchResult)
            .map((item) => {
              const _item = item as BlockSearchResult;
              return (
                <List.Item
                  title={`Slot #${_item.index}`}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser url={_item.actionUrl} />
                    </ActionPanel>
                  }
                />
              );
            })}
        </List.Section>
      )}

      {/*Slot*/}
      {searchItems.find((item) => item.constructor == EpochSearchResult) != null && (
        <List.Section title="Epoch">
          {searchItems
            .filter((item) => item.constructor == EpochSearchResult)
            .map((item) => {
              const _item = item as EpochSearchResult;
              return (
                <List.Item
                  title={`Epoch #${_item.index}`}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser url={_item.actionUrl} />
                    </ActionPanel>
                  }
                />
              );
            })}
        </List.Section>
      )}
    </List>
  );
}
