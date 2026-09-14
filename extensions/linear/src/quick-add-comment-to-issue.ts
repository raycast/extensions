import {
  Clipboard,
  closeMainWindow,
  getPreferenceValues,
  open,
  Toast,
  showToast,
  showHUD,
  Keyboard,
} from "@raycast/api";

import { getLinearClient } from "./api/linearClient";
import { withWorkspaceAuth } from "./api/withWorkspaceAuth";
import { resolveWorkspaceArgument, updateWorkspaceChoicesSubtitle } from "./helpers/workspaceArgument";

const command = async (props: {
  arguments: Arguments.QuickAddCommentToIssue;
  launchContext?: { refreshSubtitle?: boolean };
}) => {
  await updateWorkspaceChoicesSubtitle(); // awaited: the no-view process exits when the command resolves — a fire-and-forget write would be killed

  if (props.launchContext?.refreshSubtitle) {
    return; // background refresh launch — subtitle updated above, do nothing else
  }

  const { issueId, comment } = props.arguments;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Adding comment to ${issueId}`,
  });

  const resolved = await resolveWorkspaceArgument(props.arguments.workspace);
  if (!resolved.ok) {
    toast.style = Toast.Style.Failure;
    toast.title = "Workspace not matched";
    toast.message = resolved.message;
    return;
  }

  const preferences = getPreferenceValues<Preferences.QuickAddCommentToIssue>();

  try {
    const linearClient = resolved.client ?? getLinearClient().linearClient;

    if (preferences.shouldCloseMainWindow) {
      await closeMainWindow();
    }

    const payload = await linearClient.createComment({
      body: comment,
      issueId,
    });

    const newComment = await payload.comment;

    if (!payload.success || !newComment) {
      throw Error("Something went wrong");
    }

    const successTitle = `Added comment to ${issueId}`;

    if (preferences.shouldCloseMainWindow) {
      showHUD(successTitle);
    } else {
      toast.style = Toast.Style.Success;
      toast.title = successTitle;
      if (newComment) {
        toast.primaryAction = {
          title: "Open Comment",
          shortcut: Keyboard.Shortcut.Common.OpenWith,
          onAction: async () => {
            await open(newComment.url);
            await toast.hide();
          },
        };
      }
    }
  } catch (e) {
    const failureTitle = `Failed adding comment to ${issueId}`;

    if (preferences.shouldCloseMainWindow) {
      showHUD(failureTitle);
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = failureTitle;
      toast.primaryAction = {
        title: "Copy Error Log",
        shortcut: Keyboard.Shortcut.Common.Copy,
        onAction: () => Clipboard.copy(e instanceof Error ? (e.stack ?? e.message) : String(e)),
      };
    }
  }
};

export default withWorkspaceAuth(command);
