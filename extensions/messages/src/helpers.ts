import { Icon, Image, Color } from "@raycast/api";
import { getAvatarIcon, runAppleScript } from "@raycast/utils";
import { CountryCode, parsePhoneNumber } from "libphonenumber-js";

import { Message } from "./hooks/useMessages";

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
  service_name: Message["service"];
  group_name?: string | null;
}): Promise<string> {
  const wasMessagesRunning = await isMessagesAppRunning();

  if (address.startsWith("chat") && !group_name) {
    throw new Error("Can't send message to a group chat without a name.");
  }

  const script = group_name
    ? `
    tell application "Messages"
      try
        set targetChat to chat "${group_name}"
        send "${text}" to targetChat
        return "Success"
      on error errMsg
        return "Error: " & errMsg
      end try
    end tell
    `
    : `
    tell application "Messages"
      try
        set targetService to (service 1 whose service type = ${service_name === "iMessage" ? "iMessage" : "SMS"})
        set targetBuddy to participant "${address}" of targetService
        send "${text}" to targetBuddy
        return "Success"
      on error errMsg
        return "Error: " & errMsg
      end try
    end tell
    `;

  const result = await runAppleScript(script);

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

export type ChatParticipant = {
  chat_identifier: string;
  group_name: string | null;
  display_name: string | null;
  group_participants: string | null;
  is_group: boolean;
};

export function getMessagesUrl(chat: ChatParticipant, body?: string): string {
  const addresses = chat.is_group ? chat.group_participants : chat.chat_identifier;
  const encodedBody = body ? `&body=${encodeURIComponent(body)}` : "";
  return `sms://open?addresses=${addresses}${encodedBody}`;
}

export function fuzzySearch(text: string, searchTerms: string[]): boolean {
  const lowerText = text.toLowerCase();
  let textIndex = 0;
  let termIndex = 0;

  while (textIndex < lowerText.length && termIndex < searchTerms.length) {
    if (lowerText[textIndex] === searchTerms[termIndex][0]) {
      let matchLength = 1;
      while (
        matchLength < searchTerms[termIndex].length &&
        textIndex + matchLength < lowerText.length &&
        lowerText[textIndex + matchLength] === searchTerms[termIndex][matchLength]
      ) {
        matchLength++;
      }
      if (matchLength === searchTerms[termIndex].length) {
        termIndex++;
      }
    }
    textIndex++;
  }

  return termIndex === searchTerms.length;
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

export function extractOTP(text: string): string | null {
  const otpRegex = /\b\d{4,}\b/;
  const match = text.match(otpRegex);
  return match ? match[0] : null;
}

export type Contact = {
  id: string;
  givenName: string;
  familyName: string;
  phoneNumbers: { number: string; countryCode: string | null }[];
  emailAddresses: string[];
  imageData?: string;
};

export type ChatOrMessageInfo = {
  chat_identifier: string;
  is_from_me?: boolean;
  is_group: boolean;
  display_name?: string | null;
  group_participants?: string | null;
};

export function createContactMap(contacts: Contact[]): Map<string, Contact> {
  const contactMap = new Map<string, Contact>();

  contacts.forEach((contact) => {
    contact.phoneNumbers.forEach(({ number, countryCode }) => {
      try {
        const parsedNumber = parsePhoneNumber(number, countryCode?.toUpperCase() as CountryCode);
        if (parsedNumber) {
          contactMap.set(parsedNumber.format("E.164"), contact);
        }
      } catch (error) {
        console.error(`Error parsing phone number ${number}:`, error);
      }
    });
  });

  return contactMap;
}

export function getContactOrGroupInfo(
  info: ChatOrMessageInfo,
  contactMap: Map<string, Contact>,
): { displayName: string; avatar: Image.ImageLike; phoneNumber?: string } {
  if (info.is_group) {
    const avatar: Image.ImageLike = Icon.AddPerson;
    let displayName = info.display_name || "Group Chat";

    if (!info.display_name && info.group_participants) {
      const participants = info.group_participants.split(",");
      displayName = participants
        .map((p) => {
          const contact = contactMap.get(p.trim());
          return contact ? `${contact.givenName} ${contact.familyName}`.trim() : p.trim();
        })
        .join(", ");
    }

    return { displayName, avatar };
  }

  const contact = contactMap.get(info.chat_identifier);
  if (contact) {
    const displayName = `${contact.givenName} ${contact.familyName}`.trim() || info.chat_identifier;

    if (info.is_from_me) {
      return { displayName, avatar: { source: Icon.Reply, tintColor: Color.SecondaryText } };
    }

    const avatar = contact.imageData
      ? { source: `data:image/png;base64,${contact.imageData}`, mask: Image.Mask.Circle }
      : getAvatarIcon(displayName);

    return { displayName, avatar, phoneNumber: contact.phoneNumbers[0].number };
  }

  return {
    displayName: info.chat_identifier,
    avatar: Icon.Person,
  };
}
