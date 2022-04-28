import { Action, ActionPanel, List } from "@raycast/api";
import fetch from "node-fetch";
import { useEffect, useState } from "react";

interface FeesResponse {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  minimumFee: number;
}

const feeText: Record<string, string> = {
  fastestFee: "High Priority",
  halfHourFee: "Medium Priority",
  hourFee: "Low Priority",
  minimumFee: "Minimum Fee",
};

interface State {
  fees?: FeesResponse;
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function fetchFees() {
      try {
        const response = await fetch("https://mempool.space/api/v1/fees/recommended");
        const data = (await response.json()) as FeesResponse;
        setState({ fees: data });
      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    }

    fetchFees();
  }, []);

  return (
    <List>
      {Object.entries(state.fees || {}).map(([k, v]: [string, number]) => (
        <List.Item
          key={k}
          title={feeText[k] || ""}
          accessories={[{ text: `${v.toString()} sat/vB`, tooltip: "fee in satoshis per vByte" }]}
          actions={
            <ActionPanel title="Mempool fees">
              <Action.OpenInBrowser url="https://mempool.space" />
              <Action.CopyToClipboard content={v} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
