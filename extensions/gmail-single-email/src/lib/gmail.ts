import { gmail as gmailclient, auth, gmail_v1 } from "@googleapis/gmail";
import { authorize, client, OAuthClientId } from "./oauth";
import { GaxiosResponse } from "googleapis-common";
import { showToast, Toast, open } from "@raycast/api";
import * as fs from "fs/promises"; // Use promises version
import * as os from "os";
import * as path from "path";

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
  const profileResponse = await gmail.users.getProfile({ userId: "me" });
  return profileResponse.data;
}

export async function getGMailMessageIds(
  gmail: gmail_v1.Gmail,
  query?: string,
  maxResults?: number,
): Promise<GaxiosResponse<gmail_v1.Schema$ListMessagesResponse> | undefined> {
  const messages = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: maxResults || 50,
  });
  return messages;
}

export async function getGMailMessages(gmail: gmail_v1.Gmail, query?: string, maxResults?: number) {
  const messages = await getGMailMessageIds(gmail, query, maxResults);
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

export async function markMessageAsUnread(message: gmail_v1.Schema$Message) {
  const gmail = await getAuthorizedGmailClient();
  await gmail.users.messages.modify({
    userId: "me",
    id: message.id || "",
    requestBody: { addLabelIds: ["UNREAD"] },
  });
}

export async function moveMessageToTrash(message: gmail_v1.Schema$Message) {
  if (message.id === undefined) {
    return;
  }
  const gmail = await getAuthorizedGmailClient();
  await gmail.users.messages.trash({ userId: "me", id: message.id || "" });
}

export async function downloadAndOpenAttachment(
  gmail: gmail_v1.Gmail,
  messageId: string,
  attachmentId: string,
  filename: string,
): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading", message: filename });
  // Create a unique temporary file path
  const tempDir = os.tmpdir();
  // Ensure filename is safe for the filesystem
  const safeFilename = filename.replace(/[/?%*:|"<>]/g, "-");
  const tempFilePath = path.join(tempDir, safeFilename);

  try {
    const response = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId: messageId,
      id: attachmentId,
    });

    if (!response.data.data) {
      throw new Error("No attachment data received");
    }

    // Decode base64 data
    const fileBuffer = Buffer.from(response.data.data, "base64");

    // Write the file
    await fs.writeFile(tempFilePath, fileBuffer);

    // Open the file
    await open(tempFilePath);

    toast.style = Toast.Style.Success;
    toast.title = "Attachment Opened";
    toast.message = filename;
  } catch (error: unknown) {
    console.error("Download attachment error:", error);
    toast.style = Toast.Style.Failure;
    toast.title = "Download Failed";
    toast.message = error instanceof Error ? error.message : "Could not download or open attachment";
  } finally {
    // Attempt to clean up the temporary file regardless of success or failure
    try {
      await fs.unlink(tempFilePath);
    } catch (cleanupError) {
      // Log cleanup error, but don't throw, as the primary operation might have succeeded
      console.error(`Failed to clean up temporary file: ${tempFilePath}`, cleanupError);
    }
  }
}
