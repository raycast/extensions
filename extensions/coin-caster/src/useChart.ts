import { useQuery } from "@tanstack/react-query";
import { apiBaseUrl } from "./constants";
import fetch from "node-fetch";
import { showFailureToast } from "@raycast/utils";

export type ChartData = {
  price: number;
  timestamp: number;
}[];

const getChart = async (id: string): Promise<ChartData> => {
  try {
    const response = await fetch(`${apiBaseUrl}/chart/${id}`);
    return response.json() as Promise<ChartData>;
  } catch (error) {
    showFailureToast("Failed to fetch chart data");
    return [];
  }
};

export default function useChart(id: string, query: boolean) {
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: [`${id}-chart`],
    queryFn: () => getChart(id),
    staleTime: 60_000, // 1 minute
    enabled: query,
  });

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  return { chart: data?.filter((c) => c.timestamp > oneDayAgo), isLoading, dataUpdatedAt };
}
