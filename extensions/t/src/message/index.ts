export * from "./ko";
export * from "./en";

export enum Message {
  OriginalText,
  TranslatedText,
  SavedSearchResults,
  History,
  Setting,
  RegisterApiKey,
  View,
  Copy,
  Delete,
  Save,
  Google,
  Papago,
  IssuePapagoToken,
  IssueATokenFromTheBottomMenu,
  ItDoesNotHaveTraslatedText,
  Disabled,
}

export type MessageMap = { [key in Message]: string };
