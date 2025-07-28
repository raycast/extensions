import { ActionPanel, Action, Icon } from "@raycast/api";
import { Project } from "../types/gitlab";
import { MergeRequestsList } from "./MergeRequestsList";

interface ProjectActionsProps {
  project: Project;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
}

export const ProjectActions = ({ project, isShowingDetail, onToggleDetail }: ProjectActionsProps) => (
  <ActionPanel>
    <Action.Push title="View Merge Requests" target={<MergeRequestsList project={project} />} />
    <Action.OpenInBrowser
      title="Open Project in GitLab"
      url={project.web_url}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
    />
    <Action.CopyToClipboard
      title="Copy Project URL"
      content={project.web_url}
      shortcut={{ modifiers: ["cmd"], key: "c" }}
    />
    <Action
      title={isShowingDetail ? "Hide Details" : "Show Details"}
      icon={isShowingDetail ? Icon.EyeDisabled : Icon.Eye}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
      onAction={onToggleDetail}
    />
  </ActionPanel>
);
