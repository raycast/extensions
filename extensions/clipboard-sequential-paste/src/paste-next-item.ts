import { Clipboard, closeMainWindow, LocalStorage, showToast, Toast } from "@raycast/api";

const STORAGE_LAST_EXECUTION_KEY = "StorageLastExecution";
const STORAGE_ITEM_KEY = "StorageItem";
const STORAGE_LIST_KEY = "StorageList";
const STORAGE_INDEX_KEY = "StorageIndex";
const DEBOUNCE_TIME_MS = 650;

let list: string[] = [];
let index: number = 0;

export default async function Command() {
  const currentTime = Date.now();

  // Check if enough time has passed since the last execution to avoid overwriting the latest clipboard item with what is being currently pasted.
  if (await getDebounce(currentTime)) {
    await closeMainWindow();
    return;
  }

  await LocalStorage.setItem(STORAGE_LAST_EXECUTION_KEY, currentTime.toString());

  const latestClipboardItem = await Clipboard.readText();

  // If clipboard is empty show Toast and return
  if (!latestClipboardItem) {
    await showSuccessToast("Clipboard is empty.");
    await closeMainWindow();
    return;
  }

  await handleClipboardAndStorage(latestClipboardItem);

  await Clipboard.paste(list[index]); // Paste from list

  if (index >= +list.length - 1) {
    await showSuccessToast("Pasted every item from list");
    await clearStorage();
  } else {
    await showSuccessToast(`Pasted item ${+index + 1} of ${list.length}`);
    await LocalStorage.setItem(STORAGE_INDEX_KEY, +index + 1); // Up index
  }

  await closeMainWindow();
}

async function getDebounce(currentTime: number): Promise<boolean> {
  const lastExecutionTimeString = await LocalStorage.getItem<string>(STORAGE_LAST_EXECUTION_KEY);
  const lastExecutionTime = lastExecutionTimeString ? parseInt(lastExecutionTimeString) : 0;

  return lastExecutionTime != undefined && currentTime - lastExecutionTime < DEBOUNCE_TIME_MS;
}

async function handleClipboardAndStorage(latestClipboardItem: string): Promise<void> {
  const clipboardItemFromStorage = await LocalStorage.getItem<string>(STORAGE_ITEM_KEY);

  // Replace clipboard item in local storage if newer and reset index
  if (latestClipboardItem !== clipboardItemFromStorage) {
    // latestClipboardItem is different
    await clearStorage();

    await LocalStorage.setItem(STORAGE_ITEM_KEY, latestClipboardItem);

    list = splitItemIntoList(latestClipboardItem);
    await LocalStorage.setItem(STORAGE_LIST_KEY, JSON.stringify(list));

    await LocalStorage.setItem(STORAGE_INDEX_KEY, +index);
  } else {
    // latestClipboardItem matches
    // Load List
    const listStringFromStorage = (await LocalStorage.getItem<string>(STORAGE_LIST_KEY)) ?? "";
    list = JSON.parse(listStringFromStorage);

    // Load Index
    const indexLoadedFromStorage = (await LocalStorage.getItem<number>(STORAGE_INDEX_KEY)) ?? 0;
    index = indexLoadedFromStorage;
  }
}

function splitItemIntoList(latestClipboardItem: string): Array<string> {
  return latestClipboardItem.split(/\r?\n/);
}

async function clearStorage(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_ITEM_KEY);
  await LocalStorage.removeItem(STORAGE_LIST_KEY);
  await LocalStorage.removeItem(STORAGE_INDEX_KEY);
}

async function showSuccessToast(message: string): Promise<void> {
  await showToast({
    title: message,
    style: Toast.Style.Success,
  });
}
