import { REOPEN_PR } from "@/queries/pull-requests";
import { fetcher } from "@/utils";
import { Color, showToast, Action, Toast } from "@raycast/api";
import { useSWRConfig } from "swr";

export default function ReopenPR({ id, number }: any) {
  const { mutate } = useSWRConfig();

  async function reopenPR() {
    showToast({
      style: Toast.Style.Animated,
      title: "Reopening pull request",
    });

    try {
      await fetcher({
        document: REOPEN_PR,
        variables: {
          id,
        },
      });

      mutate("prs");
      mutate("prs-open");
      showToast({
        style: Toast.Style.Success,
        title: `Pull request #${number} reopened`,
      });
    } catch (error: any) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to reopen pull request",
        message: error instanceof Error ? error.message : error.toString(),
      });
    }
  }

  return (
    <Action
      title="Reopen Pull Request"
      icon={{
        source: "pull-request.png",
        tintColor: Color.PrimaryText,
      }}
      shortcut={{
        modifiers: ["cmd", "shift"],
        key: "o",
      }}
      onAction={reopenPR}
    />
  );
}
