import { readFileSync, writeFileSync } from "node:fs";

type Preference = Record<string, unknown>;
type Manifest = { preferences?: Preference[] } & Record<string, unknown>;

const manifestPath = new URL("../package.json", import.meta.url);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
const secureNames = new Set([
  "contactEmail",
  "googleBooksApiKey",
  "semanticScholarApiKey",
  "coreApiKey",
  "openUrlResolver",
  "openAIApiKey",
  "openAIModel",
  "anthropicApiKey",
  "anthropicModel",
  "geminiApiKey",
  "geminiModel",
]);
const securePreferences = (manifest.preferences ?? []).filter((preference) =>
  secureNames.has(String(preference.name)),
);

const checkbox = (
  name: string,
  title: string,
  label: string,
  description: string,
  enabled: boolean,
): Preference => ({
  name,
  title,
  label,
  description,
  type: "checkbox",
  default: enabled,
  required: false,
});

manifest.preferences = [
  ...securePreferences,
  checkbox(
    "enableBookSources",
    "Book Sources",
    "Enable basic book sources",
    "Open Library, Internet Archive and Project Gutenberg. Fine-tune providers in Config.",
    true,
  ),
  checkbox(
    "enableArticleSources",
    "Article Sources",
    "Enable basic article sources",
    "Major scholarly APIs and open repositories. Fine-tune providers in Config.",
    true,
  ),
  checkbox(
    "enableMetadataSources",
    "Metadata Sources",
    "Enable basic metadata sources",
    "Trusted bibliographic enrichment providers. Fine-tune providers in Config.",
    true,
  ),
  checkbox(
    "enableEncyclopedias",
    "Encyclopedias",
    "Enable basic encyclopedias",
    "SEP, IEP, Encyclopedia of Mathematics and NCBI Bookshelf.",
    false,
  ),
  checkbox(
    "includeUnknownLanguage",
    "Unknown Languages",
    "Include records with unknown language",
    "Language details are configured inside Config.",
    false,
  ),
  checkbox(
    "showWorksWithoutAcceptedFiles",
    "Metadata-only Works",
    "Keep metadata-only works",
    "Keep catalog records even when no accepted full-text file is found.",
    true,
  ),
  checkbox(
    "hideLowConfidenceResults",
    "Result Quality",
    "Hide weak matches",
    "Remove weak and merely related results from simple search.",
    true,
  ),
  checkbox(
    "showUnavailableSources",
    "Unavailable Sources",
    "Show unavailable sources",
    "Display provider errors below search results. Disabled by default so only found sources are shown.",
    false,
  ),
  {
    name: "defaultCitationStyle",
    title: "Default Citation Style",
    description: "Style used first by Bib and citation actions.",
    type: "dropdown",
    default: "abnt",
    required: false,
    data: [
      { title: "ABNT", value: "abnt" },
      { title: "APA", value: "apa" },
      { title: "Chicago", value: "chicago" },
      { title: "MLA", value: "mla" },
    ],
  },
  checkbox(
    "enableExperimentalAnalysis",
    "Experimental Analysis",
    "Enable experimental summaries, key points and semantic relationships",
    "Disabled by default. Basic indexing, OCR, metadata matching and safe rename checks remain available.",
    false,
  ),
  {
    name: "analysisEngine",
    title: "Experimental Analysis Engine",
    description:
      "Used only when Experimental Analysis is enabled. Detailed options are available in Config.",
    type: "dropdown",
    default: "local",
    required: false,
    data: [
      { title: "Local Basic (Private)", value: "local" },
      { title: "Ollama (Local)", value: "ollama" },
      { title: "Raycast AI", value: "raycast" },
      { title: "OpenAI API", value: "openai" },
      { title: "Anthropic Claude API", value: "anthropic" },
      { title: "Google Gemini API", value: "gemini" },
    ],
  },
  checkbox(
    "allowExternalAnalysis",
    "Experimental External AI",
    "Allow extracted document text to be sent to the selected external provider",
    "Used only by the experimental feature. Required for Raycast AI, OpenAI, Anthropic or Gemini. Ollama and Local Basic remain on-device.",
    false,
  ),
  {
    name: "renameMode",
    title: "File Renaming",
    description:
      "Automatic mode still requires exact identifier, metadata, OCR title and OCR author agreement.",
    type: "dropdown",
    default: "suggest",
    required: false,
    data: [
      { title: "Suggestions Only", value: "suggest" },
      { title: "Off", value: "off" },
      { title: "Automatic When Strictly Verified", value: "automatic" },
    ],
  },
];

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
