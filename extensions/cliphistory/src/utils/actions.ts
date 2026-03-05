import { Alert, confirmAlert, showToast, Toast } from "@raycast/api";
import { ClipboardEntry } from "../interfaces/clipboardEntry.interface";
import { updateStorageHistory } from "./storage";

type THistorySetter = React.Dispatch<React.SetStateAction<ClipboardEntry[]>>;

export async function clearHistory(history: ClipboardEntry[], setHistory: THistorySetter) {
  const confirmed = await confirmAlert({
    title: "Clear History",
    message: "This will delete all non-favorite entries. Are you sure?",
    primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
  });

  if (!confirmed) return;

  const updated = history.filter((item) => item.favorite);
  await updateStorageHistory(updated, setHistory);
  await showToast({ style: Toast.Style.Success, title: "History Cleared" });
}

export async function removeLabel(id: string, history: ClipboardEntry[], setHistory: THistorySetter) {
  const updated = history.map((item) => (item.id === id ? { ...item, label: undefined } : item));
  await updateStorageHistory(updated, setHistory);
}

export async function toggleFavorite(id: string, history: ClipboardEntry[], setHistory: THistorySetter) {
  const updated = history.map((item) => (item.id === id ? { ...item, favorite: !item.favorite } : item));
  await updateStorageHistory(updated, setHistory);
}

export async function deleteEntry(id: string, history: ClipboardEntry[], setHistory: THistorySetter) {
  const updated = history.filter((item) => item.id !== id);
  await updateStorageHistory(updated, setHistory);
}
