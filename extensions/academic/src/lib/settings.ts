import { LocalStorage } from "@raycast/api";
import {
  DEFAULT_COUNTRY_IDS,
  DEFAULT_ARTICLE_SOURCE_IDS,
  DEFAULT_BOOK_SOURCE_IDS,
  DEFAULT_ENCYCLOPEDIA_IDS,
  DEFAULT_FORMAT_IDS,
  DEFAULT_LANGUAGE_IDS,
  DEFAULT_MARKETPLACE_IDS,
  DEFAULT_METADATA_SOURCE_IDS,
  DEFAULT_SOURCE_IDS,
  ARTICLE_SOURCES,
  ALL_SOURCE_OPTIONS,
  BASIC_ENCYCLOPEDIA_IDS,
  BOOK_SOURCES,
  COUNTRIES,
  ENCYCLOPEDIA_SOURCES,
  METADATA_SOURCES,
  marketplaceId,
} from "../config/catalog";
import type { FileFormat } from "../types";
import type { AnalysisEngine, RenameMode } from "../local-library/types";

const STORAGE_KEY = "academic.settings.v4";
const LEGACY_STORAGE_KEYS = [
  "academic.settings.v3",
  "academic.settings.v2",
  "academic.settings.v1",
];

export type AcademicSettings = {
  sources: string[];
  metadataSources: string[];
  encyclopediaSources: string[];
  languages: string[];
  countries: string[];
  marketplaces: string[];
  formats: FileFormat[];
  includeUnknownLanguage: boolean;
  showWorksWithoutAcceptedFiles: boolean;
  hideLowConfidenceResults: boolean;
  showUnavailableSources: boolean;
  defaultCitationStyle: "abnt" | "apa" | "chicago" | "mla";
  localFolders: string[];
  enableExperimentalAnalysis: boolean;
  analysisEngine: AnalysisEngine;
  allowExternalAnalysis: boolean;
  ollamaBaseUrl: string;
  ollamaModel: string;
  ollamaEmbeddingModel: string;
  renameMode: RenameMode;
  articleRenameTemplate: string;
  bookRenameTemplate: string;
  otherRenameTemplate: string;
  documentsPerRun: number;
  pauseOnBattery: boolean;
};

export const DEFAULT_SETTINGS: AcademicSettings = {
  sources: DEFAULT_SOURCE_IDS,
  metadataSources: DEFAULT_METADATA_SOURCE_IDS,
  encyclopediaSources: DEFAULT_ENCYCLOPEDIA_IDS,
  languages: DEFAULT_LANGUAGE_IDS,
  countries: DEFAULT_COUNTRY_IDS,
  marketplaces: DEFAULT_MARKETPLACE_IDS,
  formats: DEFAULT_FORMAT_IDS,
  includeUnknownLanguage: false,
  showWorksWithoutAcceptedFiles: true,
  hideLowConfidenceResults: true,
  showUnavailableSources: false,
  defaultCitationStyle: "abnt",
  localFolders: [],
  enableExperimentalAnalysis: false,
  analysisEngine: "local",
  allowExternalAnalysis: false,
  ollamaBaseUrl: "http://127.0.0.1:11434",
  ollamaModel: "qwen3:4b",
  ollamaEmbeddingModel: "embeddinggemma",
  renameMode: "suggest",
  articleRenameTemplate: "{author} - {year} - {type} - {title} - {journal}",
  bookRenameTemplate: "{author} - {year} - {type} - {title} - {publisher}",
  otherRenameTemplate: "{author} - {year} - {type} - {title}",
  documentsPerRun: 3,
  pauseOnBattery: true,
};

type StoredSettings = {
  settings: AcademicSettings;
  nativeSnapshot: Record<string, string | boolean>;
};

