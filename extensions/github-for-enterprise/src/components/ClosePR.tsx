import { CLOSE_PR } from "@/queries/pull-requests";
import { fetcher } from "@/utils";
import { Color, showToast, useNavigation, Action, Toast } from "@raycast/api";
import { useSWRConfig } from "swr";

export default function CloseIssue({ id, number, shouldPop }: any) {
  const { mutate } = useSWRConfig();
  const { pop } = useNavigation();

  async function closePR() {
    showToast({
      style: Toast.Style.Animated,
      title: "Closing pull request",
    });

    try {
      await fetcher({
        document: CLOSE_PR,
        variables: {
          id,
        },
      });

      mutate("prs");
      showToast({
        style: Toast.Style.Success,
        title: `Pull request #${number} closed`,
      });

      shouldPop && pop();
    } catch (error: any) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to close pull request",
        message: error instanceof Error ? error.message : error.toString(),
      });
    }
  }

  return (
    <Action
      title="Close Pull Request"
      icon={{
        source: "xmark-circle-16",
        tintColor: Color.PrimaryText,
      }}
      shortcut={{
        modifiers: ["cmd", "shift"],
        key: "c",
      }}
      onAction={closePR}
    />
  );
}
