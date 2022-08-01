import { List } from "@raycast/api";

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export function ensureMinMax(v1: number, v2: number): [min: number, max: number] {
  if (v1 < v2) {
    return [v1, v2];
  }
  return [v2, v1];
}

export function ensureCleanAccessories(
  accessories: List.Item.Accessory[] | undefined
): List.Item.Accessory[] | undefined {
  if (accessories) {
    if (accessories.length <= 0) {
      return undefined;
    }
    const result: List.Item.Accessory[] = [];
    for (const a of accessories) {
      if (a.icon) {
        result.push(a);
      }
    }
    if (result.length <= 0) {
      return undefined;
    }
    return result;
  }
  return undefined;
}
