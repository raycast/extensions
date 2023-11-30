import { gmail as gmailclient, auth, gmail_v1 } from "@googleapis/gmail";
import { authorize, client, OAuthClientId } from "./oauth";
import { GaxiosResponse } from "googleapis-common";

let profile: GaxiosResponse<gmail_v1.Schema$Profile>;

export async function getAuthorizedGmailClient() {
  await authorize();
  const t = await client.getTokens();

  const oAuth2Client = new auth.OAuth2(OAuthClientId());
  oAuth2Client.setCredentials({
    access_token: t?.accessToken,
    refresh_token: t?.refreshToken,
    id_token: t?.idToken,
    scope: t?.scope,
    expiry_date: t?.expiresIn,
  });
  const gm = gmailclient({ version: "v1", auth: oAuth2Client });
  return gm;
}

export interface GMailMessage {
  id?: string | null;
  threadId?: string | null;
}

export async function getGMailCurrentProfile(gmail: gmail_v1.Gmail) {
  if (!profile) {
    profile = await gmail.users.getProfile({ userId: "me" });
  }
  return profile.data;
}

export async function getGMailLabels(gmail: gmail_v1.Gmail) {
  const res = await gmail.users.labels.list({
    userId: "me",
  });
  return res.data.labels;
}

export async function getGMailMessageIds(
  gmail: gmail_v1.Gmail,
  query?: string,
): Promise<GaxiosResponse<gmail_v1.Schema$ListMessagesResponse> | undefined> {
  const messages = await gmail.users.messages.list({ userId: "me", q: query, maxResults: 50 });
  return messages;
}

export async function getGMailMessages(gmail: gmail_v1.Gmail, query?: string) {
  const messages = await getGMailMessageIds(gmail, query);
  const ids = messages?.data?.messages?.map((m) => m.id as string).filter((m) => m);
  const details = await getMailDetails(gmail, ids);
  return details;
}

export function getGMailMessageHeaderValue(msg: gmail_v1.Schema$Message | undefined, name: string) {
  if (!msg) {
    return undefined;
  }
  const d = msg.payload?.headers?.find((h) => h.name === name);
  return d?.value;
}

export function gmailWebUrlBase(currentProfile: gmail_v1.Schema$Profile | undefined) {
  const address = currentProfile?.emailAddress;
  return address ? `https://mail.google.com/mail/u/${address}` : undefined;
}

export function inlineNewMailWebUrl(currentProfile: gmail_v1.Schema$Profile) {
  const prefix = gmailWebUrlBase(currentProfile);
  return prefix ? `${prefix}/#compose` : undefined;
}

export function fullscreenNewMailWebUrl(
  currentProfile: gmail_v1.Schema$Profile,
  options?: {
    to?: string;
    cc?: string;
    bcc?: string;
    subject?: string;
    body?: string;
  },
) {
  const prefix = gmailWebUrlBase(currentProfile);
  const params: Record<string, string> = {
    view: "cm",
    fs: "1",
  };
  if (options?.to) {
    params.to = options.to;
  }
  if (options?.cc) {
    params.cc = options.cc;
  }
  if (options?.bcc) {
    params.bcc = options.bcc;
  }
  if (options?.subject) {
    params.su = options.subject;
  }
  if (options?.body) {
    params.body = options.body;
  }
  const encodedParams = Object.entries(params)
    .map(([k, v]) => encodeURI(`${k}=${v}`))
    .join("&");
  return prefix ? `${prefix}/?${encodedParams}` : undefined;
}

export function messageDraftEditUrl(
  currentProfile: gmail_v1.Schema$Profile | undefined,
  message: gmail_v1.Schema$Message,
) {
  const prefix = gmailWebUrlBase(currentProfile);
  return prefix ? `${prefix}/#drafts?compose=${message.id}` : undefined;
}

export function messageThreadUrl(
  currentProfile: gmail_v1.Schema$Profile | undefined,
  message: gmail_v1.Schema$Message,
) {
  const prefix = gmailWebUrlBase(currentProfile);
  return prefix ? `${prefix}/#inbox/${message.threadId}` : undefined;
}

export async function getMailDetail(gmail: gmail_v1.Gmail, id: string) {
  const detail = await gmail.users.messages.get({ userId: "me", id: id, format: "full" });
  return detail;
}

export async function getMailDetails(gmail: gmail_v1.Gmail, ids: string[] | undefined | null) {
  if (!ids) {
    return;
  }
  const result = await Promise.all(ids.map((id) => getMailDetail(gmail, id)));
  return result;
}

export function generateQuery(options?: { baseQuery?: string[]; userQuery?: string }) {
  const parts: string[] = [];
  if (options?.baseQuery && options.baseQuery.length > 0) {
    parts.push(options.baseQuery.join(" "));
  }
  if (options?.userQuery && options.userQuery.length > 0) {
    parts.push(options.userQuery.trim());
  }
  return parts.join(" ");
}

export async function markMessageAsArchived(message: gmail_v1.Schema$Message) {
  const gmail = await getAuthorizedGmailClient();
  await gmail.users.messages.modify({
    userId: "me",
    id: message.id || "",
    requestBody: { removeLabelIds: ["INBOX"] },
  });
}

export async function markMessageAsRead(message: gmail_v1.Schema$Message) {
  const gmail = await getAuthorizedGmailClient();
  await gmail.users.messages.modify({
    userId: "me",
    id: message.id || "",
    requestBody: { removeLabelIds: ["UNREAD"] },
  });
}

export async function markMessagesAsRead(messages: gmail_v1.Schema$Message[]) {
  const gmail = await getAuthorizedGmailClient();
  const ids = messages.map((m) => m.id as string).filter((m) => m);
  await gmail.users.messages.batchModify({
    userId: "me",
    requestBody: { ids, removeLabelIds: ["UNREAD"] },
  });
}

export async function markMessageAsUnread(message: gmail_v1.Schema$Message) {
  const gmail = await getAuthorizedGmailClient();
  await gmail.users.messages.modify({
    userId: "me",
    id: message.id || "",
    requestBody: { addLabelIds: ["UNREAD"] },
  });
}

export async function markMessagesAsUnread(messages: gmail_v1.Schema$Message[]) {
  const gmail = await getAuthorizedGmailClient();
  const ids = messages.map((m) => m.id as string).filter((m) => m);
  await gmail.users.messages.batchModify({
    userId: "me",
    requestBody: { ids, addLabelIds: ["UNREAD"] },
  });
}

export async function moveMessageToTrash(message: gmail_v1.Schema$Message) {
  if (message.id === undefined) {
    return;
  }
  const gmail = await getAuthorizedGmailClient();
  await gmail.users.messages.trash({ userId: "me", id: message.id || "" });
}

export async function moveMessagesToTrash(messages: gmail_v1.Schema$Message[]) {
  const gmail = await getAuthorizedGmailClient();
  const ids = messages.map((m) => m.id as string).filter((m) => m);
  await gmail.users.messages.batchModify({
    userId: "me",
    requestBody: { ids, removeLabelIds: ["INBOX"], addLabelIds: ["TRASH"] },
  });
}
