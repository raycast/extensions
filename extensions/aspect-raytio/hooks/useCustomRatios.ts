import { LocalStorage } from "@raycast/api";
import { getMinMax } from "../lib/utils";

interface AspectRatio {
  width: number;
  height: number;
}

export async function useAllCustomRatios() {
  const items = await LocalStorage.allItems<AspectRatio>();
  return Object.entries(items).map(([key, value]) => {
    const [width, height] = value.split(":");
    return { key, width: parseInt(width), height: parseInt(height) };
  });
}

export async function useCreateCustomRatio(a: number, b: number) {
  const allItems = await LocalStorage.allItems<AspectRatio>();
  const totalItems = Object.entries(allItems).length;
  const valueMinMax = getMinMax(a, b);
  await LocalStorage.setItem(`${totalItems + 1}`, `${valueMinMax.max}:${valueMinMax.min}`);
}
