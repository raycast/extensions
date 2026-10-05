import { callWs } from "./moodle";
import { htmlToMarkdown, htmlToText } from "./html";

export interface RawNotification {
  id: number;
  subject: string;
  smallmessage?: string;
  fullmessage?: string;
  fullmessagehtml?: string;
  contexturl?: string | null;
  contexturlname?: string | null;
  timecreated: number;
  read: boolean;
  component?: string;
  eventtype?: string;
}

export interface WebeepNotification {
  id: number;
  subject: string;
  /** Markdown body. */
  message: string;
  preview: string;
  url?: string;
  urlName?: string;
  created: Date;
  read: boolean;
  kind: string;
}

export function toNotification(raw: RawNotification): WebeepNotification {
  const plainBody = raw.fullmessage?.trim() || raw.smallmessage?.trim() || htmlToText(raw.fullmessagehtml ?? "");
  const preview = htmlToText(raw.smallmessage?.trim() || plainBody);
  return {
    id: raw.id,
    subject: htmlToText(raw.subject),
    message: htmlToMarkdown(plainBody.replace(/\n/g, "<br>")),
    preview: preview.slice(0, 120),
    url: raw.contexturl || undefined,
    urlName: raw.contexturlname || undefined,
    created: new Date(raw.timecreated * 1000),
    read: Boolean(raw.read),
    kind: raw.eventtype || raw.component || "notification",
  };
}

export async function fetchNotifications(limit = 40): Promise<{ unread: number; notifications: WebeepNotification[] }> {
  const data = await callWs<{ unreadcount: number; notifications: RawNotification[] }>(
    "message_popup_get_popup_notifications",
    { useridto: 0, limit, offset: 0 },
  );
  return { unread: data.unreadcount, notifications: data.notifications.map(toNotification) };
}

export async function markAllNotificationsRead(): Promise<void> {
  await callWs("core_message_mark_all_notifications_as_read", { useridto: 0 });
}
