import type { Contact } from "./types";

type PersistedContactEntry = { contactId: string; displayName: string };
type PersistedContactPhotoEntry = { imageData: string | null };
export type PersistedContactMap = {
  version: 2;
  updatedAtEpochMs: number;
  byIdentifier: Record<string, PersistedContactEntry>;
  byContactId: Record<string, PersistedContactPhotoEntry>;
};

const MAX_PERSISTED_PHOTO_BASE64_LENGTH = 96 * 1024;

export function emptyPersistedContactMap(): PersistedContactMap {
  return { version: 2, updatedAtEpochMs: 0, byIdentifier: {}, byContactId: {} };
}

function contactIdentifiers(contact: Contact): string[] {
  return [
    ...contact.matchedChatIdentifiers,
    ...contact.phoneNumbers.map(({ number }) => number),
    ...contact.emailAddresses,
  ];
}

export function createContactMap(contacts: Contact[]): Map<string, Contact> {
  const result = new Map<string, Contact>();
  for (const contact of contacts) {
    for (const identifier of new Set(contactIdentifiers(contact))) {
      if (typeof identifier !== "string" || !identifier) continue;
      result.set(identifier, contact);
      if (identifier.includes("@")) result.set(identifier.toLowerCase(), contact);
    }
  }
  return result;
}

export function mergeContactMaps(base: Map<string, Contact>, incoming: Map<string, Contact>): Map<string, Contact> {
  if (!incoming.size) return base;
  const next = new Map(base);
  const existingById = new Map([...base.values()].map((contact) => [contact.id, contact]));
  const mergedById = new Map<string, Contact>();

  for (const contact of new Set(incoming.values())) {
    const existing = existingById.get(contact.id);
    const merged = existing?.imageData && !contact.imageData ? { ...contact, imageData: existing.imageData } : contact;
    mergedById.set(contact.id, merged);
    for (const identifier of new Set([...contactIdentifiers(existing ?? contact), ...contactIdentifiers(contact)])) {
      next.set(identifier, merged);
      if (identifier.includes("@")) next.set(identifier.toLowerCase(), merged);
    }
  }
  for (const [identifier, contact] of next) {
    const merged = mergedById.get(contact.id);
    if (merged) next.set(identifier, merged);
  }
  return next;
}

export function mergeContactPhotos(
  contactMap: Map<string, Contact>,
  photos: readonly { id: string; imageData: string | null }[],
): Map<string, Contact> {
  const photoById = new Map(photos.filter((photo) => photo.imageData).map((photo) => [photo.id, photo.imageData!]));
  if (!photoById.size) return contactMap;
  const updatedById = new Map<string, Contact>();
  const next = new Map<string, Contact>();
  for (const [identifier, contact] of contactMap) {
    const imageData = photoById.get(contact.id);
    if (!imageData) {
      next.set(identifier, contact);
      continue;
    }
    let updated = updatedById.get(contact.id);
    if (!updated) {
      updated = { ...contact, imageData };
      updatedById.set(contact.id, updated);
    }
    next.set(identifier, updated);
  }
  return next;
}

function contactMapToPersisted(contactMap: Map<string, Contact>): PersistedContactMap {
  const persisted = emptyPersistedContactMap();
  persisted.updatedAtEpochMs = Date.now();
  for (const [identifier, contact] of contactMap) {
    const displayName = contact.displayName || `${contact.givenName} ${contact.familyName}`.trim();
    if (displayName) persisted.byIdentifier[identifier] = { contactId: contact.id, displayName };
    if (contact.imageData) persisted.byContactId[contact.id] = { imageData: contact.imageData };
  }
  return persisted;
}

export function mergeOpenChatCacheIntoPersisted(
  persisted: PersistedContactMap,
  contactMap: Map<string, Contact>,
): PersistedContactMap {
  const incoming = contactMapToPersisted(contactMap);
  return {
    version: 2,
    updatedAtEpochMs: incoming.updatedAtEpochMs,
    byIdentifier: { ...persisted.byIdentifier, ...incoming.byIdentifier },
    byContactId: { ...persisted.byContactId, ...incoming.byContactId },
  };
}

export function persistedToContactMap(persisted: PersistedContactMap): Map<string, Contact> {
  const contactsById = new Map<string, Contact>();
  for (const [identifier, entry] of Object.entries(persisted.byIdentifier)) {
    let contact = contactsById.get(entry.contactId);
    if (!contact) {
      contact = {
        id: entry.contactId,
        givenName: "",
        familyName: "",
        displayName: entry.displayName,
        phoneNumbers: [],
        emailAddresses: [],
        matchedChatIdentifiers: [],
        imageData: persisted.byContactId[entry.contactId]?.imageData ?? null,
      };
      contactsById.set(entry.contactId, contact);
    }
    contact.matchedChatIdentifiers.push(identifier);
    if (identifier.includes("@")) contact.emailAddresses.push(identifier);
    else contact.phoneNumbers.push({ number: identifier, countryCode: null });
  }
  return createContactMap([...contactsById.values()]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parsePersistedContactMap(raw: string | undefined): PersistedContactMap | undefined {
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || (parsed.version !== 1 && parsed.version !== 2) || !isRecord(parsed.byIdentifier)) return;

    const byIdentifier: PersistedContactMap["byIdentifier"] = {};
    for (const [identifier, value] of Object.entries(parsed.byIdentifier)) {
      if (
        !identifier ||
        !isRecord(value) ||
        typeof value.contactId !== "string" ||
        !value.contactId ||
        typeof value.displayName !== "string" ||
        !value.displayName
      ) {
        return;
      }
      byIdentifier[identifier] = { contactId: value.contactId, displayName: value.displayName };
    }

    const byContactId: PersistedContactMap["byContactId"] = {};
    if (parsed.version === 2) {
      if (!isRecord(parsed.byContactId)) return;
      for (const [id, photo] of Object.entries(parsed.byContactId)) {
        if (!id || !isRecord(photo) || typeof photo.imageData !== "string") return;
        if (photo.imageData && photo.imageData.length <= MAX_PERSISTED_PHOTO_BASE64_LENGTH) {
          byContactId[id] = { imageData: photo.imageData };
        }
      }
    }
    return {
      version: 2,
      updatedAtEpochMs: typeof parsed.updatedAtEpochMs === "number" ? parsed.updatedAtEpochMs : 0,
      byIdentifier,
      byContactId,
    };
  } catch {
    return;
  }
}

export const serializePersistedContactMap = JSON.stringify;
