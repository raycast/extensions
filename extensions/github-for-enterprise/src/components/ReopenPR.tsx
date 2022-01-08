import { REOPEN_PR } from "@/queries/pull-requests";
import { fetcher } from "@/utils";
import { ActionPanel, Color, showToast, ToastStyle } from "@raycast/api";
import React from "react";
import { useSWRConfig } from "swr";

export default function ReopenPR({ id, number }: any) {
  const { mutate } = useSWRConfig();

  async function reopenPR() {
    showToast(ToastStyle.Animated, "Reopening pull request");

    try {
      await fetcher({
        document: REOPEN_PR,
        variables: {
          id,
        },
      });

      mutate("prs");
      mutate("prs-open");
      showToast(ToastStyle.Success, `Pull request #${number} reopened`);
    } catch (error: any) {
      showToast(
        ToastStyle.Failure,
        "Failed to reopen pull request",
        error instanceof Error ? error.message : error.toString()
      );
    }
  }

  return (
    <ActionPanel.Item
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
