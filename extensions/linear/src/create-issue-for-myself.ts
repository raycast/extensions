import { getPreferenceValues } from "@raycast/api";

import { withWorkspaceAuth } from "./api/withWorkspaceAuth";
import { createIssueForMyself } from "./helpers/createIssueForMyself";
import { updateActiveWorkspaceSubtitle } from "./helpers/workspaceArgument";

const command = async (props: {
  arguments: Arguments.CreateIssueForMyself;
  launchContext?: { refreshSubtitle?: boolean };
}) => {
  await updateActiveWorkspaceSubtitle(); // awaited: the no-view process exits when the command resolves — a fire-and-forget write would be killed

  if (props.launchContext?.refreshSubtitle) {
    return; // background refresh launch — subtitle updated above, do nothing else
  }

  const preferences = getPreferenceValues<Preferences.CreateIssueForMyself>();

  await createIssueForMyself(
    { title: props.arguments.title, description: props.arguments.description },
    preferences,
    undefined,
  );
};

export default withWorkspaceAuth(command);
