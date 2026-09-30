import { useQuery } from "@tanstack/react-query";
import { apiBaseUrl } from "./constants";
import fetch from "node-fetch";
import { showFailureToast } from "@raycast/utils";

export const getPrice = async (symbol: string): Promise<number> => {
  try {
    const response = await fetch(`${apiBaseUrl}/price/${symbol}/usd`);
    const data = (await response.json()) as { price: string };
    return Number(data.price);
  } catch (error) {
    showFailureToast(error as Error, { title: "Failed to fetch token price" });
    return 0;
  }
};

export default function useTokenPrice(token: string | null) {
  return useQuery({
    queryKey: ["token-price", token],
    queryFn: () => (token ? getPrice(token) : undefined),
    enabled: !!token,
    staleTime: 60_000, // 1 minute
  });
}
