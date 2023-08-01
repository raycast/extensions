import { gmail_v1 } from "@googleapis/gmail";

export function getAddressParts(text: string | undefined | null) {
  if (!text) {
    return undefined;
  }
  const regex = /([^<]+)<([^>]+)>/;

  const match = text.match(regex);

  if (match) {
    const name = match[1].trim().replaceAll('"', "");
    const email = match[2].trim().replaceAll('"', "");
    return { name, email };
  } else {
    return undefined;
  }
}

export function isMailUnread(message: gmail_v1.Schema$Message) {
  return message?.labelIds ? message.labelIds.includes("UNREAD") : false;
}

export function isMailDraft(message: gmail_v1.Schema$Message) {
  return message?.labelIds ? message.labelIds.includes("DRAFT") : false;
}
