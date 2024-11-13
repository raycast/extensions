import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { useState, useEffect } from "react";

interface Token {
  token_id: string;
  outcome: "Yes" | "No";
  price: number;
}

interface MarketData {
  data: [
    {
      condition_id: string;
      question: string;
      market_slug: string;
      tokens: Token[];
    },
  ];
}

interface StateOdds {
  name: string;
  trump: number;
  harris: number;
}

const SWING_STATES = [
  {
    name: "Michigan",
    url: "https://clob.polymarket.com/rewards/markets/0xbb01eefb24a38a9aa1921ec168d3049e7374b28a2540937d06b3ff2524d66627",
  },
  {
    name: "Pennsylvania",
    url: "https://clob.polymarket.com/rewards/markets/0xa923afcb8297e3ade170f2f8c088f3c277557fadef2c67054d72cc59f8504b2b",
  },
  {
    name: "Wisconsin",
    url: "https://clob.polymarket.com/rewards/markets/0xa59e2e79dc1a564477c8d77dc32c30b37c0f4c8782c8cc062a7f788295cd91bb",
  },
  {
    name: "North Carolina",
    url: "https://clob.polymarket.com/rewards/markets/0x773f3ca26bdf685da92d2a8a701dd98e4e8b46e0b5366cf09aed9eb8fb6fc189",
  },
  {
    name: "Georgia",
    url: "https://clob.polymarket.com/rewards/markets/0x7606802127355512c8f8ff9c70ef27a2717a8554374d84452de4c7d28147338d",
  },
  {
    name: "Nevada",
    url: "https://clob.polymarket.com/rewards/markets/0xdd2f4921a562fc4d18c0bde327d2a9315352a3ba4137656112b9b1770fd1f2a9",
  },
  {
    name: "Arizona",
    url: "https://clob.polymarket.com/rewards/markets/0x4d848bab2da79b9ff7f2b2b0d9ddb048bb1fb47e9f782887f16e91d27de41279",
  },
] as const;

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [odds, setOdds] = useState<StateOdds[]>([]);

  useEffect(() => {
    async function fetchOdds() {
      const stateOdds: StateOdds[] = [];

      for (const state of SWING_STATES) {
        try {
          const response = await fetch(state.url);
          if (!response.ok) {
            throw new Error(`Failed fetching ${state.name} odds`);
          }

          const data = (await response.json()) as MarketData;
          const trumpOdds = data.data[0].tokens.find((t) => t.outcome === "Yes")?.price ?? 0;
          const harrisOdds = data.data[0].tokens.find((t) => t.outcome === "No")?.price ?? 0;

          stateOdds.push({
            name: state.name,
            trump: trumpOdds * 100,
            harris: harrisOdds * 100,
          });
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: `Error fetching ${state.name} odds`,
            message: String(error),
          });
        }
      }

      const sortedOdds = stateOdds.sort((a, b) => a.trump - b.trump);
      setOdds(sortedOdds);
      setIsLoading(false);
    }

    fetchOdds();
  }, []);

  return (
    <List isLoading={isLoading}>
      {odds.map((state) => (
        <List.Item
          key={state.name}
          title={state.name}
          accessories={[{ text: `Trump: ${state.trump.toFixed(1)}%` }, { text: `Harris: ${state.harris.toFixed(1)}%` }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Odds"
                content={`${state.name}: Trump ${state.trump.toFixed(1)}% | Harris ${state.harris.toFixed(1)}%`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
