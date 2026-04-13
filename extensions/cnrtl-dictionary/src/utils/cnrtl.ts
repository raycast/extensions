import { FETCH_HEADERS, buildCnrtlUrl } from "./constants";
import {
  parseDefinitionPage,
  parseEtymologyPage,
  parseMorphologyPage,
  parseSynonymPage,
  isNotFoundPage,
} from "./parser";
import type {
  CnrtlEndpoint,
  CnrtlError,
  DefinitionEntry,
  EtymologyEntry,
  MorphologyEntry,
  SynonymResult,
} from "./types";

// ─── Core fetch ───────────────────────────────────────────────────────────────

/**
 * Fetch the raw HTML of a CNRTL page.
 * Throws a typed {@link CnrtlError} on any failure.
 */
export async function fetchCnrtlPage(
  endpoint: CnrtlEndpoint,
  word: string
): Promise<string> {
  const url = buildCnrtlUrl(endpoint, word);

  let response: Response;
  try {
    response = await fetch(url, { headers: FETCH_HEADERS });
  } catch (cause) {
    throw makeCnrtlError("network", `Impossible de joindre le CNRTL : ${String(cause)}`, word, endpoint);
  }

  if (response.status === 404) {
    throw makeCnrtlError("not_found", `Mot introuvable : « ${word} »`, word, endpoint);
  }

  if (!response.ok) {
    throw makeCnrtlError(
      "network",
      `Le serveur CNRTL a répondu avec le code HTTP ${response.status}`,
      word,
      endpoint
    );
  }

  const html = await response.text();

  if (isNotFoundPage(html)) {
    throw makeCnrtlError("not_found", `Mot introuvable : « ${word} »`, word, endpoint);
  }

  return html;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch and parse the definition of a word from the TLFi.
 */
export async function fetchDefinition(word: string): Promise<DefinitionEntry> {
  const html = await fetchCnrtlPage("definition", word);
  try {
    return parseDefinitionPage(html, word);
  } catch (cause) {
    throw makeCnrtlError("parse", `Erreur d'analyse de la définition : ${String(cause)}`, word, "definition");
  }
}

/**
 * Fetch and parse the synonyms of a word.
 */
export async function fetchSynonyms(word: string): Promise<SynonymResult> {
  const html = await fetchCnrtlPage("synonymie", word);
  try {
    return parseSynonymPage(html, word, "synonymie");
  } catch (cause) {
    throw makeCnrtlError("parse", `Erreur d'analyse des synonymes : ${String(cause)}`, word, "synonymie");
  }
}

/**
 * Fetch and parse the antonyms of a word.
 */
export async function fetchAntonyms(word: string): Promise<SynonymResult> {
  const html = await fetchCnrtlPage("antonymie", word);
  try {
    return parseSynonymPage(html, word, "antonymie");
  } catch (cause) {
    throw makeCnrtlError("parse", `Erreur d'analyse des antonymes : ${String(cause)}`, word, "antonymie");
  }
}

/**
 * Fetch and parse the etymology of a word.
 */
export async function fetchEtymology(word: string): Promise<EtymologyEntry> {
  const html = await fetchCnrtlPage("etymologie", word);
  try {
    return parseEtymologyPage(html, word);
  } catch (cause) {
    throw makeCnrtlError("parse", `Erreur d'analyse de l'étymologie : ${String(cause)}`, word, "etymologie");
  }
}

/**
 * Fetch and parse the morphological forms of a word.
 */
export async function fetchMorphology(word: string): Promise<MorphologyEntry> {
  const html = await fetchCnrtlPage("morphologie", word);
  try {
    return parseMorphologyPage(html, word);
  } catch (cause) {
    throw makeCnrtlError("parse", `Erreur d'analyse de la morphologie : ${String(cause)}`, word, "morphologie");
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCnrtlError(
  type: CnrtlError["type"],
  message: string,
  word: string,
  endpoint: CnrtlEndpoint
): CnrtlError & Error {
  const err = new Error(message) as CnrtlError & Error;
  err.type = type;
  err.word = word;
  err.endpoint = endpoint;
  return err;
}

/**
 * Type-guard to check whether a thrown value is a {@link CnrtlError}.
 */
export function isCnrtlError(err: unknown): err is CnrtlError {
  return (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    "word" in err &&
    "endpoint" in err
  );
}
