import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";

import {
  addFavorite,
  clearHistory,
  deleteHistoryItem,
  moveFavorite,
  removeFavorite,
  upsertHistory,
} from "./rule-lists";
import type {
  FavoriteItem,
  FavoriteMoveDirection,
  HistoryItem,
} from "../types";

const HISTORY_KEY = "history-rules";
const FAVORITES_KEY = "favorite-rules";

function parseJsonArray<T>(value: string | undefined): T[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

async function readHistory(): Promise<HistoryItem[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  return parseJsonArray<HistoryItem>(raw).sort(
    (left, right) => right.createdAt - left.createdAt,
  );
}

async function writeHistory(items: HistoryItem[]): Promise<void> {
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

async function readFavorites(): Promise<FavoriteItem[]> {
  const raw = await LocalStorage.getItem<string>(FAVORITES_KEY);
  return parseJsonArray<FavoriteItem>(raw).sort(
    (left, right) => left.order - right.order,
  );
}

async function writeFavorites(items: FavoriteItem[]): Promise<void> {
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
}

export async function listHistory(): Promise<HistoryItem[]> {
  return readHistory();
}

export async function listFavorites(): Promise<FavoriteItem[]> {
  return readFavorites();
}

export async function recordHistoryAttempt(
  rawInput: string,
  historyLimit: number,
): Promise<HistoryItem[]> {
  const current = await readHistory();
  const next = upsertHistory(
    current,
    rawInput,
    historyLimit,
    () => Date.now(),
    () => randomUUID(),
  );
  await writeHistory(next);
  return next;
}

export async function removeHistoryEntry(id: string): Promise<HistoryItem[]> {
  const current = await readHistory();
  const next = deleteHistoryItem(current, id);
  await writeHistory(next);
  return next;
}

export async function clearHistoryEntries(): Promise<HistoryItem[]> {
  const next = clearHistory();
  await writeHistory(next);
  return next;
}

export async function addFavoriteRule(
  rawInput: string,
): Promise<FavoriteItem[]> {
  const current = await readFavorites();
  const next = addFavorite(
    current,
    rawInput,
    () => Date.now(),
    () => randomUUID(),
  );
  await writeFavorites(next);
  return next;
}

export async function removeFavoriteRuleById(
  id: string,
): Promise<FavoriteItem[]> {
  const current = await readFavorites();
  const next = removeFavorite(current, id);
  await writeFavorites(next);
  return next;
}

export async function removeFavoriteRuleByRawInput(
  rawInput: string,
): Promise<FavoriteItem[]> {
  const current = await readFavorites();
  const target = current.find((item) => item.rawInput === rawInput);
  if (!target) {
    return current;
  }
  const next = removeFavorite(current, target.id);
  await writeFavorites(next);
  return next;
}

export async function moveFavoriteRule(
  id: string,
  direction: FavoriteMoveDirection,
): Promise<FavoriteItem[]> {
  const current = await readFavorites();
  const next = moveFavorite(current, id, direction);
  await writeFavorites(next);
  return next;
}
