import { Action, Color, Icon } from "@raycast/api";
import { GitLabIcons } from "../../icons";
import { JobList } from "../jobs";
import { Commit } from "./types";

export function ShowCommitPipelineAction(props: { commit: Commit; projectFullPath: string }) {
  if (!props.commit.head_pipeline) {
    return null;
  }
  return (
    <Action.Push
      title="Show Pipeline"
      icon={{ source: GitLabIcons.ci, tintColor: Color.PrimaryText }}
      target={<JobList projectFullPath={props.projectFullPath} pipelineIID={props.commit.head_pipeline.iid} />}
    />
  );
}

export function RefreshCommitsAction(props: { onRefreshJobs?: () => void }) {
  return (
    <Action
      title="Refresh"
      icon={{ source: Icon.ArrowClockwise, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={() => props.onRefreshJobs?.()}
    />
  );
}
