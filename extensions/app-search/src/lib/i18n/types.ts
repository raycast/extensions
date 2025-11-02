/**
 * i18n type definitions
 */

export type SupportedLanguage = "en" | "ja";

export interface I18nMessages {
  // Search UI
  searchBarPlaceholder: string;
  emptyViewTitle: string;
  emptyViewDescription: (query: string) => string;

  // Section titles
  installedSectionTitle: (count: number) => string;
  installedSectionSubtitle: string;
  suggestionsSectionTitle: (count: number) => string;
  suggestionsSectionSubtitle: string;
  askAISectionTitle: string;

  // List items
  askAITitle: string;
  askAISubtitle: string;
  askAIAccessory: string;
  matchScoreTooltip: string;
  bundleIdTooltip: string;

  // Actions
  launchApplication: string;
  showInFinder: string;
  copyPath: string;
  copyBundleId: string;
  searchWithAI: string;
  searchOnWeb: string;
  visitOfficialWebsite: string;
  copyAppName: string;

  // Match reasons
  matchReasonExact: string;
  matchReasonPrefix: string;
  matchReasonAI: string;
  matchReasonCategory: string;
  matchReasonAISuggested: string;
  matchReasonContains: string;

  // Suggestions
  popularApp: (category: string) => string;

  // Error messages
  searchFailed: string;
  searchFailedMessage: string;
}
