export type FormActionPreference =
  | "openObsidian"
  | "copyObsidianUrl"
  | "copyObsidianUrlAsMarkdown"
  | "openUrl"
  | "openUrlInCurrentWindow"
  | "copyUrl"
  | "copyUrlAsMarkdown"
  | "clearCache"
  | "fetchContent"
  | "refetchUrl"
  | "saveChanges";

export type DetailActionPreference =
  | FormActionPreference
  | "showDetails"
  | "toggleFavorite"
  | "moveFavoriteUp"
  | "moveFavoriteDown"
  | "editBookmark"
  | "markAsRead"
  | "deleteFile";

export interface Preferences {
  vaultPath: string;
  bookmarksPath: string;
  saveSubfolder: string;
  ignoreSubfolders: string;
  defaultFormAction: FormActionPreference;
  defaultItemAction: DetailActionPreference;
  extraTags?: string;
  requiredTags?: string;
  datePrefix: boolean;
  useBrowserExtension: boolean;
  searchRecursively: boolean;
  checkDuplicates: boolean;
  faviconField?: string;
}
