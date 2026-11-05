import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type { DetectedKind } from "./lib/detect";
import { openCommand } from "./lib/launch";

const LABELS: Partial<Record<DetectedKind, string>> = {
  txHash: "transaction hash",
  address: "address",
  calldata: "calldata",
  ensName: "ENS name",
  solanaSig: "Solana signature",
  solanaAddress: "Solana address",
};

export function isDecodable(kind: DetectedKind): boolean {
  return LABELS[kind] !== undefined;
}

export function DecodeHint({ text, kind }: { text: string; kind: DetectedKind }) {
  return (
    <List.Item
      icon={{ source: Icon.Wand, tintColor: Color.Blue }}
      title={`Decode this ${LABELS[kind] ?? "value"}`}
      subtitle="this looks like a job for the Decode command"
      accessories={[{ tag: { value: "↩ Decode", color: Color.Blue } }]}
      actions={
        <ActionPanel>
          <Action title="Decode" icon={Icon.Wand} onAction={() => openCommand("decode", "Decode", { text })} />
        </ActionPanel>
      }
    />
  );
}
