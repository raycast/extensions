import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

export type Inbox = {
  id: number;
  name: string;
  status: string;
  emails_count: number;
  emails_unread_count: number;
  domain: string;
  pop3_domain: string;
  email_domain: string;
  smtp_ports: number[];
  pop3_ports: number[];
  api_domain: string;
  permissions: {
    can_read: boolean;
    can_update: boolean;
    can_destroy: boolean;
    can_leave: boolean;
  };
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
  blacklists_report_info:
    | {
        result: "success";
        domain: string;
        ip: string;
        report: Array<{
          name: string;
          url: string;
          in_black_list: boolean;
        }>;
      }
    | {
        result: "error";
      };
  human_size: string;
};

const { apiKey, accountId } = getPreferenceValues<Preferences>();
const headers = {
  "Api-Token": apiKey,
  "Content-Type": "application/json",
};

export function getInboxes() {
  return useFetch(`https://mailtrap.io/api/accounts/${accountId}/inboxes`, {
    headers,
    mapResult(result: Inbox[]) {
      return {
        data: result,
      };
    },
    initialData: [],
  });
}

export function getEmails(inboxId: number) {
  return useFetch(
    (options) =>
      `https://mailtrap.io/api/accounts/${accountId}}/inboxes/${inboxId}/messages?` +
      new URLSearchParams({ page: String(options.page + 1) }).toString(),
    {
      headers,
      mapResult(result: Email[]) {
        return {
          data: result,
          hasMore: result.length === 30,
        };
      },
      initialData: [],
    }
  );
}

export function markAsRead(inboxId: number, emailId: number) {
  fetch(`https://mailtrap.io/api/accounts/${accountId}}/inboxes/${inboxId}}/messages/${emailId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      message: {
        is_read: true,
      },
    }),
  }).then();
}
