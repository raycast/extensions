import { gmail as gmailclient, auth, gmail_v1 } from "@googleapis/gmail";
import { authorize, client, OAuthClientId } from "./oauth";
import { GaxiosResponse } from "googleapis-common";

let profile: GaxiosResponse<gmail_v1.Schema$Profile>;

export async function getGmailClient(options?: { ensureProfile?: boolean }) {
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
  if (options?.ensureProfile === true) {
    await getGMailAddress(gm);
  } else {
    getGMailAddress(gm); // prefetch profile
  }
  return gm;
}

export interface GMailMessage {
  id?: string | null;
  threadId?: string | null;
}

export async function getGMailAddress(gmail: gmail_v1.Gmail) {
  if (!profile) {
    profile = await gmail.users.getProfile({ userId: "me" });
  }
  return profile;
}

export function currentGMailAddress() {
  return profile?.data?.emailAddress ? profile.data.emailAddress : undefined;
}

export async function getGMailLabels() {
  const gmail = await getGmailClient();
  const res = await gmail.users.labels.list({
    userId: "me",
  });
  return res.data.labels;
}

export async function getGMailMessages(query?: string): Promise<GMailMessage[] | undefined> {
  const gmail = await getGmailClient();
  const messages = await gmail.users.messages.list({ userId: "me", q: query, maxResults: 20 });
  return messages.data.messages?.map((m) => {
    return { id: m.id, threadId: m.threadId };
  });
}

export function getGMailMessageHeaderValue(msg: gmail_v1.Schema$Message | undefined, name: string) {
  if (!msg) {
    return undefined;
  }
  const d = msg.payload?.headers?.find((h) => h.name === name);
  return d?.value;
}

function webUrlPrefix() {
  const address = currentGMailAddress();
  return address ? `https://mail.google.com/mail/u/${address}` : undefined;
}

export function inlineNewMailWebUrl() {
  const prefix = webUrlPrefix();
  return prefix ? `${prefix}/#compose` : undefined;
}

export function fullscreenNewMailWebUrl(options?: {
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
}) {
  const prefix = webUrlPrefix();
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

export async function getMailDetail(id: string) {
  const gmail = await getGmailClient();
  const detail = await gmail.users.messages.get({ userId: "me", id: id, format: "full" });
  return detail;
}

export async function getMailDetails(ids: string[] | undefined | null) {
  if (!ids) {
    return;
  }
  const result = await Promise.all(ids.map((id) => getMailDetail(id)));
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
