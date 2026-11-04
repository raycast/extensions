import type { people_v1 } from "@googleapis/people";

const MAX_MENTIONS = 50;
const URI_PREFIX = "google-calendar://contacts/";
const EMAIL_PATTERN = /^[^\s@<>()[\]",;:]+@[^\s@<>()[\]",;:]+\.[^\s@<>()[\]",;:]+$/;

type Person = Pick<people_v1.Schema$Person, "names" | "emailAddresses" | "photos">;

/** The few contact fields mentions need, small enough to cache. */
export type MentionPerson = { name?: string; emails: string[]; photo?: string };

export function isEmailAddress(value: string) {
  return EMAIL_PATTERN.test(value);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function toMentionPeople(people: readonly Person[]): MentionPerson[] {
  return people.flatMap((person) => {
    const emails = (person.emailAddresses ?? []).flatMap((address) => {
      const email = address.value?.trim();
      return email && isEmailAddress(email) ? [email] : [];
    });
    if (emails.length === 0) return [];
    const name = person.names?.find((entry) => entry.displayName?.trim())?.displayName?.trim();
    const photo = (
      person.photos?.find((entry) => entry.url && !entry.default) ?? person.photos?.find((entry) => entry.url)
    )?.url;
    return [{ ...(name ? { name } : {}), emails, ...(photo ? { photo } : {}) }];
  });
}

export function toContactMentionUri(email: string) {
  return `${URI_PREFIX}${encodeURIComponent(normalizeEmail(email))}`;
}

/**
 * Lists one mention per email address, so people with several addresses can be mentioned by the one that matters,
 * de-duplicated across Google Contacts and Other contacts. A complete email address the user typed comes first when no
 * contact has it, so anyone can be mentioned.
 */
export function toContactMentions(people: readonly MentionPerson[], query: string, fallbackIcon: string) {
  const seen = new Set<string>();
  const mentions: { title: string; uri: string; description: string; icon: string }[] = [];

  for (const person of people) {
    for (const email of person.emails) {
      const key = normalizeEmail(email);
      if (seen.has(key)) continue;
      seen.add(key);
      mentions.push({
        title: person.name ?? email,
        uri: toContactMentionUri(email),
        description: person.name ? email : "Email address",
        icon: person.photo ?? fallbackIcon,
      });
    }
  }

  const typedEmail = query.trim();
  if (isEmailAddress(typedEmail) && !seen.has(normalizeEmail(typedEmail))) {
    mentions.unshift({
      title: typedEmail,
      uri: toContactMentionUri(typedEmail),
      description: "Email address",
      icon: fallbackIcon,
    });
  }

  return mentions.slice(0, MAX_MENTIONS);
}

export function parseContactMentionUri(uri: string) {
  const invalid = new Error("Invalid Google Calendar contact URI.");
  if (!uri.startsWith(URI_PREFIX)) throw invalid;
  let email: string;
  try {
    email = decodeURIComponent(uri.slice(URI_PREFIX.length));
  } catch {
    throw invalid;
  }
  if (!isEmailAddress(email)) throw invalid;
  return normalizeEmail(email);
}

/**
 * Resolves a mentioned email address against the user's contacts when the message is sent, so the name and other
 * addresses are current. An address that is not in the contacts is still a valid mention and is returned on its own.
 */
export async function readContactMention(uri: string, searchPeople: (query: string) => Promise<Person[]>) {
  const email = parseContactMentionUri(uri);
  const person = toMentionPeople(await searchPeople(email)).find((candidate) =>
    candidate.emails.some((address) => normalizeEmail(address) === email),
  );
  const otherEmails = person?.emails.filter((address) => normalizeEmail(address) !== email) ?? [];

  return {
    text: JSON.stringify(
      {
        ...(person?.name ? { name: person.name } : {}),
        email,
        ...(otherEmails.length > 0 ? { otherEmails } : {}),
        inContacts: Boolean(person),
      },
      null,
      2,
    ),
    mimeType: "application/json",
  };
}
