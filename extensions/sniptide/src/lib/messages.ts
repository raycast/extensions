// Every sentence the extension shows, in one place. Success messages are short past-tense phrases
// without a closing period, and errors say what failed and what to do, as the app's toasts do.

export const messages = {
  // Search
  searchPastes: "Search your pastes",
  searchPastesIn: (collection: string) => `Search in ${collection}`,
  searchCollections: "Search your collections",
  allPastes: "All Pastes",
  collectionFilter: "Filter by Collection",
  collections: "Collections",
  noPastesTitle: "No pastes yet",
  noPastesBody: "Create one with the Create Paste command.",
  noMatchesTitle: "No pastes match your search",
  noCollectionsTitle: "No collections yet",
  noCollectionsBody: "Create a collection in Sniptide to group your pastes.",
  pasteCount: (count: number) => (count === 1 ? "1 paste" : `${count} pastes`),
  fileCount: (count: number) => (count === 1 ? "1 file" : `${count} files`),
  lines: (count: number) => (count === 1 ? "1 line" : `${count} lines`),

  // Actions
  paste: "Paste Code",
  copy: "Copy Code",
  copyLink: "Copy Link",
  open: "Open in Sniptide",
  show: "Show Paste",
  showPastes: "Show Pastes",
  chooseFile: "Choose a File",
  create: "Create Paste",
  createAndCopy: "Create Paste and Copy Link",
  openPreferences: "Open Extension Preferences",

  // Toasts and HUDs
  codeCopied: "Code copied",
  linkCopied: "Link copied",
  creating: "Creating paste",
  loadingPaste: "Loading paste",
  emptyPaste: "This paste has no files.",
  nothingSelected: "Nothing is selected. Select some text and try again.",
  clipboardEmpty: "The clipboard holds no text. Copy some text and try again.",

  // Create form
  contentLabel: "Content",
  contentPlaceholder: "Paste or type what you want to save",
  contentRequired: "Enter the content to save.",
  titleLabel: "Title",
  titlePlaceholder: "The content's first line",
  fileNameLabel: "File Name",
  fileNameInfo: "The extension sets the language, such as snippet.ts for TypeScript.",
  fileNameInvalid: "Enter a file name without slashes, up to 120 characters.",
  visibilityLabel: "Visibility",
  unlisted: "Unlisted",
  private: "Private",
  public: "Public",
  collectionLabel: "Collection",
  tagsLabel: "Tags",
  updatedLabel: "Updated",
  linkLabel: "Link",
  noCollection: "No Collection",

  // Errors
  failed: "Couldn't reach your pastes",
  createFailed: "Couldn't create the paste",
  tokenRejected: "Sniptide rejected the API token. Check it in the extension preferences.",
  readOnly:
    "This API token is read-only. Create a token with write access and set it in the extension preferences.",
  unreachable: "Can't reach Sniptide. Check your connection and the instance address.",
  rateLimited: "Sniptide is limiting requests from this token. Wait a few minutes and try again.",
  invalidInstance:
    "The instance address must use https://, such as https://paste.example.com. Change it in the extension preferences.",
  invalidToken: "The API token is empty or malformed. Paste it again in the extension preferences.",
  unexpected: "Something went wrong. Try again.",
}
