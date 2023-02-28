import { useFetch } from "@raycast/utils";
import fetch from "node-fetch";
import { extensionPreferences } from "./preferences";
import { CreateDraftValues, Draft, NotificationsResponse } from "./types";

export function useNotifications(kind?: "inbox" | "activity") {
  return useFetch<NotificationsResponse>(
    "https://api.typefully.com/v1/notifications?" + new URLSearchParams(kind ? { kind } : undefined),
    {
      headers: {
        "X-API-KEY": `Bearer ${extensionPreferences.token}`,
        accept: "application/json",
      },
    }
  );
}

export function useScheduledDrafts() {
  return useFetch<Draft[]>("https://api.typefully.com/v1/drafts/recently-scheduled", {
    headers: {
      "X-API-KEY": `Bearer ${extensionPreferences.token}`,
      accept: "application/json",
    },
  });
}

export function usePublishedDrafts() {
  return useFetch<Draft[]>("https://api.typefully.com/v1/drafts/recently-published/", {
    headers: {
      "X-API-KEY": `Bearer ${extensionPreferences.token}`,
      accept: "application/json",
    },
  });
}

export async function createDraft(values: CreateDraftValues) {
  const response = await fetch("https://api.typefully.com/v1/drafts/", {
    method: "POST",
    headers: {
      "X-API-KEY": `Bearer ${extensionPreferences.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: values.content,
      threadify: values.threadify,
      schedule_date:
        values.shareOptions == "schedule"
          ? values.scheduleDate?.toISOString()
          : values.shareOptions == "next-free-slot"
          ? "next-free-slot"
          : undefined,
    }),
  });

  return (await response.json()) as Draft;
}
