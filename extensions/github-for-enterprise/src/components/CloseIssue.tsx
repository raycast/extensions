import { CLOSE_ISSUE } from "@/queries/issues";
import { fetcher } from "@/utils";
import { ActionPanel, Color, showToast, ToastStyle, useNavigation } from "@raycast/api";
import React from "react";
import { useSWRConfig } from "swr";

export default function CloseIssue({ id, number, shouldPop }: any) {
  const { mutate } = useSWRConfig();
  const { pop } = useNavigation();

  async function closeIssue() {
    showToast(ToastStyle.Animated, "Closing issue");

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
      showToast(ToastStyle.Success, `Issue #${number} closed`);

      shouldPop && pop();
    } catch (error: any) {
      showToast(ToastStyle.Failure, "Failed to close issue", error instanceof Error ? error.message : error.toString());
    }
  }

  return (
    <ActionPanel.Item
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
