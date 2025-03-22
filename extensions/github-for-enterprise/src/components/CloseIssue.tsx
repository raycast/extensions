import { CLOSE_ISSUE } from "@/queries/issues";
import { fetcher } from "@/utils";
import { Color, showToast, useNavigation, Action, Toast } from "@raycast/api";
import { useSWRConfig } from "swr";

export default function CloseIssue({ id, number, shouldPop }: any) {
  const { mutate } = useSWRConfig();
  const { pop } = useNavigation();

  async function closeIssue() {
    showToast({
      style: Toast.Style.Animated,
      title: "Closing issue",
    });

    try {
      await fetcher({
        document: CLOSE_ISSUE,
        variables: {
          id,
        },
      });

      mutate("issues");
      mutate("issues-search");
      mutate("issues-recent");
      showToast({
        style: Toast.Style.Success,
        title: `Issue #${number} closed`,
      });

      shouldPop && pop();
    } catch (error: any) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to close issue",
        message: error instanceof Error ? error.message : error.toString(),
      });
    }
  }

  return (
    <Action
      title="Close Issue"
      icon={{
        source: "xmark-circle-16",
        tintColor: Color.PrimaryText,
      }}
      shortcut={{
        modifiers: ["cmd", "shift"],
        key: "c",
      }}
      onAction={closeIssue}
    />
  );
}
