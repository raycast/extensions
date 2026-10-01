/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { escapeHtml } from "@/core/content/markdown";
import { timedFetch } from "@/shared/http";

import { type FavoriteWord, resolveFavoriteTranslations } from "./model";
import { getFavoriteView } from "./view";

/**
 * AnkiConnect listens on `127.0.0.1:8765` by default, and its `webBindPort` config can move it,
 * so the address comes from the AnkiConnect URL preference. Accept hand-typed values without a scheme.
 */
export function normalizeAnkiUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

/** Note type created on first use; users may restyle its templates in Anki. */
const ANKI_MODEL_NAME = "Easydict";
const ANKI_MODEL_FIELDS = ["Word", "Phonetic", "Translation", "Explanation", "Audio"] as const;
const ANKI_TEMPLATE_NAME = "Recognition";

const ANKI_MODEL_CSS = `.card { font-family: -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; font-size: 20px; text-align: center; }
.word { font-size: 36px; font-weight: 600; }
.phonetic { margin-top: 4px; opacity: 0.6; }
.translation { margin-top: 16px; line-height: 1.6; }
.explanation { margin-top: 12px; font-size: 16px; line-height: 1.6; opacity: 0.8; }`;

const ANKI_FRONT_TEMPLATE = `<div class="word">{{Word}}</div>
{{#Phonetic}}<div class="phonetic">{{Phonetic}}</div>{{/Phonetic}}
{{Audio}}`;

const ANKI_BACK_TEMPLATE = `{{FrontSide}}
<hr id="answer">
<div class="translation">{{Translation}}</div>
{{#Explanation}}<div class="explanation">{{Explanation}}</div>{{/Explanation}}`;

interface AnkiNote {
  deckName: string;
  modelName: string;
  fields: Record<(typeof ANKI_MODEL_FIELDS)[number], string>;
  /** AnkiConnect downloads the file into Anki's media folder and appends `[sound:…]` to the listed fields. */
  audio?: { url: string; filename: string; fields: ["Audio"] }[];
  tags: string[];
  options: { allowDuplicate: false; duplicateScope: "deck" };
}

interface AddToAnkiResult {
  added: number;
  /** Words already in the deck, or repeated within the same batch. */
  skipped: number;
}

async function invokeAnki<T>(url: string, action: string, params: object = {}): Promise<T> {
  let response: { result: T; error: string | null };
  try {
    response = await timedFetch(url, {
      method: "POST",
      body: { action, version: 6, params },
      parseResponse: JSON.parse,
    });
  } catch {
    throw new Error(
      `Could not connect to Anki at ${url}. Open Anki and make sure the AnkiConnect add-on is installed.`,
    );
  }
  if (response.error) throw new Error(`AnkiConnect: ${response.error}`);
  return response.result;
}

async function ensureDeckAndModel(url: string, deckName: string) {
  await invokeAnki(url, "createDeck", { deck: deckName });
  const modelNames = await invokeAnki<string[]>(url, "modelNames");
  if (modelNames.includes(ANKI_MODEL_NAME)) return;
  await invokeAnki(url, "createModel", {
    modelName: ANKI_MODEL_NAME,
    inOrderFields: ANKI_MODEL_FIELDS,
    css: ANKI_MODEL_CSS,
    isCloze: false,
    cardTemplates: [{ Name: ANKI_TEMPLATE_NAME, Front: ANKI_FRONT_TEMPLATE, Back: ANKI_BACK_TEMPLATE }],
  });
}

/**
 * Map a saved favorite to an AnkiConnect note: word, phonetic and pronunciation on the front;
 * translations and dictionary explanations (Youdao explanations, AI definitions) on the back.
 */
export function buildAnkiNote(favorite: FavoriteWord, deckName: string): AnkiNote {
  const rows = getFavoriteView(favorite).flatMap((section) => section.items);
  const phonetic = rows.find((row) => row.accessory?.phonetic)?.accessory?.phonetic ?? favorite.query.phonetic ?? "";
  const translations = resolveFavoriteTranslations(favorite) ?? [];
  const explanations = rows.filter((row) => row.kind === "definition").map((row) => row.copyText);
  // Linguee stores an empty audio URL, so fall through to the first saved result that has one.
  const speechUrl =
    favorite.query.speechUrl || rows.find((row) => row.service.query.speechUrl)?.service.query.speechUrl;
  const audioName = favorite.query.word.replace(/[^\p{L}\p{N}]+/gu, "_");
  return {
    deckName,
    modelName: ANKI_MODEL_NAME,
    fields: {
      Word: escapeHtml(favorite.query.word),
      Phonetic: escapeHtml(phonetic),
      Translation: translations.map(escapeHtml).join("<br>"),
      Explanation: explanations.map(escapeHtml).join("<br>"),
      Audio: "",
    },
    audio: speechUrl
      ? [{ url: speechUrl, filename: `easydict-${favorite.query.fromLanguage}-${audioName}.mp3`, fields: ["Audio"] }]
      : undefined,
    tags: ["easydict"],
    options: { allowDuplicate: false, duplicateScope: "deck" },
  };
}

/**
 * Add favorites to an Anki deck, creating the deck and the Easydict note type
 * when missing. Words already in the deck are skipped instead of failing the batch.
 */
export async function addFavoritesToAnki(
  favorites: readonly FavoriteWord[],
  { deckName, url }: { deckName: string; url: string },
): Promise<AddToAnkiResult> {
  const endpoint = normalizeAnkiUrl(url);
  await ensureDeckAndModel(endpoint, deckName);

  // The same word saved in several language directions maps to one Anki note.
  const seen = new Set<string>();
  const notes = favorites
    .map((favorite) => buildAnkiNote(favorite, deckName))
    .filter((note) => !seen.has(note.fields.Word) && seen.add(note.fields.Word));

  const checks = await invokeAnki<{ canAdd: boolean; error?: string }[]>(endpoint, "canAddNotesWithErrorDetail", {
    notes,
  });
  const failure = checks.find((check) => !check.canAdd && !check.error?.includes("duplicate"));
  if (failure) throw new Error(`AnkiConnect: ${failure.error}`);

  const addable = notes.filter((_, index) => checks[index].canAdd);
  const results = addable.length ? await invokeAnki<(number | null)[]>(endpoint, "addNotes", { notes: addable }) : [];
  // addNotes reports a note that failed after the pre-check as null; do not count it as added.
  const added = results.filter((id) => id !== null).length;
  return { added, skipped: favorites.length - added };
}
