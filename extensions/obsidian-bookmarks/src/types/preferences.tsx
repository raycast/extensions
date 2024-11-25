export type FormActionPreference =
  | "openObsidian"
  | "copyObsidianUrl"
  | "copyObsidianUrlAsMarkdown"
  | "openUrl"
  | "copyUrl"
  | "copyUrlAsMarkdown"
  | "clearCache";

export type DetailActionPreference = FormActionPreference | "showDetails" | "markAsRead" | "deleteFile" | "clearCache";

export interface Preferences {
  vaultPath: string;
  bookmarksPath: string;
  defaultFormAction: FormActionPreference;
  defaultItemAction: DetailActionPreference;
  extraTags?: string;
  requiredTags?: string;
  datePrefix: boolean;
}