export async function loadSettings(
  nativePreferences?: Preferences,
): Promise<AcademicSettings> {
  const currentStored = await LocalStorage.getItem<string>(STORAGE_KEY);
  const legacyStored = currentStored
    ? undefined
    : (
        await Promise.all(
          LEGACY_STORAGE_KEYS.map((key) => LocalStorage.getItem<string>(key)),
        )
      ).find(Boolean);
  const stored = currentStored ?? legacyStored;
  const currentNative = nativePreferences
    ? nativeSnapshot(nativePreferences)
    : {};
  if (!stored) {
    const settings = nativePreferences
      ? applyNativeChanges(DEFAULT_SETTINGS, {}, currentNative)
      : DEFAULT_SETTINGS;
    await persist(settings, currentNative);
    return settings;
  }
  try {
    const parsed = JSON.parse(stored) as Partial<StoredSettings> &
      Partial<AcademicSettings>;
    const value = (parsed.settings ?? parsed) as Partial<AcademicSettings>;
    let settings: AcademicSettings = {
      ...DEFAULT_SETTINGS,
      ...value,
      sources: arrayOrDefault(value.sources, DEFAULT_SETTINGS.sources),
      metadataSources: arrayOrDefault(
        value.metadataSources,
        DEFAULT_SETTINGS.metadataSources,
      ),
      encyclopediaSources: arrayOrDefault(
        value.encyclopediaSources,
        DEFAULT_SETTINGS.encyclopediaSources,
      ),
      languages: arrayOrDefault(value.languages, DEFAULT_SETTINGS.languages),
      countries: arrayOrDefault(value.countries, DEFAULT_SETTINGS.countries),
      marketplaces: arrayOrDefault(
        value.marketplaces,
        DEFAULT_SETTINGS.marketplaces,
      ),
      formats: arrayOrDefault(value.formats, DEFAULT_SETTINGS.formats),
      localFolders: arrayOrDefault(
        value.localFolders,
        DEFAULT_SETTINGS.localFolders,
      ),
    };
    if (legacyStored) settings = migrateLegacyDefaults(settings);
    if (nativePreferences && !legacyStored)
      settings = applyNativeChanges(
        settings,
        parsed.nativeSnapshot ?? {},
        currentNative,
      );
    await persist(settings, currentNative);
    return settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function migrateLegacyDefaults(settings: AcademicSettings): AcademicSettings {
  const oldSources = ALL_SOURCE_OPTIONS.filter(
    (source) =>
      !["google-books", "unpaywall", "catalog-mirrors"].includes(source.id),
  ).map((source) => source.id);
  const oldMetadata = METADATA_SOURCES.filter(
    (source) =>
      !["google-books", "unpaywall", "amazon-metadata"].includes(source.id),
  ).map((source) => source.id);
  const oldCountries = ["br", "pt", "us", "gb"];
  const oldMarketplaces = COUNTRIES.filter((country) =>
    oldCountries.includes(country.id),
  ).flatMap((country) =>
    country.marketplaces.map((marketplace) =>
      marketplaceId(country.id, marketplace.name),
    ),
  );
  return {
    ...settings,
    sources: sameSet(settings.sources, oldSources)
      ? DEFAULT_SETTINGS.sources
      : settings.sources,
    metadataSources: sameSet(settings.metadataSources, oldMetadata)
      ? DEFAULT_SETTINGS.metadataSources
      : settings.metadataSources,
    encyclopediaSources: sameSet(
      settings.encyclopediaSources,
      BASIC_ENCYCLOPEDIA_IDS,
    )
      ? []
      : settings.encyclopediaSources,
    countries: sameSet(settings.countries, oldCountries)
      ? []
      : settings.countries,
    marketplaces: sameSet(settings.marketplaces, oldMarketplaces)
      ? []
      : settings.marketplaces,
  };
}

function sameSet(left: string[], right: string[]): boolean {
  return (
    left.length === right.length && left.every((value) => right.includes(value))
  );
}

export function settingsPreferenceFingerprint(
  preferences: Preferences,
): string {
  return JSON.stringify(nativeSnapshot(preferences));
}

export async function saveSettings(
  settings: AcademicSettings,
  nativePreferences?: Preferences,
): Promise<void> {
  await persist(
    settings,
    nativePreferences ? nativeSnapshot(nativePreferences) : {},
  );
}

function arrayOrDefault<T>(value: T[] | undefined, fallback: T[]): T[] {
  return Array.isArray(value) ? value : fallback;
}

export function preferenceName(
  scope:
    | "access"
    | "metadata"
    | "encyclopedia"
    | "language"
    | "country"
    | "marketplace"
    | "format",
  id: string,
): string {
  return `${scope}__${id.replace(/[^a-z0-9]+/gi, "_")}`;
}

function nativeSnapshot(
  preferences: Preferences,
): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};
  for (const key of [
    "enableBookSources",
    "enableArticleSources",
    "enableMetadataSources",
    "enableEncyclopedias",
    "includeUnknownLanguage",
    "showWorksWithoutAcceptedFiles",
    "hideLowConfidenceResults",
    "showUnavailableSources",
    "defaultCitationStyle",
    "enableExperimentalAnalysis",
    "analysisEngine",
    "allowExternalAnalysis",
    "renameMode",
  ] as const) {
    const value = preferences[key];
    if (typeof value === "boolean" || typeof value === "string")
      result[key] = value;
  }
  return result;
}

