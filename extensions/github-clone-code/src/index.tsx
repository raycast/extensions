import { CodeManager } from "./CodeManager";
import { GitHubManager } from "./GitHubManager";
import { OwnersList } from "./components/OwnersList";
import type { Preferences } from "./types";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();
const codeManager = new CodeManager(preferences.clonePath, preferences.editorCommand);
const githubManager = new GitHubManager(preferences.token);

export default function Command() {
  return <OwnersList codeManager={codeManager} githubManager={githubManager} />;
}
