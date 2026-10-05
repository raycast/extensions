import { LocalStorage } from "@raycast/api";

const PREV_SOURCE_KEY = "previous-input-source";

const VALUE_TO_NAME: Record<number, string> = {
  1: "VGA-1",
  2: "VGA-2",
  3: "DVI-1",
  4: "DVI-2",
  15: "DisplayPort 1",
  16: "DisplayPort 2",
  17: "HDMI 1",
  18: "HDMI 2",
  19: "HDMI 3 / Alt DP 2",
  27: "USB-C",
};

export function getSourceName(value: number): string {
  return VALUE_TO_NAME[value] ?? `Input ${value}`;
}

export function getSource(value: number): { value: number; name: string } {
  return { value, name: getSourceName(value) };
}

export async function getPreviousSource(): Promise<number | null> {
  const val = await LocalStorage.getItem<string>(PREV_SOURCE_KEY);
  return val ? parseInt(val, 10) : null;
}

export async function setPreviousSource(value: number): Promise<void> {
  await LocalStorage.setItem(PREV_SOURCE_KEY, String(value));
}
