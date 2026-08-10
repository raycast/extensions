import { useFetch, useLocalStorage } from "@raycast/utils";
import { DATA_CSV_URL } from "../config/constants";
import { ChainList } from "@bgd-labs/toolbox";

export type ListItem = {
  path: string[];
  value: string;
  chainId: number;
  link: string;
  searchPath: string;
};

const TAG_MAP: Record<string, string[]> = {
  S_TOKEN: ["stable", "debt"],
  V_TOKEN: ["variable", "debt"],
  STATA_TOKEN: ["stata", "static"],
};

const STORAGE_KEY = "aave-addresses-cache";

export const useAddresses = () => {
  const { value: cachedData, setValue: setCachedData } = useLocalStorage<ListItem[]>(STORAGE_KEY, []);

  const {
    isLoading,
    data: fetchedData,
    error,
  } = useFetch<string, undefined, ListItem[]>(DATA_CSV_URL, {
    mapResult: (text) => {
      const data = text
        .split("\n")
        .filter(Boolean)
        .slice(1)
        .map((line: string) => {
          const [address, fullPath, chainId] = line.split(",");
          const parsedChainId = parseInt(chainId, 10);
          const path = fullPath.trim().split(" ");

          return {
            value: address,
            path,
            chainId: parsedChainId,
            link: `${ChainList[parsedChainId as keyof typeof ChainList]?.blockExplorers?.default.url.replace(/\/$/, "")}/address/${address}`,
            searchPath: [...path, address, ...(TAG_MAP[path[path.length - 1]] ?? [])].join(" "),
          };
        });

      setCachedData(data);
      return { data };
    },
  });

  if (error || isLoading) {
    return { isLoading: false, data: cachedData, error: undefined };
  }

  return { isLoading, data: fetchedData, error };
};
