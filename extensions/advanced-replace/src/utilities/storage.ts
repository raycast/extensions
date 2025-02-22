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
