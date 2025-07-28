import React from "react";
import { ActionPanel, Action, Icon } from "@raycast/api";
import { MergeRequest } from "../types/gitlab";

interface MergeRequestActionsProps {
  mergeRequest: MergeRequest;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
}

export const MergeRequestActions = ({ mergeRequest, isShowingDetail, onToggleDetail }: MergeRequestActionsProps) => {
  return (
    <ActionPanel>
      <Action.OpenInBrowser
        title="Open in GitLab"
        url={mergeRequest.web_url}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />
      <Action.CopyToClipboard
        title="Copy MR URL"
        content={mergeRequest.web_url}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      <Action.CopyToClipboard
        title="Copy MR Title"
        content={mergeRequest.title}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
      />
      <Action
        title={isShowingDetail ? "Hide Details" : "Show Details"}
        icon={isShowingDetail ? Icon.EyeDisabled : Icon.Eye}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={onToggleDetail}
      />
    </ActionPanel>
  );
};
