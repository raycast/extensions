import { LinearClient } from "@linear/sdk";
import { Clipboard, closeMainWindow, getPreferenceValues, open, Toast } from "@raycast/api";
import { authorize, oauthClient } from "./api/oauth";

type Arguments = {
  title: string;
  description?: string;
};

type Preferences = {
  preferredTeamKey?: string;
  shouldCloseMainWindow: boolean;
};

const command = async (props: { arguments: Arguments }) => {
  const toast = new Toast({ style: Toast.Style.Animated, title: "Creating issue" });
  await toast.show();

  try {
    const tokens = await oauthClient.getTokens();
    const accessToken = tokens?.accessToken || (await authorize());
    const linearClient = new LinearClient({ accessToken });

    const preferences: Preferences = getPreferenceValues();

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

    const payload = await linearClient.issueCreate({
      teamId: team.id,
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
      title: "Copy Issue Key",
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
      onAction: () => Clipboard.copy(e instanceof Error ? e.stack ?? e.message : String(e)),
    };
  }
};

export default command;
