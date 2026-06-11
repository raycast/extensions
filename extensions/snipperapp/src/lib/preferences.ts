import { getPreferenceValues } from "@raycast/api";

export type SnippetActionValue = "paste" | "copy" | "copyMarkdown" | "open" | "details";

export interface Preferences {
  primaryAction: SnippetActionValue;
  secondaryAction: SnippetActionValue;
  enableFrecency: boolean;
  showWorkspace: boolean;
  showLanguage: boolean;
  showTags: boolean;
  trackHubAnalytics: boolean;
  helperPath?: string;
}

export function getPrefs(): Preferences {
  return getPreferenceValues<Preferences>();
}
