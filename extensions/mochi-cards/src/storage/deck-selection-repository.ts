import { LocalStorage } from "@raycast/api";

const STORAGE_KEY = "mochi-visible-decks";
const STORAGE_VERSION = 1;

type DeckSelectionEnvelope = {
  readonly version: typeof STORAGE_VERSION;
  readonly deckIds: readonly string[];
};

export interface DeckSelectionStorage {
  getItem(key: string): Promise<string | undefined>;
  setItem(key: string, value: string): Promise<void>;
}

export class DeckSelectionRepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DeckSelectionRepositoryError";
  }
}

export class DeckSelectionRepository {
  private readonly storage: DeckSelectionStorage;

  constructor(storage: DeckSelectionStorage = raycastDeckSelectionStorage) {
    this.storage = storage;
  }

  async list(): Promise<readonly string[]> {
    const storedValue = await this.storage.getItem(STORAGE_KEY);
    if (storedValue === undefined) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(storedValue);
      if (!isDeckSelectionEnvelope(parsed)) {
        throw new Error("Stored deck selection does not match a supported version");
      }
      return normalizeDeckIds(parsed.deckIds);
    } catch (error: unknown) {
      throw new DeckSelectionRepositoryError(
        "Saved deck selection is corrupted. The original data was left unchanged.",
        {
          cause: error,
        }
      );
    }
  }

  async replace(deckIds: readonly string[]): Promise<void> {
    const envelope: DeckSelectionEnvelope = {
      version: STORAGE_VERSION,
      deckIds: normalizeDeckIds(deckIds),
    };
    await this.storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  }
}

const raycastDeckSelectionStorage: DeckSelectionStorage = {
  async getItem(key: string): Promise<string | undefined> {
    return LocalStorage.getItem<string>(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    await LocalStorage.setItem(key, value);
  },
};

function normalizeDeckIds(deckIds: readonly string[]): readonly string[] {
  return [...new Set(deckIds.map((deckId) => deckId.trim()).filter(Boolean))];
}

function isDeckSelectionEnvelope(value: unknown): value is DeckSelectionEnvelope {
  return (
    isRecord(value) &&
    value.version === STORAGE_VERSION &&
    Array.isArray(value.deckIds) &&
    value.deckIds.every((deckId) => typeof deckId === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
