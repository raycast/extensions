import { readJson, updateJson } from "@/core/fs/storage";

const STORAGE_KEY = "collection-pins";

function parsePins(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
}

const noPins = (): string[] => [];

function updatePins(update: (current: string[]) => string[] | null): Promise<string[]> {
  return updateJson(STORAGE_KEY, parsePins, noPins, update);
}

// 读取被 Pin 的 collection id 列表。
export function getPinnedCollections(): Promise<string[]> {
  return readJson(STORAGE_KEY, parsePins, noPins);
}

// 切换某 collection 的 Pin 状态，返回更新后的列表。
export function togglePinnedCollection(id: string): Promise<string[]> {
  return updatePins((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
}

// 从置顶列表移除某 collection（合集被删时清理），返回更新后的列表。
export function removePinnedCollection(id: string): Promise<string[]> {
  return updatePins((current) => (current.includes(id) ? current.filter((x) => x !== id) : null));
}

// 在置顶列表内上/下移一位（到边界则不动）。
export function movePinnedCollection(id: string, direction: "up" | "down"): Promise<string[]> {
  return updatePins((current) => {
    const index = current.indexOf(id);
    if (index === -1) return null;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= current.length) return null;
    const next = [...current];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
}
