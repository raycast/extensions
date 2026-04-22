import { audioSubdirectory } from "../lib/audio";
import type { DefinitionPart, EntryResult, SearchResult, Sense, SuggestionResult } from "../types";

type DtItem = [string, unknown];

type LearnerSense = {
  sn?: string;
  sls?: string[];
  dt?: DtItem[];
};

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
  def?: Array<{
    sseq?: Array<Array<[string, LearnerSense]>>;
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

function extractVisItems(dt: DtItem[]): Array<{ t?: string }> {
  const items: Array<{ t?: string }> = [];
  for (const item of dt) {
    if (item[0] === "vis" && Array.isArray(item[1])) {
      for (const v of item[1] as Array<{ t?: string }>) {
        if (v.t) items.push(v);
      }
    }
  }
  return items;
}

function extractPartsFromDt(dt: DtItem[]): DefinitionPart[] {
  const parts: DefinitionPart[] = [];

  for (const item of dt) {
    if (item[0] === "uns" && Array.isArray(item[1])) {
      for (const subGroup of item[1] as DtItem[][]) {
        let text = "";
        const examples: string[] = [];
        for (const subItem of subGroup) {
          if (subItem[0] === "text" && typeof subItem[1] === "string") {
            text = subItem[1].trim();
          }
          if (subItem[0] === "vis" && Array.isArray(subItem[1])) {
            for (const v of subItem[1] as Array<{ t?: string }>) {
              if (v.t) examples.push(v.t);
            }
          }
        }
        if (text || examples.length > 0) {
          parts.push({ text, examples });
        }
      }
    }
  }

  const directText = dt
    .filter((item) => item[0] === "text" && typeof item[1] === "string")
    .map((item) => (item[1] as string).trim())
    .filter((t) => t && !t.startsWith("{dx}"))
    .join(" ");

  const directExamples = extractVisItems(dt).map((v) => v.t ?? "").filter(Boolean);

  if (directText || directExamples.length > 0) {
    parts.push({ text: directText, examples: directExamples });
  }

  return parts;
}

function extractSenses(entry: LearnerEntry): Sense[] {
  const senses: Sense[] = [];

  for (const definition of entry.def ?? []) {
    for (const senseGroup of definition.sseq ?? []) {
      for (const [type, senseData] of senseGroup) {
        if (type !== "sense") continue;

        const parts = extractPartsFromDt(senseData.dt ?? []);
        if (parts.length === 0) continue;

        senses.push({
          number: senseData.sn ?? "",
          label: senseData.sls?.join(", "),
          parts,
        });
      }
    }
  }

  return senses;
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
    senses: extractSenses(entry),
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
