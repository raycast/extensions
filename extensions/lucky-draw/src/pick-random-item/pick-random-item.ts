import type { PickRandomItemOptions } from "./types";

export function sanitizeItem(value: string): string {
  return value.trim();
}

export function removeItemAtIndex(items: string[], index: number): string[] {
  return items.filter((_, currentIndex) => currentIndex !== index);
}

export default function pickRandomItem({ items }: PickRandomItemOptions) {
  return items[Math.floor(Math.random() * items.length)];
}
