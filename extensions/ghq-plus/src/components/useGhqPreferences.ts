import { Application, getPreferenceValues } from "@raycast/api";
import { homedir } from "node:os";
import { useMemo } from "react";
import { resolveGhqBinary } from "../lib/ghq";

/** Reads what every command needs from the extension preferences: the ghq binary and the applications that open a repository. */
export function useGhqPreferences() {
  const preferences = getPreferenceValues<Preferences>();
  // Enter opens with the first configured app, ⌘ + Enter with the second (Raycast's default action shortcuts).
  const openers = [preferences.editor, preferences.terminal].filter((app): app is Application => app !== undefined);
  const ghqBinary = useMemo(() => resolveGhqBinary(preferences.ghqPath, homedir()), [preferences.ghqPath]);

  return { preferences, openers, ghqBinary };
}
