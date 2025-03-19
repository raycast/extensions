import { useFetch } from "@raycast/utils";
import { DATA_CSV_URL } from "../config/constants";
import { ChainList } from "@bgd-labs/rpc-env";

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

export const useAddresses = () => {
  return useFetch<string, undefined, ListItem[]>(DATA_CSV_URL, {
    mapResult: (text) => {
      const data = text
        .split("\n")
        .filter(Boolean)
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
      return { data };
    },
  });
};
