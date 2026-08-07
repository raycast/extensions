export type FormActionPreference =
  | "openObsidian"
  | "copyObsidianUrl"
  | "copyObsidianUrlAsMarkdown"
  | "openUrl"
  | "copyUrl"
  | "copyUrlAsMarkdown"
  | "clearCache"
  | "fetchContent";

export type DetailActionPreference = FormActionPreference | "showDetails" | "markAsRead" | "deleteFile";

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
}
