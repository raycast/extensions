import { normalizeDeckId, type FieldValue, type MochiTemplateSnapshot } from "../domain/template";

const MOCHI_CARDS_URL = "https://app.mochi.cards/api/cards/";
const MOCHI_DECKS_URL = "https://app.mochi.cards/api/decks";
const MOCHI_TEMPLATES_URL = "https://app.mochi.cards/api/templates/";
const DEFAULT_TIMEOUT_MS = 15_000;

export type MochiErrorKind = "network" | "unauthorized" | "validation" | "http" | "aborted";

export class MochiError extends Error {
  readonly kind: MochiErrorKind;
  readonly status?: number;

  constructor(kind: MochiErrorKind, message: string, status?: number, options?: ErrorOptions) {
    super(message, options);
    this.name = "MochiError";
    this.kind = kind;
    this.status = status;
  }
}

export function isMochiDeckNotFoundError(error: unknown): boolean {
  if (!(error instanceof MochiError)) {
    return false;
  }
  if (error.status === 404) {
    return true;
  }
  if (error.kind !== "validation") {
    return false;
  }
  return /(?:deck(?:-id)?.*(?:invalid|not found|does not exist|unknown|missing)|no .*deck)/i.test(error.message);
}

export type CreatedMochiCard = {
  readonly id?: string;
  readonly name?: string | null;
};

export type MochiDeck = {
  readonly id: string;
  readonly name: string;
  readonly parentId?: string;
};

export type MochiCardField = {
  readonly id: string;
  readonly value: FieldValue;
};

export type MochiCardReview = {
  readonly date: string;
};

export type MochiCardAiCacheEntry = {
  readonly prompt: string;
  readonly text: string;
  readonly date: string;
};

export type MochiCard = {
  readonly id: string;
  readonly deckId: string;
  readonly content: string;
  readonly name: string | null;
  readonly tags: readonly string[];
  readonly fields: readonly MochiCardField[];
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly position?: string;
  readonly reviews: readonly MochiCardReview[];
  readonly aiCacheEntries: readonly MochiCardAiCacheEntry[];
  readonly archived?: boolean;
  readonly templateId?: string | null;
};

export type MochiTemplateField = MochiTemplateSnapshot["fields"][number];

export type MochiTemplate = {
  readonly id: string;
  readonly name: string;
  readonly content?: string;
  readonly fields: readonly MochiTemplateField[];
};

export function toMochiTemplateSnapshot(template: MochiTemplate): MochiTemplateSnapshot {
  return { id: template.id, name: template.name, fields: template.fields };
}

export type CreateMochiCardRequest = {
  readonly deckId: string;
  readonly tags: readonly string[];
  readonly reviewReverse: boolean;
  readonly archived: boolean;
  readonly output:
    | {
        readonly kind: "card-body";
        readonly content: string;
        readonly templateMode: "none" | "deck-default";
      }
    | {
        readonly kind: "mochi-template";
        readonly templateId: string;
        readonly fields: Readonly<Record<string, FieldValue>>;
      };
};

export type UpdateMochiCardRequest = {
  readonly templateId: string;
  readonly fields: Readonly<Record<string, FieldValue>>;
};

type MochiCardPage = {
  readonly cards: readonly MochiCard[];
  readonly bookmark?: string;
};

type MochiDeckPage = {
  readonly decks: readonly MochiDeck[];
  readonly bookmark?: string;
};

