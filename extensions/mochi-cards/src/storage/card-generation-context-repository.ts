import { LocalStorage } from "@raycast/api";

import type { FieldValue, FieldValues } from "../domain/template";

const STORAGE_KEY = "mochi-card-generation-contexts";
const STORAGE_VERSION = 1;
let mutationQueue: Promise<void> = Promise.resolve();

export type CardGenerationContext = {
  readonly cardId: string;
  readonly generationTemplateId: string;
  readonly generationTemplateUpdatedAt: string;
  readonly mochiTemplateId: string;
  readonly inputValues: FieldValues;
  readonly updatedAt: string;
};

export type OptionalCardGenerationContext = {
  readonly context?: CardGenerationContext;
  readonly warning?: string;
};

type CardGenerationContextEnvelope = {
  readonly version: typeof STORAGE_VERSION;
  readonly records: Readonly<Record<string, CardGenerationContext>>;
};

export interface CardGenerationContextStorage {
  getItem(key: string): Promise<string | undefined>;
  setItem(key: string, value: string): Promise<void>;
}

export class CardGenerationContextRepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "CardGenerationContextRepositoryError";
  }
}

export class CardGenerationContextRepository {
  private readonly storage: CardGenerationContextStorage;
  private readonly now: () => Date;

  constructor(storage: CardGenerationContextStorage = raycastStorage, now: () => Date = () => new Date()) {
    this.storage = storage;
    this.now = now;
  }

  async get(cardId: string): Promise<CardGenerationContext | undefined> {
    await mutationQueue;
    const records = (await this.readEnvelope()).records;
    return Object.prototype.hasOwnProperty.call(records, cardId) ? records[cardId] : undefined;
  }

  async getOptional(cardId: string): Promise<OptionalCardGenerationContext> {
    try {
      return { context: await this.get(cardId) };
    } catch (error: unknown) {
      return {
        warning: `Saved generation inputs could not be read and were ignored. Stored data was left unchanged. ${errorMessage(error)}`,
      };
    }
  }

  async save(context: Omit<CardGenerationContext, "updatedAt">): Promise<CardGenerationContext> {
    return serializeMutation(async () => {
      const envelope = await this.readEnvelope();
      const saved: CardGenerationContext = { ...context, updatedAt: this.now().toISOString() };
      if (!isCardGenerationContext(saved) || saved.cardId !== context.cardId) {
        throw new CardGenerationContextRepositoryError("Card generation context is invalid");
      }
      await this.write({ ...envelope.records, [saved.cardId]: saved });
      return saved;
    });
  }

  async delete(cardId: string): Promise<boolean> {
    return serializeMutation(async () => {
      const envelope = await this.readEnvelope();
      if (!Object.prototype.hasOwnProperty.call(envelope.records, cardId)) {
        return false;
      }
      const records = { ...envelope.records };
      delete records[cardId];
      await this.write(records);
      return true;
    });
  }

  private async readEnvelope(): Promise<CardGenerationContextEnvelope> {
    const storedValue = await this.storage.getItem(STORAGE_KEY);
    if (storedValue === undefined) {
      return { version: STORAGE_VERSION, records: {} };
    }
    try {
      const parsed: unknown = JSON.parse(storedValue);
      if (!isEnvelope(parsed)) {
        throw new Error("Stored card generation contexts do not match a supported version");
      }
      return parsed;
    } catch (error: unknown) {
      throw new CardGenerationContextRepositoryError(
        "Saved card generation contexts are corrupted. The original data was left unchanged.",
        { cause: error }
      );
    }
  }

  private async write(records: Readonly<Record<string, CardGenerationContext>>): Promise<void> {
    await this.storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, records } satisfies CardGenerationContextEnvelope)
    );
  }
}

function serializeMutation<T>(mutation: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(mutation, mutation);
  mutationQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

const raycastStorage: CardGenerationContextStorage = {
  async getItem(key: string): Promise<string | undefined> {
    return LocalStorage.getItem<string>(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    await LocalStorage.setItem(key, value);
  },
};

function isEnvelope(value: unknown): value is CardGenerationContextEnvelope {
  if (!isRecord(value) || value.version !== STORAGE_VERSION || !isRecord(value.records)) {
    return false;
  }
  return Object.entries(value.records).every(
    ([cardId, context]) => isCardGenerationContext(context) && context.cardId === cardId
  );
}

function isCardGenerationContext(value: unknown): value is CardGenerationContext {
  return (
    isRecord(value) &&
    typeof value.cardId === "string" &&
    typeof value.generationTemplateId === "string" &&
    typeof value.generationTemplateUpdatedAt === "string" &&
    !Number.isNaN(Date.parse(value.generationTemplateUpdatedAt)) &&
    typeof value.mochiTemplateId === "string" &&
    isFieldValues(value.inputValues) &&
    typeof value.updatedAt === "string" &&
    !Number.isNaN(Date.parse(value.updatedAt))
  );
}

function isFieldValues(value: unknown): value is FieldValues {
  return isRecord(value) && Object.values(value).every(isFieldValue);
}

function isFieldValue(value: unknown): value is FieldValue {
  return typeof value === "string" || typeof value === "boolean";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}
