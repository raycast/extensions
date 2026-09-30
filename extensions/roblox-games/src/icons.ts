import fetch from "node-fetch";
import { Game, Thumbnail } from "./types";

export const iconCache: Map<string, string> = new Map();
const iconQueue: string[] = [];

export function getIcon(iconKey: string) {
  if (iconCache.has(iconKey)) return iconCache.get(iconKey);
  iconQueue.push(iconKey);
  console.log("uncached iconKey", iconKey);
  return "https://www.roblox.com/asset-thumbnail/image?assetId=123123123&width=150&height=150&format=png";
}
export async function processQueue(): Promise<void> {
  if (iconQueue.length == 0) return;
  const request = iconQueue.splice(0, 100).map((iconKey) => {
    const s = iconKey.split(":");
    if (iconCache.has(iconKey)) console.warn("icon already cached", iconKey);
    return { type: s[0], targetId: s[1], format: "png", size: "150x150", requestId: iconKey };
  });
  const response = await fetch("https://thumbnails.roblox.com/v1/batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  const data = (await response.json()) as { data: Thumbnail[] };
  for (const image of data.data) iconCache.set(image.requestId, image.imageUrl);
  return processQueue();
}

export function requestIconForGames(games: Game[]): Promise<void> {
  for (const game of games) {
    getIcon(`GameIcon:${game.universeId}`);
    if (game.creatorType == "User") getIcon(`AvatarHeadShot:${game.creatorId}`);
    if (game.creatorType == "Group") getIcon(`GroupIcon:${game.creatorId}`);
  }
  return processQueue();
}
setInterval(processQueue, 100);
