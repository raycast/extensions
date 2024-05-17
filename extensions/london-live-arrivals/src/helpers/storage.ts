import { LocalStorage } from "@raycast/api";
import { MatchedStop } from "../models";

export const loadSelectedItems = async (): Promise<MatchedStop[]> => {
  const storedSelectedItems = await LocalStorage.getItem<string>("selectedItems");
  return storedSelectedItems ? JSON.parse(storedSelectedItems) : [];
};

export const saveSelectedItems = (selectedItems: MatchedStop[]): void => {
  LocalStorage.setItem("selectedItems", JSON.stringify(selectedItems));
};