import { Cache } from "@raycast/api";

const STORAGE_KEY = "catalog";
const STORAGE_VERSION = 5;

export type MochiCatalogItem = {
  readonly id: string;
  readonly name: string;
  readonly parentId?: string;
};

export type MochiCatalogTemplate = MochiCatalogItem & {
  readonly content?: string;
  readonly fields: readonly MochiCatalogTemplateField[];
};

export type MochiCatalogTemplateField = {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly pos?: string;
  readonly multiline: boolean;
};

export type MochiCatalog = {
  readonly decks: readonly MochiCatalogItem[];
  readonly templates: readonly MochiCatalogTemplate[];
  readonly cardCounts: Readonly<Record<string, number>>;
};

type MochiCatalogEnvelope = MochiCatalog & {
  readonly version: typeof STORAGE_VERSION;
};

export interface MochiCatalogStorage {
  getItem(key: string): string | undefined;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MochiCatalogRepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "MochiCatalogRepositoryError";
  }
}

export class MochiCatalogRepository {
  private readonly storage: MochiCatalogStorage;

  constructor(storage: MochiCatalogStorage = raycastMochiCatalogStorage) {
    this.storage = storage;
  }

  get(): MochiCatalog | undefined {
    const storedValue = this.storage.getItem(STORAGE_KEY);
    if (storedValue === undefined) {
      return undefined;
    }

    try {
      const parsed: unknown = JSON.parse(storedValue);
      if (isPreviousMochiCatalogEnvelope(parsed)) {
        return undefined;
      }
      if (!isMochiCatalogEnvelope(parsed)) {
        throw new Error("Stored Mochi catalog does not match a supported version");
      }
      return { decks: parsed.decks, templates: parsed.templates, cardCounts: parsed.cardCounts };
    } catch (error: unknown) {
      throw new MochiCatalogRepositoryError("Saved Mochi catalog is corrupted. The original data was left unchanged.", {
        cause: error,
      });
    }
  }

  replace(catalog: MochiCatalog): void {
    const envelope: MochiCatalogEnvelope = {
      version: STORAGE_VERSION,
      decks: catalog.decks,
      templates: catalog.templates,
      cardCounts: catalog.cardCounts,
    };
    this.storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  }

  clear(): void {
    this.storage.removeItem(STORAGE_KEY);
  }
}

const catalogCache = new Cache({ namespace: "browse-cards" });

const raycastMochiCatalogStorage: MochiCatalogStorage = {
  getItem(key: string): string | undefined {
    return catalogCache.get(key);
  },
  setItem(key: string, value: string): void {
    catalogCache.set(key, value);
  },
  removeItem(key: string): void {
    catalogCache.remove(key);
  },
};

function isMochiCatalogEnvelope(value: unknown): value is MochiCatalogEnvelope {
  return (
    isRecord(value) &&
    value.version === STORAGE_VERSION &&
    Array.isArray(value.decks) &&
    value.decks.every(isMochiCatalogItem) &&
    Array.isArray(value.templates) &&
    value.templates.every(isMochiCatalogTemplate) &&
    isCardCounts(value.cardCounts)
  );
}

function isPreviousMochiCatalogEnvelope(value: unknown): boolean {
  return isRecord(value) && (value.version === 1 || value.version === 2 || value.version === 3 || value.version === 4);
}

function isMochiCatalogItem(value: unknown): value is MochiCatalogItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.parentId === undefined || typeof value.parentId === "string")
  );
}

function isMochiCatalogTemplate(value: unknown): value is MochiCatalogTemplate {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.content === undefined || typeof value.content === "string") &&
    Array.isArray(value.fields) &&
    value.fields.every(isMochiCatalogTemplateField)
  );
}

function isMochiCatalogTemplateField(value: unknown): value is MochiCatalogTemplateField {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.type === "string" &&
    (value.pos === undefined || typeof value.pos === "string") &&
    typeof value.multiline === "boolean"
  );
}

function isCardCounts(value: unknown): value is Readonly<Record<string, number>> {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (count: unknown) => typeof count === "number" && Number.isSafeInteger(count) && count >= 0
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
