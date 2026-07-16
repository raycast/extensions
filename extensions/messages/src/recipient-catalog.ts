import type { Image } from "@raycast/api";

import type { Chat } from "./open-chat-list";
import type { Contact, MessagesTarget } from "./types";

const CONTACT_RECIPIENT_PREFIX = "contact:";

type RecipientBase = MessagesTarget & {
  id: string;
  service_name: "iMessage" | "SMS" | "auto";
  group_name: string | null;
  displayName: string;
  avatar?: Image.ImageLike;
  keywords: string[];
};

type RecentRecipient = RecipientBase & {
  kind: "recent";
};

type ContactRecipient = RecipientBase & {
  kind: "contact";
  imageData: string | null;
};

type Recipient = RecentRecipient | ContactRecipient;
export type RecipientSections = { recents: RecentRecipient[]; contacts: ContactRecipient[] };

function normalizeIdentifier(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  const trimmed = value.trim();
  if (trimmed.includes("@")) return `email:${trimmed.toLowerCase()}`;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7) return;
  return `phone:${digits.length > 9 ? digits.slice(-9) : digits}`;
}

function contactIdentifiers(contact: Contact): string[] {
  return [
    ...new Set([
      ...contact.matchedChatIdentifiers,
      ...contact.phoneNumbers.map(({ number }) => number),
      ...contact.emailAddresses,
    ]),
  ];
}

function primaryMessageableIdentifier(contact: Contact): string | undefined {
  return (
    contact.phoneNumbers.find(({ number }) => number.replace(/\D/g, "").length >= 7)?.number ??
    contact.emailAddresses.find((email) => email.includes("@"))
  );
}

function recipientKeywords(recipient: Omit<RecipientBase, "keywords">, addresses: readonly string[] = []): string[] {
  const candidates = [
    recipient.displayName,
    recipient.chat_identifier,
    ...addresses,
    ...(recipient.group_participants?.split(",") ?? []),
  ];

  return [
    ...new Set(candidates.map((keyword) => keyword?.trim()).filter((keyword): keyword is string => Boolean(keyword))),
  ];
}

function recentRecipient(chat: Chat): RecentRecipient {
  const recipient = {
    kind: "recent" as const,
    id: chat.guid,
    chat_identifier: chat.chat_identifier,
    service_name: chat.service_name,
    group_name: chat.group_name,
    group_participants: chat.group_participants,
    latest_message_guid: chat.latest_message_guid,
    is_group: chat.is_group,
    displayName: chat.displayName,
    avatar: chat.avatar,
  };
  return { ...recipient, keywords: recipientKeywords(recipient, chat.phoneNumber ? [chat.phoneNumber] : []) };
}

function contactRecipient(contact: Contact, destination: string, loadContactPhotos: boolean): ContactRecipient {
  const displayName = contact.displayName || `${contact.givenName} ${contact.familyName}`.trim() || destination;
  const recipient = {
    kind: "contact" as const,
    id: `${CONTACT_RECIPIENT_PREFIX}${contact.id}`,
    chat_identifier: destination,
    service_name: destination.includes("@") ? ("iMessage" as const) : ("auto" as const),
    group_name: null,
    group_participants: null,
    latest_message_guid: null,
    is_group: false,
    displayName,
    imageData: loadContactPhotos ? contact.imageData : null,
  };
  return { ...recipient, keywords: recipientKeywords(recipient, contactIdentifiers(contact)) };
}

function compareContacts(left: Contact, right: Contact): number {
  const compare = (leftValue: string, rightValue: string) =>
    leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
  return (
    compare(left.displayName.trim().toLowerCase(), right.displayName.trim().toLowerCase()) ||
    compare(left.id, right.id) ||
    compare(primaryMessageableIdentifier(left) ?? "", primaryMessageableIdentifier(right) ?? "")
  );
}

export function buildRecipientSections(
  chats: readonly Chat[],
  contacts: readonly Contact[],
  loadContactPhotos = true,
): RecipientSections {
  // There's no way to send a message to a group chat that doesn't have any names, so we filter them out.
  const recents = chats.filter((chat) => !chat.is_group || Boolean(chat.group_name)).map(recentRecipient);
  const directChats = chats.filter((chat) => !chat.is_group);
  const seenContactIds = new Set(
    directChats.map(({ contactId }) => contactId).filter((id): id is string => Boolean(id)),
  );
  const seenIdentifiers = new Set(
    directChats
      .map(({ chat_identifier }) => normalizeIdentifier(chat_identifier))
      .filter((identifier): identifier is string => Boolean(identifier)),
  );
  const contactRecipients: ContactRecipient[] = [];

  for (const contact of [...contacts].sort(compareContacts)) {
    const destination = primaryMessageableIdentifier(contact);
    if (!destination) continue;

    const hasSeenContact = seenContactIds.has(contact.id);
    seenContactIds.add(contact.id);
    const identifiers = contactIdentifiers(contact)
      .map(normalizeIdentifier)
      .filter((identifier): identifier is string => Boolean(identifier));
    const hasSeenIdentifier = identifiers.some((identifier) => seenIdentifiers.has(identifier));

    // Claim every ID and address before deciding so duplicate rows collapse transitively.
    identifiers.forEach((identifier) => seenIdentifiers.add(identifier));
    if (hasSeenContact || hasSeenIdentifier) continue;

    contactRecipients.push(contactRecipient(contact, destination, loadContactPhotos));
  }

  return { recents, contacts: contactRecipients };
}

export function recipientTitle(recipient: Recipient): string {
  return recipient.is_group ? recipient.displayName : `${recipient.displayName} — ${recipient.chat_identifier}`;
}
