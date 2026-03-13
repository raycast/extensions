import { Action, Color, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import React from "react";
import { gitlab } from "../common";
import { Pipeline } from "../gitlabapi";
import { getErrorMessage, showErrorToast } from "../utils";

export function RefreshPipelinesAction(props: {
  onRefreshPipelines?: () => void;
  pipeline: Pipeline;
  shortcut?: Keyboard.Shortcut;
}) {
  const handle = () => {
    if (props.onRefreshPipelines) {
      props.onRefreshPipelines();
    }
  };
  return (
    <Action
      title="Refresh"
      icon={{ source: Icon.ArrowClockwise, tintColor: Color.PrimaryText }}
      shortcut={props.shortcut}
      onAction={handle}
    />
  );
}

export function RetryFailedPipelineJobsAction(props: {
  onRetryFailedJobs?: () => void;
  pipeline: Pipeline;
  shortcut?: Keyboard.Shortcut;
}): React.ReactElement | null {
  const pipeline = props.pipeline;
  async function handle() {
    try {
      await gitlab.post(`projects/${pipeline.projectId}/pipelines/${pipeline.id}/retry`);
      showToast(Toast.Style.Success, "Restarted jobs");
    } catch (error) {
      showErrorToast(getErrorMessage(error), "Failed to restart jobs");
    }
  }
  if (pipeline.status === "FAILED") {
    return (
      <Action
        title="Retry Failed Jobs"
        shortcut={props.shortcut}
        icon={{ source: Icon.Repeat, tintColor: Color.PrimaryText }}
        onAction={handle}
      />
    );
  } else {
    return null;
  }
}

export function PipelineItemActions(props: { pipeline: Pipeline; onDataChange?: () => void }) {
  const pipeline = props.pipeline;
  return (
    <React.Fragment>
      <RefreshPipelinesAction pipeline={pipeline} shortcut={{ modifiers: ["cmd"], key: "r" }} />
      <RetryFailedPipelineJobsAction pipeline={pipeline} />
    </React.Fragment>
  );
}
