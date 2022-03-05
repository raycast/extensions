export * from "./ko";
export * from "./en";

export enum Message {
  Original_Text,
  Translated_text,
  Saved_search_results,
  History,
  Setting,
  Register_API_Key,
  View,
  Copy,
  Delete,
  Save,
  Google,
  Papago,
  Issue_Papago_token,
  Issue_a_token_from_the_bottom_menu,
  It_does_not_have_traslated_text,
  Disabled,
}

export type MessageMap = { [key in Message]: string };
