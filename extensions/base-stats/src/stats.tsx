import { List, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";

interface BaseStats {
  tvl: string;
  tvlChange: string;
  tps: string;
  tpsChange: string;
  txCount: string;
}

async function fetchBaseStats(): Promise<BaseStats> {
  try {
    const response = await fetch("https://l2beat.com/scaling/projects/base");
    const html = await response.text();

    // Extract TVL and TVL change
    const tvlMatch = html.match(/\$(\d+\.\d+)\s*B/);
    const tvlChangeMatch = html.match(/text-right text-xs">(\d+\.\d+)%/);

    // Extract TPS and TPS change
    const tpsMatch = html.match(/font-bold md:text-base">(\d+\.\d+)/);
    const tpsChangeMatch = html.match(/text-right text-xs">(\d+\.\d+)%/g);

    // Extract 30D transaction count
    const txCountMatch = html.match(/30D tx count[\s\S]*?font-bold">(\d+\.\d+)\s*M/);

    if (!tvlMatch || !tvlChangeMatch || !tpsMatch || !tpsChangeMatch || !txCountMatch) {
      throw new Error("Failed to parse stats from L2Beat");
    }

    return {
      tvl: tvlMatch[1],
      tvlChange: tvlChangeMatch[1],
      tps: tpsMatch[1],
      tpsChange: tpsChangeMatch[1].match(/(\d+\.\d+)/)?.[1] ?? "0",
      txCount: txCountMatch[1],
    };
  } catch (error) {
    console.error("Error fetching Base stats:", error);
    throw error;
  }
}

export default function Command() {
  const [stats, setStats] = useState<BaseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await fetchBaseStats();
        setStats(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch stats");
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <List isLoading={isLoading}>
      {error ? (
        <List.Item icon={Icon.ExclamationMark} title="Error loading stats" subtitle={error} />
      ) : (
        stats && (
          <>
            <List.Item
              icon={Icon.BankNote}
              title="Total Value Locked"
              subtitle={`$${stats.tvl}B`}
              accessories={[
                { text: `${stats.tvlChange}%` },
                { icon: stats.tvlChange.startsWith("-") ? Icon.ArrowDown : Icon.ArrowUp },
              ]}
            />
            <List.Item
              icon={Icon.Gauge}
              title="Daily TPS"
              subtitle={stats.tps}
              accessories={[
                { text: `${stats.tpsChange}%` },
                { icon: stats.tpsChange.startsWith("-") ? Icon.ArrowDown : Icon.ArrowUp },
              ]}
            />
            <List.Item icon={Icon.Calendar} title="30D Transactions" subtitle={`${stats.txCount}M`} />
          </>
        )
      )}
    </List>
  );
}
