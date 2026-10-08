import { useFetch } from "@raycast/utils";
import type { FeedEntity, ListResponse } from "crossbell";

export function useFeed(characterId?: number) {
  const { isLoading, data } = useFetch<ListResponse<FeedEntity>>(
    `https://indexer.crossbell.io/v1/characters/${characterId}/feed/follow?limit=20&type=POST_NOTE&type=POST_NOTE_FOR_NOTE&type=POST_NOTE_FOR_ANY_URI&type=POST_NOTE_FOR_ADDRESS&type=POST_NOTE_FOR_LINKLIST&type=POST_NOTE_FOR_CHARACTER&type=POST_NOTE_FOR_ERC721&includeCharacterMetadata=true`,
    { execute: Boolean(characterId) },
  );

  return {
    isLoading,
    data,
  };
}

export function useLatestFeed() {
  const { isLoading, data } = useFetch<ListResponse<FeedEntity>>(
    `https://indexer.crossbell.io/v1/feed?limit=20&type=POST_NOTE&type=POST_NOTE_FOR_NOTE&type=POST_NOTE_FOR_ANY_URI&type=POST_NOTE_FOR_ADDRESS&type=POST_NOTE_FOR_LINKLIST&type=POST_NOTE_FOR_CHARACTER&type=POST_NOTE_FOR_ERC721&includeCharacterMetadata=true`,
  );

  return {
    isLoading,
    data,
  };
}
