import { useFetch } from "@raycast/utils";
import fetch from "node-fetch";
import { getAPIKey } from "../utils/preferences";
import {
  AssetDetailsResponse,
  CollectionResponse,
  FloorPriceResponse,
  SearchResponse,
  TransferHistoryResponse,
  ContractsOfOwnersResponse,
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

/** not a hook */
export const getAssetDetails = async ({ address, tokenId }: { address: string; tokenId: string }) => {
  const apiKey = getAPIKey();
  const response = await fetch(ApiUrls.getAsset(address, tokenId), {
    method: "GET",
    headers: { accept: "application/json", "X-API-Key": apiKey },
  });
  const data = (await response.json()) as AssetDetailsResponse;

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

export const useCollectionDetails = (address: string) => {
  const apiKey = getAPIKey();
  const { data } = useFetch<CollectionResponse>(ApiUrls.getCollection("ethereum-mainnet", address), {
    method: "GET",
    headers: { accept: "application/json", "X-API-Key": apiKey },
  });

  return { data };
};

export const useFloorPrice = (address: string) => {
  const apiKey = getAPIKey();
  const { data } = useFetch<FloorPriceResponse>(ApiUrls.getFloorPriceOfCollection("ethereum-mainnet", address), {
    method: "GET",
    headers: { accept: "application/json", "X-API-Key": apiKey },
  });

  return { data };
};

export const useVolumeData = (address: string) => {
  const apiKey = getAPIKey();
  const { data } = useFetch<VolumeResponse>(ApiUrls.getVolumeOfCollection("ethereum-mainnet", address), {
    method: "GET",
    headers: { accept: "application/json", "X-API-Key": apiKey },
  });

  return { data };
};

export const useSearch = (searchText: string) => {
  const apiKey = getAPIKey();
  const { data } = useFetch<SearchResponse>(ApiUrls.search("ethereum-mainnet", searchText), {
    method: "GET",
    headers: { accept: "application/json", "X-API-Key": apiKey },
  });

  return { data };
};

export const useContractsOfOwner = (address: string) => {
  const apiKey = getAPIKey();
  const { data, isLoading } = useFetch<ContractsOfOwnersResponse>(
    ApiUrls.getContractsOfOwner("ethereum-mainnet", address),
    {
      method: "GET",
      headers: { accept: "application/json", "X-API-Key": apiKey },
    },
  );

  return { data, isLoading };
};
