import type { Contact } from "./types";

type PersistedContactCatalogEntry = {
  id: string;
  givenName: string;
  familyName: string;
  displayName: string;
  phoneNumbers: { number: string; countryCode: string | null }[];
  emailAddresses: string[];
};

export type PersistedContactCatalog = {
  version: 1;
  updatedAtEpochMs: number;
  contacts: PersistedContactCatalogEntry[];
};

export function emptyPersistedContactCatalog(): PersistedContactCatalog {
  return { version: 1, updatedAtEpochMs: 0, contacts: [] };
}

function contactToCatalogEntry(contact: Contact): PersistedContactCatalogEntry {
  return {
    id: contact.id,
    givenName: contact.givenName,
    familyName: contact.familyName,
    displayName: contact.displayName || `${contact.givenName} ${contact.familyName}`.trim(),
    phoneNumbers: contact.phoneNumbers.map(({ number, countryCode }) => ({ number, countryCode })),
    emailAddresses: contact.emailAddresses.map((email) => email.toLowerCase()),
  };
}

export function contactsToPersistedCatalog(contacts: readonly Contact[]): PersistedContactCatalog {
  return { version: 1, updatedAtEpochMs: Date.now(), contacts: contacts.map(contactToCatalogEntry) };
}

function catalogEntryToContact(entry: PersistedContactCatalogEntry): Contact {
  const emailAddresses = entry.emailAddresses.map((email) => email.toLowerCase());
  const phoneNumbers = entry.phoneNumbers.map(({ number, countryCode }) => ({ number, countryCode }));
  return {
    id: entry.id,
    givenName: entry.givenName,
    familyName: entry.familyName,
    displayName: entry.displayName || `${entry.givenName} ${entry.familyName}`.trim(),
    phoneNumbers,
    emailAddresses,
    matchedChatIdentifiers: [...phoneNumbers.map(({ number }) => number), ...emailAddresses],
    imageData: null,
  };
}

export function persistedCatalogToContacts(catalog: PersistedContactCatalog): Contact[] {
  return catalog.contacts.map(catalogEntryToContact);
}

function isCatalogEntry(value: unknown): value is PersistedContactCatalogEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as PersistedContactCatalogEntry;
  return (
    typeof entry.id === "string" &&
    typeof entry.givenName === "string" &&
    typeof entry.familyName === "string" &&
    typeof entry.displayName === "string" &&
    Array.isArray(entry.phoneNumbers) &&
    Array.isArray(entry.emailAddresses)
  );
}

export function parsePersistedContactCatalog(raw: string | undefined): PersistedContactCatalog | undefined {
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as PersistedContactCatalog;
    if (parsed?.version !== 1 || !Array.isArray(parsed.contacts)) return;
    return {
      version: 1,
      updatedAtEpochMs: typeof parsed.updatedAtEpochMs === "number" ? parsed.updatedAtEpochMs : 0,
      contacts: parsed.contacts.filter(isCatalogEntry).map((entry) => ({
        id: entry.id,
        givenName: entry.givenName,
        familyName: entry.familyName,
        displayName: entry.displayName,
        phoneNumbers: entry.phoneNumbers
          .filter((phone) => phone && typeof phone.number === "string")
          .map((phone) => ({
            number: phone.number,
            countryCode: typeof phone.countryCode === "string" ? phone.countryCode : null,
          })),
        emailAddresses: entry.emailAddresses
          .filter((email): email is string => typeof email === "string")
          .map((email) => email.toLowerCase()),
      })),
    };
  } catch {
    return;
  }
}

export function serializePersistedContactCatalog(catalog: PersistedContactCatalog): string {
  return JSON.stringify(catalog);
}
