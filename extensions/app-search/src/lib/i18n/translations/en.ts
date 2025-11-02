/**
 * English translations
 */

import { I18nMessages } from "../types";

export const en: I18nMessages = {
  // Search UI
  searchBarPlaceholder: "Search apps by name, purpose, or category...",
  emptyViewTitle: "No apps found",
  emptyViewDescription: (query: string) => `No applications found matching "${query}"`,

  // Section titles
  installedSectionTitle: (count: number) => `Installed (${count})`,
  installedSectionSubtitle: "Press Enter to launch",
  suggestionsSectionTitle: (count: number) => `Suggestions (${count})`,
  suggestionsSectionSubtitle: "Not installed - Press Enter to search",
  askAISectionTitle: "Need Better Results?",

  // List items
  askAITitle: "Ask AI for Smarter Search",
  askAISubtitle: "Use AI to find apps by purpose or description",
  askAIAccessory: "Press Enter",
  matchScoreTooltip: "Match score",
  bundleIdTooltip: "Bundle ID",

  // Actions
  launchApplication: "Launch Application",
  showInFinder: "Show in Finder",
  copyPath: "Copy Path",
  copyBundleId: "Copy Bundle ID",
  searchWithAI: "Search with AI",
  searchOnWeb: "Search on Web",
  visitOfficialWebsite: "Visit Official Website",
  copyAppName: "Copy App Name",

  // Match reasons
  matchReasonExact: "Exact match",
  matchReasonPrefix: "Prefix match",
  matchReasonAI: "AI recommended",
  matchReasonCategory: "Category match",
  matchReasonAISuggested: "AI suggested",
  matchReasonContains: "Contains match",

  // Suggestions
  popularApp: (category: string) => `Popular ${category.toLowerCase()}`,

  // Error messages
  searchFailed: "Search failed",
  searchFailedMessage: "An error occurred while searching for applications",
};
