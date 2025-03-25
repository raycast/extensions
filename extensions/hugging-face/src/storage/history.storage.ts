import { getPreferenceValues, LocalStorage } from "@raycast/api";
import dedupe from "dedupe";
import { EntityType, Preferences } from "../interfaces";

const LOCAL_STORAGE_KEY_MODEL = "huggingface-history-model";
const LOCAL_STORAGE_KEY_DATASET = "huggingface-history-dataset";

export interface HistoryItem {
  term: string;
  type: EntityType;
  description?: string;
}

export const getHistory = async (type: EntityType): Promise<HistoryItem[]> => {
  const { historyCount }: Preferences = getPreferenceValues();
  const historyFromStorage = await LocalStorage.getItem<string>(
    type === EntityType.Model ? LOCAL_STORAGE_KEY_MODEL : LOCAL_STORAGE_KEY_DATASET,
  );
  const history: HistoryItem[] = JSON.parse(historyFromStorage ?? "[]");
  const historyWithoutDuplicates = dedupe(history);

  if (historyWithoutDuplicates.length > Number(historyCount)) {
    historyWithoutDuplicates.length = Number(historyCount);
  }

  return historyWithoutDuplicates;
};

export const addToHistory = async (item: HistoryItem) => {
  const { historyCount }: Preferences = getPreferenceValues();
  const history = await getHistory(item.type);
  const historyWithNewItem = [item, ...history];
  const updatedHistoryList = [...new Set(historyWithNewItem)];

  if (updatedHistoryList.length > Number(historyCount)) {
    updatedHistoryList.length = Number(historyCount);
  }

  await LocalStorage.setItem(
    item.type === EntityType.Model ? LOCAL_STORAGE_KEY_MODEL : LOCAL_STORAGE_KEY_DATASET,
    JSON.stringify(updatedHistoryList),
  );
  return await getHistory(item.type);
};

const removeMatchingItemFromArray = (arr: HistoryItem[], item: HistoryItem): HistoryItem[] => {
  let i = 0;
  while (i < arr.length) {
    if (arr[i].term === item.term && arr[i].type === item.type) {
      arr.splice(i, 1);
    } else {
      ++i;
    }
  }
  return arr;
};

export const removeItemFromHistory = async (item: HistoryItem) => {
  const history = await getHistory(item.type);
  const updatedHistoryList = removeMatchingItemFromArray(history, item);
  await LocalStorage.setItem(
    item.type === EntityType.Model ? LOCAL_STORAGE_KEY_MODEL : LOCAL_STORAGE_KEY_DATASET,
    JSON.stringify(updatedHistoryList),
  );
  return await getHistory(item.type);
};

export const removeAllItemsFromHistory = async (type: EntityType) => {
  await LocalStorage.setItem(
    type === EntityType.Model ? LOCAL_STORAGE_KEY_MODEL : LOCAL_STORAGE_KEY_DATASET,
    JSON.stringify([]),
  );
  return await getHistory(type);
};
