import { useFetch } from "@raycast/utils";
import { DATA_CSV_URL } from "../config/constants";

export type ListItem = {
  path: string[];
  value: string;
  chainId: number;
};

export const useAddresses = () => {
  const { isLoading, data } = useFetch(DATA_CSV_URL);

  const parsedData: ListItem[] = data
    ? (data as string)
        .split("\n")
        .filter(Boolean)
        .map((line: string) => {
          const [address, fullPath, chainId] = line.split(",");
          return {
            value: address,
            path: fullPath.trim().split(" "),
            chainId: parseInt(chainId, 10),
          };
        })
    : [];

  return { isLoading, data: parsedData };
};
