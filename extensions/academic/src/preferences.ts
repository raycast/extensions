export function getSearchOptions(preferences: Preferences) {
  return {
    contactEmail: preferences.contactEmail?.trim(),
    googleBooksApiKey: preferences.googleBooksApiKey?.trim(),
    semanticScholarApiKey: preferences.semanticScholarApiKey?.trim(),
    coreApiKey: preferences.coreApiKey?.trim(),
  };
}
