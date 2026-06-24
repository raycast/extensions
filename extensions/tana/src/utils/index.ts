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
