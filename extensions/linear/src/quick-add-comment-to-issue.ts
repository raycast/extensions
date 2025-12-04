import { LinearClient } from "@linear/sdk";
import { Clipboard, closeMainWindow, getPreferenceValues, open, Toast, showToast, showHUD } from "@raycast/api";
import { getAccessToken, withAccessToken } from "@raycast/utils";

import { linear } from "./api/linearClient";

const command = async (props: { arguments: Arguments.QuickAddCommentToIssue }) => {
  const { issueId, comment } = props.arguments;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Adding comment to ${issueId}`,
  });

  const preferences = getPreferenceValues<Preferences.QuickAddCommentToIssue>();

  try {
    const { token } = getAccessToken();
    const linearClient = new LinearClient({ accessToken: token });

    if (preferences.shouldCloseMainWindow) {
      await closeMainWindow();
    }

    const payload = await linearClient.createComment({
      body: comment,
      issueId,
    });

    const newComment = await payload.comment;

    if (!payload.success || !comment) {
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
          shortcut: { modifiers: ["cmd", "shift"], key: "o" },
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
        shortcut: { modifiers: ["cmd", "shift"], key: "c" },
        onAction: () => Clipboard.copy(e instanceof Error ? (e.stack ?? e.message) : String(e)),
      };
    }
  }
};

export default withAccessToken(linear)(command);
