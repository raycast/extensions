import { LaunchType, Toast, getPreferenceValues, launchCommand, showToast } from "@raycast/api";

import { IWorkspace } from "../api/Gitpod/Models/IWorkspace";
import { WorkspaceManager } from "../api/Gitpod/WorkspaceManager";
import { Preferences } from "../preferences/repository_preferences";

export default async function createWorksapceFromContext(defaultOrg: string, context_url: string) {
  const EditorPreferences = getPreferenceValues<Preferences>();

  IWorkspace.create(WorkspaceManager.api, {
    contextUrl: context_url,
    organizationId: defaultOrg,
    ignoreRunningPrebuild: true,
    ignoreRunningWorkspaceOnSameCommit: true,
    ideSetting: {
      defaultIde: EditorPreferences.preferredEditor === "ssh" ? "code" : EditorPreferences.preferredEditor,
      useLatestVersion: false,
    },
  });
  await showToast({
    title: "Starting your workspace",
    style: Toast.Style.Animated,
  });
  setTimeout(async () => {
    launchCommand({
      name: "gitpod_dashboard",
      type: LaunchType.UserInitiated,
    });
  }, 3000);
}
