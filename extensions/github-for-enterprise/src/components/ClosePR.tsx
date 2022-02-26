import { CLOSE_PR } from "@/queries/pull-requests";
import { fetcher } from "@/utils";
import { ActionPanel, Color, showToast, ToastStyle, useNavigation } from "@raycast/api";
import React from "react";
import { useSWRConfig } from "swr";

export default function CloseIssue({ id, number, shouldPop }: any) {
  const { mutate } = useSWRConfig();
  const { pop } = useNavigation();

  async function closePR() {
    showToast(ToastStyle.Animated, "Closing pull request");

    try {
      await fetcher({
        document: CLOSE_PR,
        variables: {
          id,
        },
      });

      mutate("prs");
      showToast(ToastStyle.Success, `Pull request #${number} closed`);

      shouldPop && pop();
    } catch (error: any) {
      showToast(
        ToastStyle.Failure,
        "Failed to close pull request",
        error instanceof Error ? error.message : error.toString()
      );
    }
  }

  return (
    <ActionPanel.Item
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
