import { Color } from "@raycast/api";

export const colorOptions = [
  { name: "Default", value: Color.PrimaryText },
  { name: "Blue", value: Color.Blue },
  { name: "Green", value: Color.Green },
  { name: "Magenta", value: Color.Magenta },
  { name: "Orange", value: Color.Orange },
  { name: "Purple", value: Color.Purple },
  { name: "Red", value: Color.Red },
  { name: "Yellow", value: Color.Yellow },
];

export function getNodeIdFromURL(value: string) {
  if (value.startsWith("https://")) {
    const url = new URL(value);
    const nodeId = url.searchParams.get("nodeid");
    if (!nodeId) {
      throw new Error("Node ID not found in URL");
    }
    return nodeId;
  }
  return value;
}
