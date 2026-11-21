import { LocalStorage } from "@raycast/api";
import type { ClientType, NetworkClient } from "../api/types";

const STORAGE_PREFIX = "favorite-network-clients";
const CLIENT_TYPES = new Set<ClientType>(["WIRED", "WIRELESS", "VPN", "TELEPORT"]);

export interface ClientPresence {
  client: NetworkClient;
  connected: boolean;
}

function storageKey(siteId: string): string {
  return `${STORAGE_PREFIX}:${siteId}`;
}

function isStoredClient(value: unknown): value is NetworkClient {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const client = value as Partial<NetworkClient>;
  return (
    typeof client.id === "string" &&
    typeof client.name === "string" &&
    typeof client.type === "string" &&
    CLIENT_TYPES.has(client.type as ClientType)
  );
}

export function parseFavoriteClients(value: string | undefined): NetworkClient[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredClient);
  } catch {
    return [];
  }
}

export async function getFavoriteClients(siteId: string): Promise<NetworkClient[]> {
  return parseFavoriteClients(await LocalStorage.getItem<string>(storageKey(siteId)));
}

export async function setClientFavorite(siteId: string, client: NetworkClient, favorite: boolean): Promise<void> {
  const existing = await getFavoriteClients(siteId);
  const withoutClient = existing.filter((item) => item.id !== client.id);
  const next = favorite ? [...withoutClient, client] : withoutClient;
  await LocalStorage.setItem(storageKey(siteId), JSON.stringify(next));
}

export function resolveClientPresence(
  connectedClients: NetworkClient[],
  favoriteClients: NetworkClient[],
): { favorites: ClientPresence[]; others: NetworkClient[] } {
  const favoritesById = new Map(favoriteClients.map((client) => [client.id, client]));
  const connectedById = new Map(connectedClients.map((client) => [client.id, client]));

  const favorites = [...favoritesById.values()]
    .map((saved) => ({ client: connectedById.get(saved.id) ?? saved, connected: connectedById.has(saved.id) }))
    .sort((left, right) => left.client.name.localeCompare(right.client.name));
  const others = connectedClients.filter((client) => !favoritesById.has(client.id));

  return { favorites, others };
}
