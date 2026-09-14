import { getPreferenceValues, Toast, showToast } from "@raycast/api";

import { withWorkspaceAuth } from "./api/withWorkspaceAuth";
import { createIssueForMyself } from "./helpers/createIssueForMyself";
import { resolveWorkspaceArgument, updateWorkspaceChoicesSubtitle } from "./helpers/workspaceArgument";

const command = async (props: {
  arguments: Arguments.CreateIssueForMyselfInWorkspace;
  launchContext?: { refreshSubtitle?: boolean };
}) => {
  await updateWorkspaceChoicesSubtitle(); // awaited: the no-view process exits when the command resolves — a fire-and-forget write would be killed

  if (props.launchContext?.refreshSubtitle) {
    return; // background refresh launch — subtitle updated above, do nothing else
  }

  if (!props.arguments.workspace?.trim()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Workspace required",
      message: "Name the target workspace (URL key, email, or unique name prefix).",
    });
    return;
  }

  const resolved = await resolveWorkspaceArgument(props.arguments.workspace);
  if (!resolved.ok) {
    await showToast({ style: Toast.Style.Failure, title: "Workspace not matched", message: resolved.message });
    return;
  }

  const preferences = getPreferenceValues<Preferences.CreateIssueForMyselfInWorkspace>();

  await createIssueForMyself(
    { title: props.arguments.title, description: props.arguments.description },
    preferences,
    resolved.client,
  );
};

export default withWorkspaceAuth(command);
