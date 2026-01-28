import { useInfiniteQuery } from "@tanstack/react-query";
import { api, FindUserAssetsRequestDto, FindUserAssetsResponseDto, AssetEntity } from "../api";
import { AxiosError } from "axios";

export const assetsQueryKeys = {
  all: ["assets"] as const,
  lists: () => [...assetsQueryKeys.all, "list"] as const,
  list: (filters?: Partial<FindUserAssetsRequestDto>) => [...assetsQueryKeys.lists(), filters] as const,
} as const;

export interface UseAssetsParams extends Omit<FindUserAssetsRequestDto, "page"> {
  enabled?: boolean;
}

export function useAssetsQuery(params: UseAssetsParams = {}) {
  const { contractId, pageSize = 20, sortBy, order, quickFilter, enabled = true } = params;

  return useInfiniteQuery({
    queryKey: assetsQueryKeys.list({ contractId, pageSize, sortBy, order, quickFilter }),
    queryFn: async ({ pageParam = 1 }): Promise<FindUserAssetsResponseDto> => {
      const requestParams: FindUserAssetsRequestDto = {
        contractId,
        pageSize,
        page: pageParam,
        sortBy,
        order,
        quickFilter,
      };

      const response = await api.assets.list(requestParams, {});

      if (response.status === "ok") {
        return response;
      } else {
        throw new Error(response.errorCode || "Failed to load assets");
      }
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.ok?.meta) return undefined;

      const { page, countPages } = lastPage.ok.meta;
      return page < countPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled,
    throwOnError: false,
    retry: (failureCount, error) => {
      if (error instanceof AxiosError && error.response?.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

export function getAssetsErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response?.status === undefined) {
      return "Network error occurred.";
    }
    if (error.response?.status === 401) {
      return "Authentication failed. Please check your API key.";
    }
    if (error.response?.status === 403) {
      return "Access denied. Please check your permissions.";
    }
    if (error.response?.status >= 500) {
      return "Server error. Please try again later.";
    }
    return error.message || "Network error occurred.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

export function getFlatAssetsList(data: FindUserAssetsResponseDto[] | undefined): AssetEntity[] {
  if (!data) return [];

  return data.reduce<AssetEntity[]>((acc, page) => {
    if (page.ok?.data) {
      acc.push(...page.ok.data);
    }
    return acc;
  }, []);
}
