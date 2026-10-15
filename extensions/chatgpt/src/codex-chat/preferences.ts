import { getPreferenceValues } from "@raycast/api";

export type CodexChatPreferences = Pick<
  Preferences.AskCodex,
  "chatWindow" | "liveSearch" | "sandboxMode" | "workingDirectory" | "codexPath"
>;

export function getCodexPreferences(): CodexChatPreferences {
  const preferences = getPreferenceValues<Preferences.AskCodex>();
  // Only pass CLI settings to the companion; never serialize API credentials.
  return {
    chatWindow: preferences.chatWindow,
    liveSearch: preferences.liveSearch,
    sandboxMode: preferences.sandboxMode,
    workingDirectory: preferences.workingDirectory,
    codexPath: preferences.codexPath,
  };
}
