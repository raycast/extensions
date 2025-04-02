import { useQuery } from "@tanstack/react-query";
import { apiBaseUrl } from "./constants";
import fetch from "node-fetch";
import { showFailureToast } from "@raycast/utils";

const getSymbols = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${apiBaseUrl}/symbols/usd`);
    return response.json() as Promise<string[]>;
  } catch (error) {
    showFailureToast("Failed to fetch symbols");
    return [];
  }
};

export default function useSymbols() {
  return useQuery({
    queryKey: ["symbols"],
    queryFn: () => getSymbols(),
    staleTime: 3_600_000, // 1 hour
  });
}
