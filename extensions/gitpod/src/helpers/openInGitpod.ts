import { LocalStorage, open, showToast, Toast } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";

import { getGitpodEndpoint } from "../preferences/gitpod_endpoint";

interface Preferences {
  preferredEditor: string;
  useLatest: boolean;
  preferredEditorClass: "g1-standard" | "g1-large";
}

export async function getPreferencesForContext(
  type: "Branch" | "Pull Request" | "Issue" | "Repository",
  repository: string,
  context?: string
) {
  let preferences = getPreferenceValues<Preferences>();
  if (type === "Branch" || type === "Pull Request" || type === "Issue") {
    const item = await LocalStorage.getItem<string>(`${repository}%${context}`);
    const contextPref = item ? await JSON.parse(item) : null;
    if (contextPref && contextPref.preferredEditor && contextPref.preferredEditorClass) {
      preferences = contextPref;
    } else {
      const repoItem = await LocalStorage.getItem<string>(`${repository}`);
      const repoPref = repoItem ? await JSON.parse(repoItem) : null;
      if (repoPref && repoPref.preferredEditor && repoPref.preferredEditorClass) {
        preferences = repoPref;
      }
    }
  } else if (type === "Repository") {
    const item = await LocalStorage.getItem<string>(`${repository}`);
    const repoPref = item ? await JSON.parse(item) : null;
    if (repoPref && repoPref.preferredEditor && repoPref.preferredEditorClass) {
      preferences = repoPref;
    }
  }
  return preferences;
}

export default async function OpenInGitpod(
  contextUrl: string,
  type: "Branch" | "Pull Request" | "Issue" | "Repository",
  repository: string,
  context?: string
) {
  const gitpodEndpoint = getGitpodEndpoint();
  const preferences = await getPreferencesForContext(type, repository, context);

  try {
    const toast = await showToast({
      title: "Launching your workspace",
      style: Toast.Style.Animated,
    });
    setTimeout(() => {
      toast.hide();
      if (preferences.preferredEditor === "ssh") {
        // TODO: Add a check if dotsh files are loaded in future
        open(
          `${gitpodEndpoint}/new/?useLatest=${preferences.useLatest}&editor=${"code"}${
            preferences.useLatest ? "-latest" : ""
          }&workspaceClass=${preferences.preferredEditorClass}#${contextUrl}`
        );
      } else {
        open(
          `${gitpodEndpoint}/new/?useLatest=${preferences.useLatest}&editor=${preferences.preferredEditor}${
            preferences.useLatest ? "-latest" : ""
          }&workspaceClass=${preferences.preferredEditorClass}#${contextUrl}`
        );
      }
    }, 1000);
  } catch (error) {
    await showToast({
      title: "Error launching workspace",
      style: Toast.Style.Failure,
    });
  }
}
