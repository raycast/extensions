import { environment } from "@raycast/api";
import { Data, Language, NotebookEntry } from "./types";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_PATH = path.join(environment.supportPath, "data.json");

const DEFAULT_DATA: Data = {
  languages: [],
  entries: [],
};

export class DuplicateEntryError extends Error {
  constructor(word: string) {
    super(`"${word}" already exists in this notebook.`);
    this.name = "DuplicateEntryError";
  }
}

let cache: Data | null = null;

function readData(): Data {
  if (cache) return cache;

  try {
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    cache = JSON.parse(raw) as Data;
    return cache;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      // File doesn't exist yet - return default
      return structuredClone(DEFAULT_DATA);
    }
    throw e;
  }
}

function writeData(data: Data): void {
  const tmp = DATA_PATH + ".tmp";
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, DATA_PATH);
  cache = data;
}

// LANGUAGE FUNCTIONS
export function getLanguages(): Language[] {
  return readData().languages;
}

function checkAbbreviationDuplicate(data: Data, abbreviation: string) {
  const duplicate = data.languages.find((l) => l.abbreviation?.toLowerCase() === abbreviation?.toLowerCase());
  if (duplicate) throw new Error(`A language with abbreviation "${abbreviation}" already exists.`);
}

export function addLanguage(name: string, color: string, abbreviation?: string): Language {
  const data = readData();

  if (abbreviation) {
    checkAbbreviationDuplicate(data, abbreviation);
  }

  const language: Language = {
    id: crypto.randomUUID(),
    name,
    abbreviation,
    color,
  };

  writeData({ ...data, languages: [...data.languages, language] });
  return language;
}

export function updateLanguage(id: string, updates: Partial<Omit<Language, "id">>): Language {
  const data = readData();

  const index = data.languages.findIndex((l) => l.id === id);
  if (index === -1) throw new Error("Language not found.");

  const current = data.languages[index];
  if (updates.abbreviation && updates.abbreviation.toLowerCase() !== current.abbreviation?.toLowerCase()) {
    checkAbbreviationDuplicate(data, updates.abbreviation);
  }

  const updated: Language = { ...current, ...updates };
  const languages = [...data.languages];
  languages[index] = updated;

  writeData({ ...data, languages });
  return updated;
}

export function deleteLanguage(id: string): void {
  const data = readData();

  const languages = data.languages.filter((l) => l.id !== id);
  if (languages.length === data.languages.length) throw new Error("Language not found.");

  writeData({
    languages,
    entries: data.entries.filter((e) => e.languageId !== id),
  });
}

// NOTEBOOK FUNCTIONS
export function getNotebook(languageId: string): NotebookEntry[] {
  return readData()
    .entries.filter((e) => e.languageId === languageId)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function addEntry(word: string, translation: string, languageId: string, timestamp?: number): NotebookEntry {
  const data = readData();

  const languageExists = data.languages.some((l) => l.id === languageId);
  if (!languageExists) throw new Error(`Language not found.`);

  // UNIQUE(word, languageId)
  const duplicate = data.entries.find(
    (e) => e.word.toLowerCase() === word.toLowerCase() && e.languageId === languageId,
  );
  if (duplicate) {
    throw new DuplicateEntryError(word);
  }

  const entry: NotebookEntry = {
    id: crypto.randomUUID(),
    word,
    translation,
    timestamp: timestamp ?? Date.now(),
    languageId,
  };

  writeData({ ...data, entries: [...data.entries, entry] });
  return entry;
}

export function updateEntry(id: string, updates: Partial<Pick<NotebookEntry, "word" | "translation">>): NotebookEntry {
  const data = readData();

  const index = data.entries.findIndex((e) => e.id === id);
  if (index === -1) throw new Error(`Entry not found.`);

  const current = data.entries[index];

  if (updates.word && updates.word.toLowerCase() !== current.word.toLowerCase()) {
    const duplicate = data.entries.find(
      (e) => e.id !== id && e.word.toLowerCase() === updates.word!.toLowerCase() && e.languageId === current.languageId,
    );
    if (duplicate) {
      throw new DuplicateEntryError(updates.word);
    }
  }

  const updated: NotebookEntry = { ...current, ...updates };
  const entries = [...data.entries];
  entries[index] = updated;

  writeData({ ...data, entries });
  return updated;
}

export function deleteEntry(id: string): void {
  const data = readData();

  const exists = data.entries.some((e) => e.id === id);
  if (!exists) throw new Error(`Entry not found.`);

  writeData({ ...data, entries: data.entries.filter((e) => e.id !== id) });
}
