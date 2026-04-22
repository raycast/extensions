import { audioSubdirectory } from "../lib/audio";
import type { EntryResult, SearchResult, SuggestionResult } from "../types";

type LearnerEntry = {
  meta?: { id?: string };
  hwi?: {
    hw?: string;
    prs?: Array<{
      mw?: string;
      sound?: { audio?: string };
    }>;
  };
  fl?: string;
  shortdef?: string[];
  def?: Array<{
    sseq?: Array<Array<[string, { dt?: Array<[string, unknown]> }]>>;
  }>;
};

type Preferences = {
  learnerApiKey: string;
};

export async function getLearnerApiKey() {
  const { getPreferenceValues } = require("@raycast/api") as {
    getPreferenceValues: <Values extends Preferences>() => Values;
  };
  return getPreferenceValues<Preferences>().learnerApiKey;
}

export function buildLearnerBrowseUrl(headword: string) {
  return `https://www.merriam-webster.com/dictionary/${encodeURIComponent(headword)}`;
}

export function buildAudioUrl(audioId?: string) {
  if (!audioId) return undefined;
  return `https://media.merriam-webster.com/audio/prons/en/us/mp3/${audioSubdirectory(audioId)}/${audioId}.mp3`;
}

export function shouldSearchTerm(term: string) {
  return term.trim().length > 0;
}

export function normalizeLookupTerm(term: string) {
  return term.trim();
}

function cleanHeadword(headword?: string) {
  return (headword ?? "").replace(/\*/g, "").trim();
}

function isLearnerEntry(value: unknown): value is LearnerEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "hwi" in value &&
    typeof (value as LearnerEntry).hwi === "object" &&
    (value as LearnerEntry).hwi !== null
  );
}

function extractExamples(entry: LearnerEntry) {
  const examples: string[] = [];

  for (const definition of entry.def ?? []) {
    for (const senseGroup of definition.sseq ?? []) {
      for (const sense of senseGroup) {
        if (sense[0] !== "sense") continue;

        for (const part of sense[1].dt ?? []) {
          if (part[0] !== "vis" || !Array.isArray(part[1])) continue;

          for (const visual of part[1] as Array<{ t?: string }>) {
            if (visual.t) examples.push(visual.t);
          }
        }
      }
    }
  }

  return examples;
}

function normalizeEntry(entry: LearnerEntry): EntryResult {
  const headword = cleanHeadword(entry.hwi?.hw);
  const audioId = entry.hwi?.prs?.[0]?.sound?.audio;

  return {
    kind: "entry",
    id: entry.meta?.id ?? headword,
    headword,
    partOfSpeech: entry.fl,
    pronunciation: entry.hwi?.prs?.[0]?.mw,
    audioUrl: buildAudioUrl(audioId),
    shortDefinitions: entry.shortdef ?? [],
    examples: extractExamples(entry),
  };
}

function normalizeSuggestion(value: string): SuggestionResult {
  return { kind: "suggestion", value };
}

export function normalizeLearnerResponse(payload: unknown): SearchResult[] {
  if (!Array.isArray(payload)) return [];

  if (payload.every((item) => typeof item === "string")) {
    return payload.map((item) => normalizeSuggestion(item));
  }

  if (!payload.every((item) => isLearnerEntry(item))) return [];

  return payload.map((entry) => normalizeEntry(entry));
}

export async function fetchLearnerResults(term: string): Promise<SearchResult[]> {
  const apiKey = await getLearnerApiKey();
  const url = new URL(
    `https://dictionaryapi.com/api/v3/references/learners/json/${encodeURIComponent(term)}`,
  );
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Learner API request failed with status ${response.status}`);
  }

  return normalizeLearnerResponse((await response.json()) as unknown);
}
