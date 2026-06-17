import { useFetch } from "@raycast/utils";
import { getAPIKey } from "../utils/preferences";
import {
  AssetDetailsResponse,
  CollectionResponse,
  FloorPriceResponse,
  SearchResponse,
  TransferHistoryResponse,
  UseContractsOfOwnersResponse,
  VolumeResponse,
} from "../types";
import { ApiUrls } from "../constants/endpoints";

export const useAssetDetails = ({ address, tokenId }: { address: string; tokenId: string }) => {
  const apiKey = getAPIKey();
  const { data } = useFetch<AssetDetailsResponse>(ApiUrls.getAsset(address, tokenId), {
    method: "GET",
    headers: { accept: "application/json", "X-API-Key": apiKey },
  });

  return { data };
};

export const useTransferHistory = ({ address, tokenId }: { address: string; tokenId: string }) => {
  const apiKey = getAPIKey();
  const { data } = useFetch<TransferHistoryResponse>(ApiUrls.getAssetTransfers("ethereum-mainnet", address, tokenId), {
    method: "GET",
    headers: { accept: "application/json", "X-API-Key": apiKey },
  });

  return { data };
};

export const useCollectionDetails = ({ address }: { address: string }) => {
  const apiKey = getAPIKey();
  const { data } = useFetch<CollectionResponse>(ApiUrls.getCollection("ethereum-mainnet", address), {
    method: "GET",
    headers: { accept: "application/json", "X-API-Key": apiKey },
  });

  return { data };
};

export const useFloorPrice = ({ address }: { address: string }) => {
  const apiKey = getAPIKey();
  const { data } = useFetch<FloorPriceResponse>(ApiUrls.getFloorPriceOfCollection("ethereum-mainnet", address), {
    method: "GET",
    headers: { accept: "application/json", "X-API-Key": apiKey },
  });

  return { data };
};

export const useVolumeData = ({ address }: { address: string }) => {
  const apiKey = getAPIKey();
  const { data } = useFetch<VolumeResponse>(ApiUrls.getVolumeOfCollection("ethereum-mainnet", address), {
    method: "GET",
    headers: { accept: "application/json", "X-API-Key": apiKey },
  });

  return { data };
};

export const useSearch = ({ searchText }: { searchText: string }) => {
  const apiKey = getAPIKey();
  const { data } = useFetch<SearchResponse>(ApiUrls.search("ethereum-mainnet", searchText), {
    method: "GET",
    headers: { accept: "application/json", "X-API-Key": apiKey },
  });

  return { data };
};

export const useContractsOfOwner = ({ searchText }: { searchText: string }) => {
  const apiKey = getAPIKey();
  const { data } = useFetch<UseContractsOfOwnersResponse>(ApiUrls.getContractsOfOwner("ethereum-mainnet", searchText), {
    method: "GET",
    headers: { accept: "application/json", "X-API-Key": apiKey },
  });

  return { data };
};
