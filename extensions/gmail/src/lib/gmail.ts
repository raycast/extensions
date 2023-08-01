import { gmail as gmailclient, auth, gmail_v1 } from "@googleapis/gmail";
import { authorize, client, OAuthClientId } from "./oauth";
import { GaxiosResponse } from "googleapis-common";

let profile: GaxiosResponse<gmail_v1.Schema$Profile>;

export async function getGmailClient() {
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
  getGMailAddress(gm); // prefetch profile
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
