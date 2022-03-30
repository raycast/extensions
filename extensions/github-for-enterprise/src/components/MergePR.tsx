import { MERGE_PR } from "@/queries/pull-requests";
import { fetcher } from "@/utils";
import { ActionPanel, Color, KeyboardShortcut, popToRoot, showToast, ToastStyle } from "@raycast/api";
import React from "react";
import { useSWRConfig } from "swr";

type MergePROwnProps = {
  id: string;
  method?: "MERGE" | "REBASE" | "SQUASH";
  number: number;
  shortcut?: KeyboardShortcut;
  title: string;
};

export default function MergePR(props: MergePROwnProps) {
  const { id, method = "MERGE", number, shortcut, title } = props;
  const { mutate } = useSWRConfig();

  async function mergePR() {
    showToast(ToastStyle.Animated, "Merging pull request");

    try {
      await fetcher({
        document: MERGE_PR,
        variables: {
          pullRequestId: id,
          mergeMethod: method,
        },
      });

      mutate("prs");
      mutate("prs-open");
      showToast(ToastStyle.Success, `Pull request #${number} merged`);
      popToRoot();
    } catch (error: any) {
      showToast(
        ToastStyle.Failure,
        "Failed to merge pull request",
        error instanceof Error ? error.message : error.toString()
      );
    }
  }

  return (
    <ActionPanel.Item
      title={title}
      icon={{
        source: "pull-request-merge.png",
        tintColor: Color.PrimaryText,
      }}
      shortcut={shortcut}
      onAction={mergePR}
    />
  );
}
