import { Cache } from "@raycast/api";

import type { NamedCard } from "../domain/card-duplicates";

const STORAGE_VERSION = 1;
const STORAGE_KEY_PREFIX = "card-names:";

type CardCacheEnvelope = {
  readonly version: typeof STORAGE_VERSION;
  readonly cards: readonly NamedCard[];
};

export interface CardCacheStorage {
  getItem(key: string): string | undefined;
  setItem(key: string, value: string): void;
}

export type CreatedCardIdentity = {
  readonly id?: string;
  readonly name?: string | null;
};

export class CardCacheRepository {
  private readonly storage: CardCacheStorage;

  constructor(storage: CardCacheStorage = raycastCardCacheStorage) {
    this.storage = storage;
  }

  get(deckId: string): readonly NamedCard[] {
    const storedValue = this.storage.getItem(storageKey(deckId));
    if (storedValue === undefined) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(storedValue);
      return isCardCacheEnvelope(parsed) ? parsed.cards : [];
    } catch {
      return [];
    }
  }

  replace(deckId: string, cards: readonly NamedCard[]): void {
    const envelope: CardCacheEnvelope = {
      version: STORAGE_VERSION,
      cards: cards.map(({ id, name }) => ({ id, name })),
    };
    this.storage.setItem(storageKey(deckId), JSON.stringify(envelope));
  }

  upsert(deckId: string, card: NamedCard): void {
    this.replace(deckId, [...this.get(deckId).filter((candidate) => candidate.id !== card.id), card]);
  }
}

export function upsertCreatedCardBestEffort(
  cache: Pick<CardCacheRepository, "upsert">,
  deckId: string,
  card: CreatedCardIdentity
): void {
  if (card.id === undefined || card.name === undefined) {
    return;
  }
  try {
    cache.upsert(deckId, { id: card.id, name: card.name });
  } catch {
    // The card already exists. A cache write must not fail the operation.
  }
}

const cardCache = new Cache({ namespace: "browse-cards" });

const raycastCardCacheStorage: CardCacheStorage = {
  getItem(key: string): string | undefined {
    return cardCache.get(key);
  },
  setItem(key: string, value: string): void {
    cardCache.set(key, value);
  },
};

function storageKey(deckId: string): string {
  return `${STORAGE_KEY_PREFIX}${deckId}`;
}

function isCardCacheEnvelope(value: unknown): value is CardCacheEnvelope {
  return (
    isRecord(value) &&
    value.version === STORAGE_VERSION &&
    Array.isArray(value.cards) &&
    value.cards.every(
      (card) => isRecord(card) && typeof card.id === "string" && (card.name === null || typeof card.name === "string")
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
