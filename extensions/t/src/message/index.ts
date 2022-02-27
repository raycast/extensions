export * from "./ko";
export * from "./en";

export enum Message {
  originalText,
  translatedText,
  savedSearchResults,
  history,
  setting,
  registerApiKey,
  view,
  copy,
  delete,
  save,
  google,
  papago,
  issuingPapagoToken,
  issueATokenFromTheBottomMenu,
  itDoesNotHaveTraslatedText,
  disabled,
}

export type MessageMap = { [key in Message]: string };
