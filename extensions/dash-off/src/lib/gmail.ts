// Borrowed from the Gmail Extension
// https://github.com/raycast/extensions/blob/main/extensions/gmail/src/lib/gmail.ts
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

export async function getGMailCurrentProfile(gmail: gmail_v1.Gmail) {
  if (!profile) {
    profile = await gmail.users.getProfile({ userId: "me" });
  }
  return profile.data;
}

export async function sendEmail(subject: string, body: string, toAddress: string, BCCAddresses: string[]) {
  const gmail = await getAuthorizedGmailClient();
  const currentProfile = await getGMailCurrentProfile(gmail);
  const address = currentProfile?.emailAddress;

  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;

  const messageParts = [
    `From: Raycast Dash Off <${address}>`,
    `To: ${toAddress}`,
    `CC: ${BCCAddresses.join(",")}`,
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: ${utf8Subject}`,
    "",
    body,
  ];

  const message = messageParts.join("\n");

  // The body needs to be base64url encoded.
  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
    },
  });

  return res.data;
}
