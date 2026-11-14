import type { HistoryItem } from "./types";

export function normalizeGroup(name: string) {
  return name
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join("/");
}

export function formatGroup(group: string) {
  return group.split("/").join(" / ");
}

export function isInGroup(itemGroup: string | undefined, group: string) {
  return itemGroup === group || Boolean(itemGroup?.startsWith(`${group}/`));
}

export function getGroups(history: HistoryItem[]) {
  const groups = new Set(history.flatMap((item) => (item.group ? [item.group] : [])));
  return [...groups].sort(compareGroups);
}

function compareGroups(a: string, b: string) {
  const aParts = a.split("/");
  const bParts = b.split("/");
  for (let index = 0; index < Math.min(aParts.length, bParts.length); index++) {
    const order = aParts[index].localeCompare(bParts[index]);
    if (order !== 0) {
      return order;
    }
  }
  return aParts.length - bParts.length;
}

export function renameGroup(history: HistoryItem[], from: string, to: string) {
  return history.map((item) =>
    isInGroup(item.group, from) ? { ...item, group: `${to}${item.group!.slice(from.length)}` } : item,
  );
}

export function isRenameTaken(groups: string[], from: string, to: string) {
  const otherGroups = groups.filter((group) => !isInGroup(group, from));
  return groups
    .filter((group) => isInGroup(group, from))
    .some((group) => otherGroups.includes(`${to}${group.slice(from.length)}`));
}

export function deleteGroup(history: HistoryItem[], group: string) {
  return history.map((item) => (isInGroup(item.group, group) ? { ...item, group: undefined } : item));
}
