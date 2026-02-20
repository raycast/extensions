import { Clipboard, closeMainWindow, getPreferenceValues, open, Toast, showToast } from "@raycast/api";

import { getLinearClient } from "./api/linearClient";
import { resolveActiveClient } from "./api/resolveActiveClient";

const command = async (props: { arguments: Arguments.CreateIssueForMyself }) => {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Creating issue" });

  try {
    await resolveActiveClient();
    const { linearClient } = getLinearClient();

    const preferences = getPreferenceValues<Preferences.CreateIssueForMyself>();

    if (preferences.shouldCloseMainWindow) {
      await closeMainWindow();
    }

    const viewer = await linearClient.viewer;
    const teams = await viewer.teams();

    const team = preferences.preferredTeamKey
      ? teams.nodes.find((t) => t.key === preferences.preferredTeamKey)
      : teams.nodes[0];
    if (!team) {
      throw Error("No team found");
    }

    let stateId: string | undefined;

    if (preferences.preferredStatusName) {
      const states = await linearClient.workflowStates({
        filter: {
          team: { id: { eq: team.id } },
          name: { eq: preferences.preferredStatusName },
        },
      });

      const state = states.nodes[0];

      if (!state) {
        throw Error(`Status "${preferences.preferredStatusName}" not found`);
      }

      stateId = state.id;
    }

    const payload = await linearClient.createIssue({
      teamId: team.id,
      title: props.arguments.title,
      description: props.arguments.description,
      assigneeId: viewer.id,
      stateId: stateId,
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

export default command;
