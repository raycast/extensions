export const tanaColorOptions = [
  { name: "Default", value: "#7d798f" },
  { name: "Fuchsia", value: "#d1086d" },
  { name: "Red", value: "#a60717" },
  { name: "Orange", value: "#ff9100" },
  { name: "Dark Yellow", value: "#d48c0d" },
  { name: "Yellow", value: "#d6ba04" },
  { name: "Olive", value: "#9db325" },
  { name: "Green", value: "#1dbf8c" },
  { name: "Dark Blue", value: "#0558ab" },
  { name: "Blue", value: "#0066ff" },
  { name: "Indigo", value: "#4303a8" },
  { name: "Purple", value: "#8b299e" },
  { name: "Pink", value: "#f750d3" },
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
