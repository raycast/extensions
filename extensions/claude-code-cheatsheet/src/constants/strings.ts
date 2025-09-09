// UI Text Constants
export const UI_STRINGS = {
  // List strings
  searchPlaceholder: "Search commands, options, or keywords...",
  selectCategory: "Select Category",
  allCategories: "All Categories",
  noCommandsFound: "No Commands Found",
  noCommandsDescription: "Couldn't find any commands matching your search. Try a different keyword.",

  // Action strings
  copyToClipboard: "Copy to Clipboard",
  pasteCommand: "Paste Command",
  pasteKeyword: "Paste Keyword",
  showDetails: "Show Details",
  copyKeyword: "Copy Keyword",
  copyUsage: "Copy Usage",
  copyExample: "Copy Example",
  pasteUsage: "Paste Usage",
  pasteExample: "Paste Example",

  // Notification strings
  copiedToClipboard: 'Copied "{0}" to clipboard.',
  keywordCopied: 'Keyword "{0}" copied to clipboard',
  usageCopied: "Usage copied to clipboard",
  exampleCopied: "Example copied to clipboard",

  // Markdown section headers
  description: "Description",
  usage: "Usage",
  example: "Example",
  thinkingKeywordDetails: "Thinking Keyword Details",
  budget: "Budget",
  tokens: "Tokens",
  deprecated: "⚠️ Deprecated",
  warning: "⚠️ Warning",
  tags: "Tags",
  alternative: "Alternative",
  deprecatedNotice: "This command is deprecated and should not be used.",
  warningNotice: "Use this command with caution.",

  // Display prefixes
  deprecatedPrefix: "[DEPRECATED]",
  addToPrompt: "Add to end of prompt",
  yourPromptHere: "Your prompt here",
};

// Helper function to replace placeholders in notification messages
export function formatString(template: string, ...args: string[]): string {
  return template.replace(/\{(\d+)\}/g, (match, index) => {
    const argIndex = parseInt(index, 10);
    return args[argIndex] !== undefined ? args[argIndex] : match;
  });
}
