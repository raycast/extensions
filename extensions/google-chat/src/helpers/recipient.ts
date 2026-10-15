/** Parsing what the user typed as a recipient or thread. Pure: no Raycast imports. */

import type { Person, SpaceItem } from "../api/types";
import { chatUserNameForPerson, personInfo } from "./dm-names";

export type Recipient =
  | { kind: "email"; email: string }
  | { kind: "user"; name: string }
  | { kind: "space"; name: string }
  | { kind: "title"; title: string };

const EMAIL_PATTERN = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/;
const ID = "[A-Za-z0-9_-]+";

/** Whether `value` looks like an email address. */
export function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

/** Extracts the space id from a Google Chat or Gmail Chat link. */
export function spaceIdFromUrl(value: string): string | undefined {
  const patterns = [
    new RegExp(`^https?://chat\\.google\\.com/(?:u/\\d+/)?(?:room|dm|space)/(${ID})`),
    new RegExp(`^https?://mail\\.google\\.com/chat/(?:u/\\d+/)?#chat/(?:space|dm)/(${ID})`),
  ];
  for (const pattern of patterns) {
    const match = value.trim().match(pattern);
    if (match) return match[1];
  }
  return undefined;
}

/**
 * Classifies a recipient: an email, a `users/{id}` name, a space (`spaces/{id}` or a Chat link),
 * or anything else as a space or DM title to look up.
 */
export function parseRecipient(input: string): Recipient {
  const value = input.trim().replace(/^mailto:/i, "");
  if (!value) throw new Error("Recipient is empty");
  if (isEmail(value)) return { kind: "email", email: value.toLowerCase() };
  if (new RegExp(`^users/${ID}$`).test(value)) return { kind: "user", name: value };
  if (new RegExp(`^spaces/${ID}$`).test(value)) return { kind: "space", name: value };
  const fromUrl = spaceIdFromUrl(value);
  if (fromUrl) return { kind: "space", name: `spaces/${fromUrl}` };
  return { kind: "title", title: value.replace(/^[@#]/, "") };
}

/**
 * Turns a thread reference into a thread resource name. Accepts `spaces/{s}/threads/{t}`,
 * a message name `spaces/{s}/messages/{t}.{m}`, or a Chat link `.../room/{s}/{t}`.
 * Returns undefined for empty input; throws for anything unrecognised.
 */
export function parseThread(input: string | undefined): string | undefined {
  const value = input?.trim();
  if (!value) return undefined;
  const threadName = value.match(new RegExp(`^(spaces/${ID}/threads/${ID})$`));
  if (threadName) return threadName[1];
  const messageName = value.match(new RegExp(`^spaces/(${ID})/messages/(${ID})(?:\\.${ID})?$`));
  if (messageName) return `spaces/${messageName[1]}/threads/${messageName[2]}`;
  const link = value.match(new RegExp(`^https?://chat\\.google\\.com/(?:u/\\d+/)?(?:room|dm|space)/(${ID})/(${ID})`));
  if (link) return `spaces/${link[1]}/threads/${link[2]}`;
  throw new Error("Thread must be a Chat thread link or a name like spaces/AAAA/threads/BBBB");
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Spaces and DMs whose title or DM email equals `title` (case-insensitive). */
export function findSpacesByTitle(items: SpaceItem[], title: string): SpaceItem[] {
  const wanted = normalize(title.replace(/^[@#]/, ""));
  return items.filter(
    (item) => normalize(item.title) === wanted || (item.email !== undefined && normalize(item.email) === wanted),
  );
}

/** Space resource name (`spaces/{id}`) for a message or thread name. */
export function spaceNameOf(resourceName: string): string {
  const match = resourceName.match(/^(spaces\/[^/]+)/);
  return match ? match[1] : resourceName;
}

// --- Send Message form: the "To" dropdown -----------------------------------------------------

/** What the "To" dropdown's value stands for: an existing space or DM, or a person by email. */
export type RecipientValue = { kind: "space"; name: string } | { kind: "person"; email: string };

/** Dropdown item value: `space:spaces/AAAA` or `person:someone@example.com`. */
export function encodeRecipient(value: RecipientValue): string {
  return value.kind === "space" ? `space:${value.name}` : `person:${value.email.trim().toLowerCase()}`;
}

/**
 * Reads a dropdown value back. Also accepts a bare `spaces/AAAA` (stored by older versions).
 * Anything else, including an empty value, is undefined.
 */
export function decodeRecipient(value: string | undefined): RecipientValue | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  const space = raw.match(new RegExp(`^(?:space:)?(spaces/${ID})$`));
  if (space) return { kind: "space", name: space[1] };
  if (raw.startsWith("person:")) {
    const email = raw.slice("person:".length).trim().toLowerCase();
    return isEmail(email) ? { kind: "person", email } : undefined;
  }
  return undefined;
}

/** Whether a space or DM matches what was typed in the dropdown (title or DM email, case-insensitive). */
export function matchesSearch(item: Pick<SpaceItem, "title" | "email">, search: string): boolean {
  const needle = normalize(search);
  if (!needle) return true;
  return normalize(item.title).includes(needle) || !!item.email?.toLowerCase().includes(needle);
}

/** Directory people who aren't already listed as one of `dms` (same email or same user id). */
export function peopleNotInDms(people: Person[], dms: Pick<SpaceItem, "email" | "userName">[]): Person[] {
  const emails = new Set(dms.map((dm) => dm.email?.toLowerCase()).filter(Boolean));
  const users = new Set(dms.map((dm) => dm.userName).filter(Boolean));
  return people.filter((person) => {
    const email = personInfo(person).email?.toLowerCase();
    if (email && emails.has(email)) return false;
    return !users.has(chatUserNameForPerson(person.resourceName));
  });
}

/**
 * The email typed in the search box, lowercased, when it's a valid address that none of the
 * listed options already has. Lets the user message anyone by email.
 */
export function typedEmail(search: string, listedEmails: (string | undefined)[]): string | undefined {
  const value = search
    .trim()
    .replace(/^mailto:/i, "")
    .toLowerCase();
  if (!isEmail(value)) return undefined;
  return listedEmails.some((email) => email?.toLowerCase() === value) ? undefined : value;
}
