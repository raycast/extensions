import { Alert, confirmAlert } from "@raycast/api";
import type { Transaction } from "../utils/types";

function deleteMessage(transaction: Transaction, mode?: "one" | "tail" | "all"): string {
  const isRecurring = !!transaction.repeat;
  if (!isRecurring) return "Are you sure you want to delete this transaction?";
  if (mode === "one") return "Delete only this occurrence?";
  if (mode === "tail") return "Delete this and all future occurrences?";
  return "Delete ALL occurrences (past and future)?";
}

export async function confirmEntryDeletion(transaction: Transaction, mode?: "one" | "tail" | "all"): Promise<boolean> {
  return confirmAlert({
    title: "Delete Transaction",
    message: deleteMessage(transaction, mode),
    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
  });
}
