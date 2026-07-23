import { getPreferenceValues } from "@raycast/api";

export interface PromptStudioPreferences {
  libraryDirectory: string;
  qmdExecutable: undefined;
  projectRoots: undefined;
  sshProjectRoot: undefined;
}

export function getPromptStudioPreferences(): PromptStudioPreferences {
  const preferences = getPreferenceValues<Preferences.BrowsePrompts>();
  return {
    libraryDirectory: preferences.libraryDirectory,
    qmdExecutable: undefined,
    projectRoots: undefined,
    sshProjectRoot: undefined,
  };
}
