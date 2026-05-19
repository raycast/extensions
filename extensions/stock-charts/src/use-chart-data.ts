import { showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import type { Interval } from "./types";
import yahooFinance, { type ChartData } from "./yahoo-finance";
import { buildChartMarkdown } from "./chart/quickchart";

export function useChartData(
  symbol: string | undefined,
  interval: Interval,
): {
  chartData: ChartData | null;
  chartMarkdown: string;
  isLoading: boolean;
} {
  const abortRef = useRef<AbortController>(new AbortController());
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [chartMarkdown, setChartMarkdown] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!symbol) {
      setChartData(null);
      setChartMarkdown("");
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    (async () => {
      setIsLoading(true);
      try {
        const data = await yahooFinance.fetchChart(symbol, interval, signal);
        setChartData(data);
        const md = await buildChartMarkdown(
          data.timestamps,
          data.closes,
          interval,
          data.volumes,
        );
        setChartMarkdown(md);
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") {
          showToast({
            style: Toast.Style.Failure,
            title: "Chart Error",
            message: e.message,
          });
          setChartMarkdown("");
        }
      } finally {
        setIsLoading(false);
      }
    })();

    return () => abortRef.current?.abort();
  }, [symbol, interval]);

  return { chartData, chartMarkdown, isLoading };
}