type MochiTemplatePage = {
  readonly templates: readonly MochiTemplate[];
  readonly bookmark?: string;
};

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export class MochiClient {
  private readonly apiKey: string;
  private readonly fetch: FetchLike;
  private readonly timeoutMs: number;

  constructor(apiKey: string, fetchImplementation: FetchLike = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS) {
    this.apiKey = apiKey;
    this.fetch = fetchImplementation;
    this.timeoutMs = timeoutMs;
  }

  async createCard(request: CreateMochiCardRequest, signal?: AbortSignal): Promise<CreatedMochiCard> {
    const outputPayload =
      request.output.kind === "card-body"
        ? {
            content: request.output.content,
            ...(request.output.templateMode === "none" ? { "template-id": null } : {}),
          }
        : {
            content: "",
            "template-id": request.output.templateId,
            fields: Object.fromEntries(Object.entries(request.output.fields).map(([id, value]) => [id, { id, value }])),
          };
    const responseText = await this.request(
      MOCHI_CARDS_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...outputPayload,
          "deck-id": normalizeDeckId(request.deckId),
          "manual-tags": request.tags,
          "review-reverse?": request.reviewReverse,
          "archived?": request.archived,
        }),
      },
      signal
    );

    return parseCreatedCard(responseText);
  }

  async updateCard(cardId: string, request: UpdateMochiCardRequest, signal?: AbortSignal): Promise<void> {
    await this.request(
      `${MOCHI_CARDS_URL}${encodeURIComponent(cardId)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: "",
          "template-id": request.templateId,
          fields: Object.fromEntries(Object.entries(request.fields).map(([id, value]) => [id, { id, value }])),
        }),
      },
      signal
    );
  }

  async deleteCard(cardId: string, signal?: AbortSignal): Promise<void> {
    try {
      await this.request(
        `${MOCHI_CARDS_URL}${encodeURIComponent(cardId)}`,
        {
          method: "DELETE",
        },
        signal
      );
    } catch (error: unknown) {
      // Deletion is complete when the card is already gone.
      if (error instanceof MochiError && error.status === 404) {
        return;
      }
      throw error;
    }
  }

  async getCard(cardId: string, signal?: AbortSignal): Promise<MochiCard> {
    return parseMochiCardResponse(
      await this.request(`${MOCHI_CARDS_URL}${encodeURIComponent(cardId)}`, { method: "GET" }, signal)
    );
  }

  async listDecks(signal?: AbortSignal): Promise<readonly MochiDeck[]> {
    const decks = new Map<string, MochiDeck>();
    const bookmarks = new Set<string>();
    let bookmark: string | undefined;

    do {
      const url = bookmark ? `${MOCHI_DECKS_URL}?bookmark=${encodeURIComponent(bookmark)}` : MOCHI_DECKS_URL;
      const page = parseDeckPage(await this.request(url, { method: "GET" }, signal));
      page.decks.forEach((deck) => decks.set(deck.id, deck));
      if (page.bookmark && bookmarks.has(page.bookmark)) {
        break;
      }
      bookmark = page.bookmark;
      if (bookmark) {
        bookmarks.add(bookmark);
      }
    } while (bookmark);

    return [...decks.values()].sort((left, right) => left.name.localeCompare(right.name));
  }

  async listCards(deckId: string, signal?: AbortSignal): Promise<readonly MochiCard[]> {
    const cards = new Map<string, MochiCard>();
    const bookmarks = new Set<string>();
    let bookmark: string | undefined;

    do {
      const parameters = new URLSearchParams({
        "deck-id": normalizeDeckId(deckId),
        limit: "100",
      });
      if (bookmark) {
        parameters.set("bookmark", bookmark);
      }
      const page = parseCardPage(
        await this.request(`${MOCHI_CARDS_URL}?${parameters.toString()}`, { method: "GET" }, signal)
      );
      page.cards.forEach((card) => cards.set(card.id, card));
      if (page.bookmark && bookmarks.has(page.bookmark)) {
        break;
      }
      bookmark = page.bookmark;
      if (bookmark) {
        bookmarks.add(bookmark);
      }
    } while (bookmark);

    return [...cards.values()];
  }

  async listTemplates(signal?: AbortSignal): Promise<readonly MochiTemplate[]> {
    const templates = new Map<string, MochiTemplate>();
    const bookmarks = new Set<string>();
    let bookmark: string | undefined;

    do {
      const url = bookmark ? `${MOCHI_TEMPLATES_URL}?bookmark=${encodeURIComponent(bookmark)}` : MOCHI_TEMPLATES_URL;
      const page = parseTemplatePage(await this.request(url, { method: "GET" }, signal));
      page.templates.forEach((template) => templates.set(template.id, template));
      if (page.bookmark && bookmarks.has(page.bookmark)) {
        break;
      }
      bookmark = page.bookmark;
      if (bookmark) {
        bookmarks.add(bookmark);
      }
    } while (bookmark);

    return [...templates.values()].sort((left, right) => left.name.localeCompare(right.name));
  }

  async getTemplate(templateId: string, signal?: AbortSignal): Promise<MochiTemplate> {
    return parseMochiTemplateResponse(
      await this.request(`${MOCHI_TEMPLATES_URL}${encodeURIComponent(templateId)}`, { method: "GET" }, signal)
    );
  }

  private async request(url: string, init: RequestInit, signal?: AbortSignal): Promise<string> {
    const requestController = new AbortController();
    const forwardAbort = (): void => requestController.abort(signal?.reason);
    if (signal?.aborted) {
      forwardAbort();
    } else {
      signal?.addEventListener("abort", forwardAbort, { once: true });
    }
    const timeout = setTimeout(
      () => requestController.abort(new MochiError("network", "Mochi request timed out")),
      this.timeoutMs
    );

    try {
      const response = await this.fetch(url, {
        ...init,
        headers: {
          ...init.headers,
          Authorization: `Basic ${Buffer.from(`${this.apiKey}:`).toString("base64")}`,
        },
        signal: requestController.signal,
      });

      const responseText = await response.text();
      if (!response.ok) {
        const message = responseErrorMessage(responseText, response.status);
        if (response.status === 401 || response.status === 403) {
          throw new MochiError("unauthorized", "Mochi rejected the API key", response.status);
        }
        if (response.status === 400 || response.status === 422) {
          throw new MochiError("validation", message, response.status);
        }
        throw new MochiError("http", message, response.status);
      }

      return responseText;
    } catch (error: unknown) {
      if (error instanceof MochiError) {
        throw error;
      }
      if (signal?.aborted) {
        throw new MochiError("aborted", "Mochi request was cancelled", undefined, { cause: error });
      }
      if (requestController.signal.reason instanceof MochiError) {
        throw requestController.signal.reason;
      }
      throw new MochiError("network", errorMessage(error, "Could not connect to Mochi"), undefined, { cause: error });
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", forwardAbort);
    }
  }
}

function normalizeBookmark(value: unknown): string | undefined {
  return typeof value === "string" && value !== "nil" ? value : undefined;
}

function parseCardPage(responseText: string): MochiCardPage {
  try {
    const value: unknown = JSON.parse(responseText);
    if (
      !isRecord(value) ||
      !Array.isArray(value.docs) ||
      (value.bookmark !== undefined && typeof value.bookmark !== "string")
    ) {
      throw new Error("Mochi returned an invalid card list");
    }
    return {
      cards: value.docs.flatMap((card) => {
        const parsed = parseMochiCard(card);
        return parsed ? [parsed] : [];
      }),
      bookmark: normalizeBookmark(value.bookmark),
    };
  } catch (error: unknown) {
    if (error instanceof MochiError) {
      throw error;
    }
    throw new MochiError("http", errorMessage(error, "Mochi returned an invalid card list"), undefined, {
      cause: error,
    });
  }
}

function parseMochiCardResponse(responseText: string): MochiCard {
  try {
    const card = parseMochiCard(JSON.parse(responseText));
    if (!card) {
      throw new Error("Mochi returned an invalid card");
    }
    return card;
  } catch (error: unknown) {
    if (error instanceof MochiError) {
      throw error;
    }
    throw new MochiError("http", errorMessage(error, "Mochi returned an invalid card"), undefined, { cause: error });
  }
}

function parseDeckPage(responseText: string): MochiDeckPage {
  try {
    const value: unknown = JSON.parse(responseText);
    if (
      !isRecord(value) ||
      !Array.isArray(value.docs) ||
      (value.bookmark !== undefined && typeof value.bookmark !== "string")
    ) {
      throw new Error("Mochi returned an invalid deck list");
    }
    return { decks: value.docs.flatMap(parseMochiDeck), bookmark: normalizeBookmark(value.bookmark) };
  } catch (error: unknown) {
    if (error instanceof MochiError) {
      throw error;
    }
    throw new MochiError("http", errorMessage(error, "Mochi returned an invalid deck list"), undefined, {
      cause: error,
    });
  }
}

function parseTemplatePage(responseText: string): MochiTemplatePage {
  try {
    const value: unknown = JSON.parse(responseText);
    if (
      !isRecord(value) ||
      !Array.isArray(value.docs) ||
      (value.bookmark !== undefined && typeof value.bookmark !== "string")
    ) {
      throw new Error("Mochi returned an invalid template list");
    }
    return {
      templates: value.docs.flatMap((template) => {
        const parsed = parseMochiTemplate(template);
        return parsed ? [parsed] : [];
      }),
      bookmark: normalizeBookmark(value.bookmark),
    };
  } catch (error: unknown) {
    if (error instanceof MochiError) {
      throw error;
    }
    throw new MochiError("http", errorMessage(error, "Mochi returned an invalid template list"), undefined, {
      cause: error,
    });
  }
}

function parseMochiTemplateResponse(responseText: string): MochiTemplate {
  try {
    const template = parseMochiTemplate(JSON.parse(responseText));
    if (!template) {
      throw new Error("Mochi returned an invalid template");
    }
    return template;
  } catch (error: unknown) {
    if (error instanceof MochiError) {
      throw error;
    }
    throw new MochiError("http", errorMessage(error, "Mochi returned an invalid template"), undefined, {
      cause: error,
    });
  }
}

function parseCreatedCard(responseText: string): CreatedMochiCard {
  if (responseText.trim().length === 0) {
    return {};
  }

  try {
    const value: unknown = JSON.parse(responseText);
    if (isRecord(value)) {
      const id = typeof value.id === "string" ? value.id : undefined;
      const name = value.name === null || typeof value.name === "string" ? value.name : undefined;
      return { ...(id === undefined ? {} : { id }), ...(name === undefined ? {} : { name }) };
    }
  } catch {
    return {};
  }
  return {};
}

function responseErrorMessage(responseText: string, status: number): string {
  if (responseText.trim().length === 0) {
    return `Mochi returned HTTP ${status}`;
  }

  try {
    const value: unknown = JSON.parse(responseText);
    if (isRecord(value)) {
      for (const key of ["message", "error", "detail"]) {
        if (typeof value[key] === "string" && value[key].length > 0) {
          return value[key];
        }
      }
      const structuredErrors = structuredErrorMessage(value.errors);
      if (structuredErrors) {
        return structuredErrors;
      }
    }
  } catch {
    return `Mochi returned HTTP ${status}`;
  }
  return `Mochi returned HTTP ${status}`;
}

function structuredErrorMessage(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (Array.isArray(value)) {
    const messages = value.filter((message): message is string => typeof message === "string" && message.length > 0);
    return messages.length > 0 ? messages.join(", ") : undefined;
  }
  if (!isRecord(value)) {
    return undefined;
  }

  const messages = Object.entries(value).flatMap(([field, message]) =>
    typeof message === "string" && message.length > 0 ? [`${field}: ${message}`] : []
  );
  return messages.length > 0 ? messages.join(", ") : undefined;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.length > 0 ? error.message : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseMochiDeck(value: unknown): readonly MochiDeck[] {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    (value["parent-id"] !== undefined && value["parent-id"] !== null && typeof value["parent-id"] !== "string")
  ) {
    return [];
  }

  const parentId = typeof value["parent-id"] === "string" ? normalizeDeckId(value["parent-id"]) : undefined;
  return [{ id: value.id, name: value.name, ...(parentId ? { parentId } : {}) }];
}

function parseMochiCard(value: unknown): MochiCard | undefined {
  if (
    !isRecord(value) ||
    Object.prototype.hasOwnProperty.call(value, "trashed?") ||
    typeof value.id !== "string" ||
    typeof value["deck-id"] !== "string" ||
    typeof value.content !== "string"
  ) {
    return undefined;
  }

  const name = typeof value.name === "string" ? value.name : null;
  const tags = Array.isArray(value.tags) ? value.tags.filter((tag): tag is string => typeof tag === "string") : [];
  const archived = typeof value["archived?"] === "boolean" ? value["archived?"] : undefined;
  const templateId =
    typeof value["template-id"] === "string" || value["template-id"] === null ? value["template-id"] : undefined;

  return {
    id: value.id,
    deckId: normalizeDeckId(value["deck-id"]),
    content: value.content,
    name,
    tags,
    fields: parseCardFields(value.fields),
    createdAt: parseMochiDate(value["created-at"]),
    updatedAt: parseMochiDate(value["updated-at"]),
    position: typeof value.pos === "string" ? value.pos : undefined,
    reviews: parseCardReviews(value.reviews),
    aiCacheEntries: parseMochiCardAiCache(value["component-cache"]),
    archived,
    templateId,
  };
}

function parseCardFields(value: unknown): readonly MochiCardField[] {
  if (!isRecord(value)) {
    return [];
  }

  return Object.values(value).flatMap((field) => {
    if (
      !isRecord(field) ||
      typeof field.id !== "string" ||
      (typeof field.value !== "string" && typeof field.value !== "boolean" && typeof field.value !== "number")
    ) {
      return [];
    }
    return [{ id: field.id, value: typeof field.value === "number" ? String(field.value) : field.value }];
  });
}

function parseCardReviews(value: unknown): readonly MochiCardReview[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((review) => {
    if (!isRecord(review)) {
      return [];
    }
    const date = parseMochiDate(review.date);
    return date ? [{ date }] : [];
  });
}

function parseMochiCardAiCache(value: unknown): readonly MochiCardAiCacheEntry[] {
  if (!isRecord(value) || !isRecord(value.ai)) {
    return [];
  }

  return Object.entries(value.ai).flatMap(([prompt, entry]) => {
    if (!isRecord(entry) || typeof entry.text !== "string" || typeof entry.date !== "string") {
      return [];
    }
    return Number.isNaN(Date.parse(entry.date)) ? [] : [{ prompt, text: entry.text, date: entry.date }];
  });
}

function parseMochiDate(value: unknown): string | undefined {
  if (!isRecord(value) || typeof value.date !== "string" || Number.isNaN(Date.parse(value.date))) {
    return undefined;
  }
  return value.date;
}

function parseMochiTemplate(value: unknown): MochiTemplate | undefined {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") {
    return undefined;
  }

  return {
    id: value.id,
    name: value.name,
    content: typeof value.content === "string" ? value.content : undefined,
    fields: parseMochiTemplateFields(value.fields),
  };
}

function parseMochiTemplateFields(value: unknown): readonly MochiTemplateField[] {
  if (!isRecord(value)) {
    return [];
  }

  return Object.values(value)
    .flatMap((field, index) => {
      if (!isRecord(field) || typeof field.id !== "string") {
        return [];
      }
      const options = isRecord(field.options) ? field.options : undefined;
      return [
        {
          id: field.id,
          name: typeof field.name === "string" ? field.name : field.id,
          type: typeof field.type === "string" && field.type.length > 0 ? field.type : "text",
          ...(typeof field.pos === "string" ? { pos: field.pos } : {}),
          multiline: options?.["multi-line?"] === true,
          index,
        },
      ];
    })
    .sort((left, right) => (left.pos ?? "").localeCompare(right.pos ?? "") || left.index - right.index)
    .map((field): MochiTemplateField => ({
      id: field.id,
      name: field.name,
      type: field.type,
      ...(field.pos === undefined ? {} : { pos: field.pos }),
      multiline: field.multiline,
    }));
}
