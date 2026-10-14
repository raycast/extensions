import { LocalStorage } from "@raycast/api";

const KEY = "rows";

export async function getRows(): Promise<number> {
  const value = await LocalStorage.getItem<number>(KEY);
  return typeof value === "number" ? value : 0;
}

export async function setRows(rows: number): Promise<void> {
  await LocalStorage.setItem(KEY, rows);
}
