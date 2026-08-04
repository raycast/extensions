import { homedir } from "os";

import { Icon, Image, Color } from "@raycast/api";
import { getAvatarIcon, runAppleScript } from "@raycast/utils";

import type { ChatOrMessageInfo, Contact, Message, MessagesTarget } from "./types";

export function buildChatSearchableText(
  chat: { chat_identifier: string; group_participants?: string | null },
  displayName: string,
): string {
  return `${chat.chat_identifier} ${displayName} ${chat.group_participants || ""}`.toLowerCase();
}

export function fuzzySearch(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  let offset = 0;
  return terms.every((term) => {
    const found = lower.indexOf(term, offset);
    if (found < 0) return false;
    offset = found + term.length;
    return true;
  });
}

export function getContactLookupIdentifiers(info: ChatOrMessageInfo): string[] {
  return info.is_group
    ? (info.group_participants
        ?.split(",")
        .map((value) => value.trim())
        .filter(Boolean) ?? [])
    : [info.chat_identifier];
}

export function contactImageSource(imageData: unknown): string | undefined {
  if (typeof imageData !== "string" || !imageData) return;
  if (imageData.startsWith("iVBORw0KGgo")) return `data:image/png;base64,${imageData}`;
  return `data:image/jpeg;base64,${imageData}`;
}

async function isMessagesAppRunning() {
  const result = await runAppleScript(
    `
    tell application "System Events"
      return (count of (every process whose name is "Messages")) > 0
    end tell
    `,
  );
  return result === "true";
}

async function quitMessagesApp() {
  await runAppleScript(
    `
    tell application "Messages"
      quit
    end tell
    `,
  );
}

export async function sendMessage({
  address,
  text,
  service_name,
  group_name,
}: {
  address: string;
  text: string;
  service_name: Message["service"] | "auto";
  group_name?: string | null;
}): Promise<string> {
  if (typeof address !== "string" || !address.trim()) {
    return "Error: Invalid recipient address.";
  }
  const wasMessagesRunning = await isMessagesAppRunning();

  // Escape backslashes first, then double-quotes, to safely embed in AppleScript strings.
  const escapeForAppleScript = (value: string) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const safeText = escapeForAppleScript(text);

  const scripts = group_name
    ? [
        `
    tell application "Messages"
      try
        set targetChat to chat "${escapeForAppleScript(group_name)}"
        send "${safeText}" to targetChat
        return "Success"
      on error errMsg
        return "Error: " & errMsg
      end try
    end tell
    `,
      ]
    : (service_name === "auto" ? (["iMessage", "SMS"] as const) : [service_name]).map(
        (service) => `
    tell application "Messages"
      try
        set targetService to (service 1 whose service type = ${service})
        set targetBuddy to participant "${escapeForAppleScript(address)}" of targetService
        send "${safeText}" to targetBuddy
        return "Success"
      on error errMsg
        return "Error: " & errMsg
      end try
    end tell
    `,
      );

  let result = "Error: Could not find a Messages service for this recipient.";
  for (const script of scripts) {
    result = await runAppleScript(script);
    if (result === "Success") break;
  }

  if (result === "Success" && !wasMessagesRunning) {
    await quitMessagesApp();
  }

  return result;
}

export function decodeHexString(hexString: string): string {
  const START_PATTERN: number[] = [0x01, 0x2b];
  const END_PATTERN: number[] = [0x86, 0x84];

  // Convert hex string to byte array
  const bytes = hexString.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [];

  // Find the start index and remove the start pattern
  let startIndex = -1;
  for (let i = 0; i < bytes.length - 1; i++) {
    if (bytes[i] === START_PATTERN[0] && bytes[i + 1] === START_PATTERN[1]) {
      startIndex = i + 2;
      break;
    }
  }

  if (startIndex === -1) {
    return "";
  }

  // Find the end index and truncate the array
  let endIndex = -1;
  for (let i = startIndex; i < bytes.length - 1; i++) {
    if (bytes[i] === END_PATTERN[0] && bytes[i + 1] === END_PATTERN[1]) {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return "";
  }

  const relevantBytes = bytes.slice(startIndex, endIndex);

  // Convert byte array to string
  let result: string;
  try {
    result = new TextDecoder().decode(new Uint8Array(relevantBytes));
  } catch {
    result = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(relevantBytes));
  }

  // Drop the first character if the string is valid UTF-8
  if (result.charCodeAt(0) < 128) {
    result = result.slice(1);
  } else {
    result = result.slice(3);
  }

  return result;
}

export function getMessagesUrl(chat: MessagesTarget, body?: string): string {
  if (chat.is_group && chat.latest_message_guid && !body) {
    return `sms://open?message-guid=${encodeURIComponent(chat.latest_message_guid)}`;
  }

  const addresses = chat.is_group ? chat.group_participants : chat.chat_identifier;
  const encodedBody = body ? `&body=${encodeURIComponent(body)}` : "";
  return `sms://open?addresses=${addresses}${encodedBody}`;
}

