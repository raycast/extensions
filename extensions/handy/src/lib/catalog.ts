import catalogJson from "./catalog.json";
import { legacyModelById } from "./legacy-models";

/**
 * Handy's model catalog, trimmed to what this extension needs (id, name,
 * description, languages). Regenerated from Handy's source of truth at
 * `src-tauri/src/catalog/catalog.json` — see the "Updating the catalog" note in
 * the extension README. Only display metadata lives here; whether a model is
 * *downloaded* is determined by scanning disk (see `models.ts`), never this list.
 */
export interface CatalogEntry {
  id: string; // HuggingFace repo id, e.g. "handy-computer/parakeet-ctc-0.6b-gguf"
  name: string;
  description: string;
  languages: string[];
}

export const CATALOG: CatalogEntry[] = catalogJson as CatalogEntry[];

const CATALOG_BY_REPO = new Map(CATALOG.map((entry) => [entry.id, entry]));

/** Look up a catalog entry by its HuggingFace repo id. */
export const getCatalogEntry = (repoId: string): CatalogEntry | undefined =>
  CATALOG_BY_REPO.get(repoId);

/**
 * Handy stores the selected model as `{repo_id}/{filename}`
 * (e.g. `handy-computer/parakeet-ctc-0.6b-gguf/parakeet-ctc-0.6b-Q8_0.gguf`).
 * The repo id is everything up to the final path segment. A legacy/custom model
 * id with no slash is returned unchanged (and simply won't match the catalog).
 */
export const repoIdFromModelId = (modelId: string): string => {
  const lastSlash = modelId.lastIndexOf("/");
  return lastSlash === -1 ? modelId : modelId.slice(0, lastSlash);
};

export interface ModelLanguageCapabilities {
  supportsLanguageSelection: boolean;
  supportedLanguages?: string[]; // undefined = no known restriction (show all)
}

/**
 * Mirror Handy's rule: a model offers language selection only when it advertises
 * more than one language. An unknown model (not in the catalog) is treated
 * permissively — allow selection across all languages — since we can't prove it
 * is single-language.
 */
export const languageCapabilities = (
  entry?: CatalogEntry,
): ModelLanguageCapabilities => {
  if (!entry) return { supportsLanguageSelection: true };
  const languages = entry.languages ?? [];
  return {
    supportsLanguageSelection: languages.length > 1,
    supportedLanguages: languages.length > 0 ? languages : undefined,
  };
};

export interface ModelCapabilities extends ModelLanguageCapabilities {
  name: string;
}

/**
 * Resolve display name + language capabilities for a stored model id. Handles
 * both the current HF-cache id format (`{repo}/{file}`) and legacy short ids
 * (e.g. "small") that older Handy builds persist. Returns undefined for unknown
 * (e.g. custom) models, letting callers fall back to permissive behaviour.
 */
export const getModelCapabilities = (
  modelId: string,
): ModelCapabilities | undefined => {
  const entry = getCatalogEntry(repoIdFromModelId(modelId));
  if (entry) return { name: entry.name, ...languageCapabilities(entry) };

  const legacy = legacyModelById.get(modelId);
  if (legacy) {
    return {
      name: legacy.name,
      supportsLanguageSelection: legacy.supportsLanguageSelection,
      supportedLanguages: legacy.supportedLanguages,
    };
  }
  return undefined;
};

/** Fallback display name for a repo with no catalog entry. */
export const prettifyRepo = (repoId: string): string => {
  const repoName = repoId.split("/").pop() ?? repoId;
  return repoName.replace(/-gguf$/, "").replace(/-/g, " ");
};
