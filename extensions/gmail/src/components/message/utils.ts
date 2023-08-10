import { gmail_v1 } from "@googleapis/gmail";

export function getAddressParts(text: string | undefined | null):
  | {
      name: string | undefined;
      email: string | undefined;
    }
  | undefined {
  if (!text) {
    return undefined;
  }
  const mailStart = text.indexOf("<");
  const mailEnd = text.lastIndexOf(">");
  if (mailStart >= 0 && mailEnd >= 0 && mailEnd > mailStart) {
    let name = text
      .substring(0, mailStart - 1)
      .trim()
      .replaceAll('"', "");
    const email = text
      .substring(mailStart + 1, mailEnd)
      .trim()
      .replaceAll('"', "");
    if (!name || name.length <= 0) {
      name = email;
    }
    return { name, email };
  } else {
    if (text.includes("@")) {
      return { name: undefined, email: text.trim() };
    } else {
      return { name: text.trim(), email: undefined };
    }
  }
}

export function isMailUnread(message: gmail_v1.Schema$Message) {
  return message?.labelIds ? message.labelIds.includes("UNREAD") : false;
}

export function isMailDraft(message: gmail_v1.Schema$Message) {
  return message?.labelIds ? message.labelIds.includes("DRAFT") : false;
}

export function getMessageInternalDate(message: gmail_v1.Schema$Message) {
  return message.internalDate ? new Date(parseInt(message.internalDate)) : undefined;
}

export function getMessageFileAttachmentNames(message: gmail_v1.Schema$Message) {
  const fileParts = message.payload?.parts?.filter((p) => p.filename && p.filename.length > 0);
  return fileParts?.map((p) => p.filename as string);
}

export function getLabelDetailsFromIds(
  labelIds: string[] | null | undefined,
  labelsAll: gmail_v1.Schema$Label[] | undefined,
) {
  const labels =
    labelsAll && labelIds
      ? (labelIds.map((lid) => labelsAll.find((l) => l.id === lid)).filter((l) => l) as gmail_v1.Schema$Label[])
      : undefined;
  return labels;
}

const standardLabels: Record<string, string> = {
  INBOX: "Inbox",
  SENT: "Sent",
  CHAT: "Chat",
  IMPORTANT: "Important",
  TRASH: "Trash",
  DRAFT: "Draft",
  SPAM: "Spam",
  CATEGORY_FORUMS: "Forums",
  CATEGORY_UPDATES: "Updates",
  CATEGORY_PERSONAL: "Personal",
  CATEGORY_PROMOTIONS: "Promotions",
  CATEGORY_SOCIAL: "Social",
  STARRED: "Starred",
  UNREAD: "Unread",
};

export function getLabelName(label: gmail_v1.Schema$Label) {
  if (!label.name || label.id !== label.name) {
    return label.name;
  }
  const sn = standardLabels[label.name];
  if (!sn || sn.length <= 0) {
    return label.name;
  }
  return sn;
}
