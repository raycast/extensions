export type Contact = {
  id: string;
  givenName: string;
  familyName: string;
  displayName: string;
  phoneNumbers: { number: string; countryCode: string | null }[];
  emailAddresses: string[];
  matchedChatIdentifiers: string[];
  imageData: string | null;
};

export function createContactMap(contacts: Contact[]): Map<string, Contact> {
  const contactMap = new Map<string, Contact>();

  contacts.forEach((contact) => {
    contact.matchedChatIdentifiers.forEach((identifier) => {
      contactMap.set(identifier, contact);

      if (identifier.includes("@")) {
        contactMap.set(identifier.toLowerCase(), contact);
      }
    });
  });

  return contactMap;
}

export type PersistedContactEntry = {
  contactId: string;
  displayName: string;
};

export type PersistedContactPhotoEntry = {
  imageData: string | null;
};

export type PersistedContactMap = {
  version: 2;
  updatedAtEpochMs: number;
  byIdentifier: Record<string, PersistedContactEntry>;
  byContactId: Record<string, PersistedContactPhotoEntry>;
};

export function emptyPersistedContactMap(): PersistedContactMap {
  return {
    version: 2,
    updatedAtEpochMs: 0,
    byIdentifier: {},
    byContactId: {},
  };
}

export function contactFromPersistedEntry(
  identifier: string,
  entry: PersistedContactEntry,
  imageData: string | null = null,
): Contact {
  return {
    id: entry.contactId,
    givenName: "",
    familyName: "",
    displayName: entry.displayName,
    phoneNumbers: identifier.includes("@") ? [] : [{ number: identifier, countryCode: null }],
    emailAddresses: identifier.includes("@") ? [identifier.toLowerCase()] : [],
    matchedChatIdentifiers: [identifier],
    imageData,
  };
}

export function contactMapToPersisted(contactMap: Map<string, Contact>): PersistedContactMap {
  const byIdentifier: Record<string, PersistedContactEntry> = {};

  contactMap.forEach((contact, identifier) => {
    const displayName = contact.displayName || `${contact.givenName} ${contact.familyName}`.trim();
    if (!displayName) {
      return;
    }

    byIdentifier[identifier] = {
      contactId: contact.id,
      displayName,
    };
  });

  return {
    version: 2,
    updatedAtEpochMs: Date.now(),
    byIdentifier,
    byContactId: {},
  };
}

export function contactPhotoCacheToPersisted(
  contactPhotoCache: Map<string, string | null>,
): Record<string, PersistedContactPhotoEntry> {
  const byContactId: Record<string, PersistedContactPhotoEntry> = {};

  contactPhotoCache.forEach((imageData, contactId) => {
    if (imageData) {
      byContactId[contactId] = { imageData };
    }
  });

  return byContactId;
}

export function persistedToContactPhotoCache(persisted: PersistedContactMap): Map<string, string | null> {
  const contactPhotoCache = new Map<string, string | null>();

  for (const [contactId, entry] of Object.entries(persisted.byContactId)) {
    contactPhotoCache.set(contactId, entry.imageData ?? null);
  }

  return contactPhotoCache;
}

export function mergePersistedContactMaps(
  base: PersistedContactMap,
  incoming: PersistedContactMap,
): PersistedContactMap {
  return {
    version: 2,
    updatedAtEpochMs: Math.max(base.updatedAtEpochMs, incoming.updatedAtEpochMs, Date.now()),
    byIdentifier: {
      ...base.byIdentifier,
      ...incoming.byIdentifier,
    },
    byContactId: {
      ...base.byContactId,
      ...incoming.byContactId,
    },
  };
}

export function mergeContactMapIntoPersisted(
  persisted: PersistedContactMap,
  contactMap: Map<string, Contact>,
): PersistedContactMap {
  return mergePersistedContactMaps(persisted, contactMapToPersisted(contactMap));
}

export function mergeContactPhotoCacheIntoPersisted(
  persisted: PersistedContactMap,
  contactPhotoCache: Map<string, string | null>,
): PersistedContactMap {
  return mergePersistedContactMaps(persisted, {
    version: 2,
    updatedAtEpochMs: Date.now(),
    byIdentifier: {},
    byContactId: contactPhotoCacheToPersisted(contactPhotoCache),
  });
}

export function mergeOpenChatCacheIntoPersisted(
  persisted: PersistedContactMap,
  contactMap: Map<string, Contact>,
  contactPhotoCache: Map<string, string | null>,
): PersistedContactMap {
  return mergePersistedContactMaps(
    mergeContactMapIntoPersisted(persisted, contactMap),
    mergeContactPhotoCacheIntoPersisted(emptyPersistedContactMap(), contactPhotoCache),
  );
}

export function persistedToContactMap(persisted: PersistedContactMap): Map<string, Contact> {
  const contactsById = new Map<string, Contact>();

  for (const [identifier, entry] of Object.entries(persisted.byIdentifier)) {
    const existing = contactsById.get(entry.contactId);
    if (existing) {
      if (!existing.matchedChatIdentifiers.includes(identifier)) {
        existing.matchedChatIdentifiers.push(identifier);
      }
      continue;
    }

    const imageData = persisted.byContactId[entry.contactId]?.imageData ?? null;
    contactsById.set(entry.contactId, contactFromPersistedEntry(identifier, entry, imageData));
  }

  return createContactMap([...contactsById.values()]);
}

type LegacyPersistedContactMap = {
  version: 1;
  updatedAtEpochMs: number;
  byIdentifier: Record<string, PersistedContactEntry>;
};

function normalizePersistedContactMap(parsed: LegacyPersistedContactMap | PersistedContactMap): PersistedContactMap {
  if (parsed.version === 2) {
    return {
      version: 2,
      updatedAtEpochMs: typeof parsed.updatedAtEpochMs === "number" ? parsed.updatedAtEpochMs : 0,
      byIdentifier: parsed.byIdentifier ?? {},
      byContactId: parsed.byContactId ?? {},
    };
  }

  return {
    version: 2,
    updatedAtEpochMs: typeof parsed.updatedAtEpochMs === "number" ? parsed.updatedAtEpochMs : 0,
    byIdentifier: parsed.byIdentifier ?? {},
    byContactId: {},
  };
}

export function parsePersistedContactMap(raw: string | undefined): PersistedContactMap | undefined {
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as LegacyPersistedContactMap | PersistedContactMap;
    if (
      (parsed?.version !== 1 && parsed?.version !== 2) ||
      typeof parsed.byIdentifier !== "object" ||
      parsed.byIdentifier === null
    ) {
      return undefined;
    }

    return normalizePersistedContactMap(parsed);
  } catch {
    return undefined;
  }
}

export function serializePersistedContactMap(persisted: PersistedContactMap): string {
  return JSON.stringify(persisted);
}
