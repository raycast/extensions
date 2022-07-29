import { REOPEN_ISSUE } from "@/queries/issues";
import { fetcher } from "@/utils";
import { ActionPanel, Color, showToast, ToastStyle } from "@raycast/api";
import React from "react";
import { useSWRConfig } from "swr";

export default function ReopenIssue({ id, number }: any) {
  const { mutate } = useSWRConfig();

  async function reopenIssue() {
    showToast(ToastStyle.Animated, "Reopening issue");

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
      showToast(ToastStyle.Success, `Issue #${number} reopened`);
    } catch (error: any) {
      showToast(
        ToastStyle.Failure,
        "Failed to reopen issue",
        error instanceof Error ? error.message : error.toString()
      );
    }
  }

  return (
    <ActionPanel.Item
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