export const attachmentTypeMap = {
  audio: { icon: Icon.Play, text: "Audio", actionTitle: "Play Audio" },
  image: { icon: Icon.Image, text: "Image", actionTitle: "Open Image" },
  video: { icon: Icon.Video, text: "Video", actionTitle: "Play Video" },
  default: { icon: Icon.Document, text: "File", actionTitle: "Open File" },
};

export function getAttachmentType(message: Message) {
  // Special case for iMessage audio messages as the mime type is not defined for them
  if (message.is_audio_message) {
    return attachmentTypeMap.audio;
  }

  if (message.attachment_mime_type) {
    const [type] = message.attachment_mime_type.split("/");
    return attachmentTypeMap[type as keyof typeof attachmentTypeMap] || attachmentTypeMap.default;
  }

  return null;
}

export function buildMessagesQuery({
  filterClause = "",
  spamFilters = "",
  chatIdentifierClause = "",
  beforeClause = "",
  limit = "50",
}: {
  filterClause?: string;
  spamFilters?: string;
  chatIdentifierClause?: string;
  beforeClause?: string;
  limit?: string;
}): string {
  return `
    SELECT
      message.guid,
      strftime('%Y-%m-%dT%H:%M:%fZ', datetime(
        message.date / 1000000000 + strftime('%s', '2001-01-01'),
        'unixepoch'
      )) AS date,
      strftime('%Y-%m-%dT%H:%M:%fZ', datetime(
        message.date_read / 1000000000 + strftime('%s', '2001-01-01'),
        'unixepoch'
      )) AS date_read,
      message.is_from_me,
      message.is_audio_message,
      message.is_sent,
      message.is_read,
      chat.chat_identifier,
      chat.display_name,
      CASE
        WHEN chat.style = 43 AND chat.display_name IS NOT NULL AND chat.display_name != ''
        THEN chat.display_name
        ELSE NULL
      END as group_name,
      message.service,
      hex(message.attributedBody) as body,
      CASE WHEN chat.style = 43 THEN 1 ELSE 0 END as is_group,
      CASE
        WHEN chat.style = 43 THEN GROUP_CONCAT(DISTINCT handle.id)
        ELSE handle.id
      END as group_participants,
      attachment.filename as attachment_filename,
      attachment.transfer_name as attachment_name,
      attachment.mime_type as attachment_mime_type,
      hex(replied.attributedBody) as reply_body
    FROM
      message
      JOIN chat_message_join ON message."ROWID" = chat_message_join.message_id
      JOIN chat ON chat_message_join.chat_id = chat."ROWID"
      LEFT JOIN chat_handle_join ON chat."ROWID" = chat_handle_join.chat_id
      LEFT JOIN handle ON chat_handle_join.handle_id = handle."ROWID"
      LEFT JOIN message_attachment_join ON message."ROWID" = message_attachment_join.message_id
      LEFT JOIN attachment ON message_attachment_join.attachment_id = attachment."ROWID"
      LEFT JOIN message replied ON message.reply_to_guid = replied.guid
    WHERE
      message.attributedBody IS NOT NULL
      AND message.associated_message_type = 0
      ${filterClause}
      ${spamFilters}
      ${chatIdentifierClause}
      ${beforeClause}
    GROUP BY
      message.guid
    ORDER BY
      date DESC
    LIMIT ${limit}
  `;
}

export function extractOTP(text: string): string | null {
  const otpRegex = /\b\d{4,}\b/;
  const match = text.match(otpRegex);
  return match ? match[0] : null;
}

export function getContactOrGroupInfo(
  info: ChatOrMessageInfo,
  contactMap: Map<string, Contact>,
  loadContactPhotos = true,
): { displayName: string; avatar: Image.ImageLike; phoneNumber?: string; contactId?: string } {
  if (info.is_group) {
    const avatar: Image.ImageLike = info.group_photo_path
      ? { source: info.group_photo_path.replace(/^~/, homedir()), mask: Image.Mask.Circle }
      : Icon.AddPerson;
    let displayName = info.display_name || "Group Chat";

    if (!info.display_name && info.group_participants) {
      const participants = info.group_participants.split(",");
      displayName = participants
        .map((p) => {
          const participant = p.trim();
          const contact = contactMap.get(participant) || contactMap.get(participant.toLowerCase());
          return contact ? contact.displayName || `${contact.givenName} ${contact.familyName}`.trim() : p.trim();
        })
        .join(", ");
    }

    return { displayName, avatar };
  }

  const contact = contactMap.get(info.chat_identifier) || contactMap.get(info.chat_identifier.toLowerCase());
  if (contact) {
    const displayName =
      contact.displayName || `${contact.givenName} ${contact.familyName}`.trim() || info.chat_identifier;

    if (info.is_from_me) {
      return {
        displayName,
        avatar: { source: Icon.Reply, tintColor: Color.SecondaryText },
        contactId: contact.id,
      };
    }

    const imageSource = loadContactPhotos ? contactImageSource(contact.imageData) : undefined;
    const avatar = imageSource ? { source: imageSource, mask: Image.Mask.Circle } : getAvatarIcon(displayName);

    return { displayName, avatar, phoneNumber: contact.phoneNumbers[0]?.number, contactId: contact.id };
  }

  return {
    displayName: info.chat_identifier,
    avatar: Icon.Person,
  };
}
