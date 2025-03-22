import { Action, ActionPanel, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface FeesResponse {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

const feeText: Record<string, string> = {
  fastestFee: "High Priority",
  halfHourFee: "Medium Priority",
  hourFee: "Low Priority",
  economyFee: "No Priority",
  minimumFee: "Minimum Fee",
};

export default function Command() {
  const { isLoading, data: fees } = useFetch<FeesResponse>("https://mempool.space/api/v1/fees/recommended");

  return (
    <List isLoading={isLoading}>
      {Object.entries(fees || {}).map(([k, v]: [string, number]) => (
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
