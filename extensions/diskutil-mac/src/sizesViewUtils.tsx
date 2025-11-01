import { LocalStorage } from "@raycast/api";

export enum SizesView {
  Full = "Full",
  Used = "Used",
  Free = "Free",
  UsedFree = "UsedFree",
}

export const cycleSizesView = (current: SizesView): SizesView => {
  const values = Object.values(SizesView);
  const idx = values.indexOf(current);
  return values[(idx + 1) % values.length];
};

export const loadSizesView = async (): Promise<SizesView> => {
  const stored = (await LocalStorage.getItem("sizesView")) as SizesView | null;
  return stored && Object.values(SizesView).includes(stored) ? stored : SizesView.Full;
};

export const saveSizesView = (view: SizesView) => LocalStorage.setItem("sizesView", view);
