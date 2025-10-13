import { confirmAlert, LocalStorage, showToast, Toast } from "@raycast/api";
import { Entry } from "../types";

export async function getSavedItems(): Promise<Entry[]> {
  return JSON.parse((await LocalStorage.getItem("regexOptions")) ?? JSON.stringify([]));
}

export async function setSavedItems(options: Entry[] | undefined) {
  if (!options) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No options",
      message: "Nothing was saved",
    });
    return;
  }
  return LocalStorage.setItem("regexOptions", JSON.stringify(options));
}

export async function moveItem(fromIndex: number, toIndex: number, callbackFn?: () => void) {
  const savedItems = await getSavedItems();
  const len = savedItems.length;
  if (len === 0 || fromIndex === toIndex) return;
  if (fromIndex < 0 || fromIndex >= len || toIndex < 0 || toIndex >= len) return;

  const updatedEntries = savedItems.slice();
  const [movedItem] = updatedEntries.splice(fromIndex, 1);
  if (movedItem === undefined) return;
  updatedEntries.splice(toIndex, 0, movedItem);

  await setSavedItems(updatedEntries);
  callbackFn?.();
}

export async function deleteSavedItem(item: Entry) {
  if (
    await confirmAlert({
      title: "Really delete the item?",
      message: `You are about to delete the option ${item.title}.`,
    })
  ) {
    const savedItems = await getSavedItems();
    setSavedItems(savedItems.filter((e) => e.id !== item.id));
  } else {
    console.log("canceled");
  }
}

export async function updateSavedItemDate(item: Entry) {
  const savedItems = await getSavedItems();

  const updatedItems = savedItems.map((e) => (e.id === item.id ? { ...e, lastUsed: new Date() } : e));

  setSavedItems(updatedItems);
}
