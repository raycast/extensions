import { useFetch } from "@raycast/utils";
import { DATA_CSV_URL } from "../config/constants";

export type ListItem = {
  path: string[];
  value: string;
  chainId: number;
};

export const useAddresses = () => {
  return useFetch<ListItem[]>(DATA_CSV_URL, {
    parseResponse: async (response) => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      const text = await response.text();
      return text
        .split("\n")
        .filter(Boolean)
        .map((line: string) => {
          const [address, fullPath, chainId] = line.split(",");
          return {
            value: address,
            path: fullPath.trim().split(" "),
            chainId: parseInt(chainId, 10),
          };
        });
    },
  });
};
