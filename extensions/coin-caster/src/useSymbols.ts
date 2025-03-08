import { useQuery } from "@tanstack/react-query";
import { apiBaseUrl } from "./constants";
import fetch from "node-fetch";

const getSymbols = async (): Promise<string[]> => {
  const response = await fetch(`${apiBaseUrl}/symbols/usd`);
  return response.json() as Promise<string[]>;
};

export default function useSymbols() {
  return useQuery({
    queryKey: ["symbols"],
    queryFn: () => getSymbols(),
    staleTime: 3_600_000, // 1 hour
  });
}
