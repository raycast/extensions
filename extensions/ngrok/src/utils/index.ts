import { List } from "@raycast/api";

export * from "./date";
export * from "./validators";

const chars = 11;

export function shortenTunnelId(id: string) {
  if (!id) return "";

  return `${id.substring(0, chars + 3)}...${id.substring(id.length - chars)}`;
}

export function getTunnelAccessories(metadata: string | undefined, labels: Record<string, string> | undefined) {
  const accessories: List.Item.Accessory[] = [];

  if (metadata) {
    accessories.push({ text: metadata, tooltip: metadata });
  }

  if (labels) {
    Object.entries(labels).forEach(([key, name]) => {
      const tag = `${key}=${name}`;

      accessories.push({ tag, tooltip: tag });
    });
  }

  return accessories;
}
