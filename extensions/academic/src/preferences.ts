export type ExtensionPreferences = {
  [key: string]: string | boolean | undefined;
  contactEmail?: string;
  googleBooksApiKey?: string;
  semanticScholarApiKey?: string;
  coreApiKey?: string;
  openUrlResolver?: string;
  openAIApiKey?: string;
  openAIModel?: string;
  anthropicApiKey?: string;
  anthropicModel?: string;
  geminiApiKey?: string;
  geminiModel?: string;
};

export function getSearchOptions(preferences: ExtensionPreferences) {
  return {
    contactEmail: preferences.contactEmail?.trim(),
    googleBooksApiKey: preferences.googleBooksApiKey?.trim(),
    semanticScholarApiKey: preferences.semanticScholarApiKey?.trim(),
    coreApiKey: preferences.coreApiKey?.trim(),
  };
}
