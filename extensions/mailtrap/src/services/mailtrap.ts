import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { GlobalPreferences } from "../models/global-preferences";

export type Inbox = {
  id: number;
  name: string;
  status: string;
  emails_count: number;
  emails_unread_count: number;
};

export type Email = {
  id: number;
  inbox_id: number;
  subject: string;
  sent_at: string;
  is_read: boolean;
  created_at: string;
  html_path: string;
  txt_path: string;
  raw_path: string;
  to_email: string;
};

export function getInboxes() {
  const globalPreferences = getPreferenceValues<GlobalPreferences>();

  return useFetch<Inbox[]>(`https://mailtrap.io/api/accounts/${globalPreferences.accountId}/inboxes`, {
    headers: [["Api-Token", globalPreferences.apiKey]],
  });
}

export function getEmails(inboxId: number) {
  const globalPreferences = getPreferenceValues<GlobalPreferences>();

  return useFetch<Email[]>(
    `https://mailtrap.io/api/accounts/${globalPreferences.accountId}}/inboxes/${inboxId}/messages`,
    {
      headers: [["Api-Token", globalPreferences.apiKey]],
    }
  );
}

export function markAsRead(inboxId: number, emailId: number) {
  const globalPreferences = getPreferenceValues<GlobalPreferences>();

  fetch(`https://mailtrap.io/api/accounts/${globalPreferences.accountId}}/inboxes/${inboxId}}/messages/${emailId}`, {
    method: "PATCH",
    headers: [
      ["Api-Token", globalPreferences.apiKey],
      ["Content-Type", "application/json"],
    ],
    body: JSON.stringify({
      message: {
        is_read: true,
      },
    }),
  }).then();
}
