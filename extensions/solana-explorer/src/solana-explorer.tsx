import { ActionPanel, Icon, ImageMask, List, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
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

export default function Command() {
  const [repository, setRepository] = useState<Repository>(new Repository(BlockchainConfig.mainnet()));
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchItems, setSearchItems] = useState<SearchResult[]>([]);

  useEffect(() => {
    setIsLoading(true);
    repository
      .connect()
      .then(() => setIsReady(true))
      .catch((error) => showToast(ToastStyle.Failure, "Failed initializing", error.message))
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const queryOnChange = async (query: string) => {
    if (!isReady) return;
    try {
      setIsLoading(true);
      const result = await repository.search(query);
      setSearchItems(result);
    } catch (error) {
      if (error instanceof Error) showToast(ToastStyle.Failure, "Failed initializing", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <List isLoading={isLoading || !isReady} onSearchTextChange={queryOnChange}>
      {/*Account*/}
      {searchItems.find((item) => item.constructor == AccountSearchResult) != null && (
        <List.Section title="Tokens">
          {searchItems
            .filter((item) => item.constructor == AccountSearchResult)
            .map((item) => {
              const _item = item as AccountSearchResult;
              return (
                <List.Item
                  title={`${_item.pubKey}`}
                  actions={
                    <ActionPanel>
                      <OpenInBrowserAction url={_item.actionUrl} />
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
                  icon={{ source: _item.icon ?? Icon.Circle, mask: ImageMask.Circle }}
                  actions={
                    <ActionPanel>
                      <OpenInBrowserAction url={_item.actionUrl} />
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
                      <OpenInBrowserAction url={_item.actionUrl} />
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
                      <OpenInBrowserAction url={_item.actionUrl} />
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
