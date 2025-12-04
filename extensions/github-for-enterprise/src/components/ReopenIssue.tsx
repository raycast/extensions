import { REOPEN_ISSUE } from "@/queries/issues";
import { fetcher } from "@/utils";
import { Color, showToast, Action, Toast } from "@raycast/api";
import { useSWRConfig } from "swr";

export default function ReopenIssue({ id, number }: any) {
  const { mutate } = useSWRConfig();

  async function reopenIssue() {
    showToast({
      style: Toast.Style.Animated,
      title: "Reopening issue",
    });

    try {
      await fetcher({
        document: REOPEN_ISSUE,
        variables: {
          id,
        },
      });

      mutate("issues");
      mutate("issues-search");
      mutate("issues-recent");
      showToast({
        style: Toast.Style.Success,
        title: `Issue #${number} reopened`,
      });
    } catch (error: any) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to reopen issue",
        message: error instanceof Error ? error.message : error.toString(),
      });
    }
  }

  return (
    <Action
      title="Reopen Issue"
      icon={{
        source: "issue-open.png",
        tintColor: Color.PrimaryText,
      }}
      shortcut={{
        modifiers: ["cmd", "shift"],
        key: "o",
      }}
      onAction={reopenIssue}
    />
  );
}
