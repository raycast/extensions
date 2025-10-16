import { LinearClient } from "@linear/sdk";
import { Clipboard, closeMainWindow, getPreferenceValues, open, Toast, showToast } from "@raycast/api";
import { getAccessToken, withAccessToken } from "@raycast/utils";

import { getTeams } from "./api/getTeams";
import { linear } from "./api/linearClient";

const command = async (props: { arguments: Arguments.CreateIssueForMyself }) => {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Creating issue" });

  try {
    const { token } = getAccessToken();
    const linearClient = new LinearClient({ accessToken: token });

    const preferences = getPreferenceValues<Preferences.CreateIssueForMyself>();

    if (preferences.shouldCloseMainWindow) {
      await closeMainWindow();
    }

    const viewer = await linearClient.viewer;
    const { teams } = await getTeams();

    let teamId: string | undefined;

    if (preferences.preferredTeamKey) {
      const team = teams.find((t) => t.key === preferences.preferredTeamKey);
      if (team) {
        teamId = team.id;
      }
    }

    if (!teamId) {
      teamId = teams[0].id;
    }

    if (!teamId) {
      throw Error("No team found");
    }

    const payload = await linearClient.createIssue({
      teamId: teamId,
      title: props.arguments.title,
      description: props.arguments.description,
      assigneeId: viewer.id,
    });

    const issue = await payload.issue;
    if (!payload.success || !issue) {
      throw Error("Something went wrong");
    }

    toast.style = Toast.Style.Success;
    toast.title = `Created issue • ${issue.identifier}`;
    toast.primaryAction = {
      title: "Open Issue",
      shortcut: { modifiers: ["cmd", "shift"], key: "o" },
      onAction: async () => {
        await open(issue.url);
        await toast.hide();
      },
    };

    toast.secondaryAction = {
      title: "Copy Issue ID",
      shortcut: { modifiers: ["cmd", "shift"], key: "c" },
      onAction: () => Clipboard.copy(issue.identifier),
    };
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed creating issue";
    toast.message = e instanceof Error ? e.message : String(e);
    toast.primaryAction = {
      title: "Copy Error Log",
      shortcut: { modifiers: ["cmd", "shift"], key: "c" },
      onAction: () => Clipboard.copy(e instanceof Error ? (e.stack ?? e.message) : String(e)),
    };
  }
};

export default withAccessToken(linear)(command);
