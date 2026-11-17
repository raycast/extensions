import { LocalStorage } from "@raycast/api";
import { ClientInfoResponse } from "../api/types";
import { getClientFingerprint } from "../api/monobank";
import { PERSONAL_STORAGE_KEYS } from "../data/constants";
import { ClientInfo } from "../types";
import { Cached } from "./storage";
import { removeStatements } from "./statement";

/**
 * Whether a new token (with fingerprint `scope`) belongs to the same person as the cached client info (`"same"`)
 * or to another one (`"other"`). `undefined` when the token didn't change, there's no cache, or the owner of
 * either is unknown (e.g. a cache from an older version), so the stored data is left as it is.
 */
export function getOwnerChange(
  cache: Cached<{ clientInfo: ClientInfo }> | undefined,
  response: ClientInfoResponse,
  scope: string,
): "same" | "other" | undefined {
  if (!cache || cache.scope === scope) return undefined;
  const previousOwner = cache.clientInfo?.ownerId;
  if (!previousOwner || !response.clientId) return undefined;
  return previousOwner === getClientFingerprint(response.clientId) ? "same" : "other";
}

/**
 * Called after `purgeOwnerData`, so every open view drops the previous person's data it holds in memory (e.g. the
 * budgets, or the saved statistics filters) instead of showing it, or writing it back.
 */
export const purgeListeners = new Set<() => void>();

/** Removes the stored statements and the other data of the previous person (see `PERSONAL_STORAGE_KEYS`). */
export async function purgeOwnerData() {
  await removeStatements();
  await Promise.all(PERSONAL_STORAGE_KEYS.map((key) => LocalStorage.removeItem(key)));
  purgeListeners.forEach((listener) => listener());
}