function applyNativeChanges(
  settings: AcademicSettings,
  previous: Record<string, string | boolean>,
  current: Record<string, string | boolean>,
): AcademicSettings {
  const next = { ...settings };
  next.sources = applyCategory(
    "enableBookSources",
    next.sources,
    BOOK_SOURCES.map((source) => source.id),
    DEFAULT_BOOK_SOURCE_IDS,
    previous,
    current,
  );
  next.sources = applyCategory(
    "enableArticleSources",
    next.sources,
    ARTICLE_SOURCES.map((source) => source.id),
    DEFAULT_ARTICLE_SOURCE_IDS,
    previous,
    current,
  );
  next.metadataSources = applyCategory(
    "enableMetadataSources",
    next.metadataSources,
    METADATA_SOURCES.map((source) => source.id),
    DEFAULT_METADATA_SOURCE_IDS,
    previous,
    current,
  );
  next.encyclopediaSources = applyCategory(
    "enableEncyclopedias",
    next.encyclopediaSources,
    ENCYCLOPEDIA_SOURCES.map((source) => source.id),
    BASIC_ENCYCLOPEDIA_IDS,
    previous,
    current,
  );
  for (const field of [
    "includeUnknownLanguage",
    "showWorksWithoutAcceptedFiles",
    "hideLowConfidenceResults",
    "showUnavailableSources",
    "enableExperimentalAnalysis",
  ] as const) {
    if (
      field in current &&
      (!(field in previous) || current[field] !== previous[field])
    )
      next[field] = Boolean(current[field]);
  }
  if (
    typeof current.defaultCitationStyle === "string" &&
    (!("defaultCitationStyle" in previous) ||
      current.defaultCitationStyle !== previous.defaultCitationStyle)
  )
    next.defaultCitationStyle =
      current.defaultCitationStyle as AcademicSettings["defaultCitationStyle"];
  if (
    typeof current.analysisEngine === "string" &&
    (!("analysisEngine" in previous) ||
      current.analysisEngine !== previous.analysisEngine)
  )
    next.analysisEngine = current.analysisEngine as AnalysisEngine;
  if (
    "allowExternalAnalysis" in current &&
    (!("allowExternalAnalysis" in previous) ||
      current.allowExternalAnalysis !== previous.allowExternalAnalysis)
  )
    next.allowExternalAnalysis = Boolean(current.allowExternalAnalysis);
  if (
    typeof current.renameMode === "string" &&
    (!("renameMode" in previous) || current.renameMode !== previous.renameMode)
  )
    next.renameMode = current.renameMode as RenameMode;
  return next;
}

function applyCategory(
  key: string,
  selected: string[],
  allIds: string[],
  basicIds: string[],
  previous: Record<string, string | boolean>,
  current: Record<string, string | boolean>,
): string[] {
  if (!(key in current) || (key in previous && current[key] === previous[key]))
    return selected;
  return current[key]
    ? [...new Set([...selected, ...basicIds])]
    : selected.filter((id) => !allIds.includes(id));
}

async function persist(
  settings: AcademicSettings,
  snapshot: Record<string, string | boolean>,
): Promise<void> {
  await LocalStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      settings,
      nativeSnapshot: snapshot,
    } satisfies StoredSettings),
  );
}
