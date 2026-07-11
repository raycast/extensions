import { Action, Alert, Color, confirmAlert, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import React from "react";
import { gitlab } from "../common";
import { Pipeline } from "../gitlabapi";
import { showFailureToast } from "@raycast/utils";
import { PipelineTriggerForm } from "./pipeline_trigger_form";

export function RefreshPipelinesAction(props: {
  onRefreshPipelines?: () => void;
  pipeline: Pipeline;
  shortcut?: Keyboard.Shortcut;
}) {
  return (
    <Action
      title="Refresh"
      icon={{ source: Icon.ArrowClockwise, tintColor: Color.PrimaryText }}
      shortcut={props.shortcut ?? { modifiers: ["cmd"], key: "r" }}
      onAction={() => props.onRefreshPipelines?.()}
    />
  );
}

export function isCancelablePipeline(pipeline: Pipeline): boolean {
  switch (pipeline.status.toLowerCase()) {
    case "created":
    case "pending":
    case "running":
    case "preparing":
    case "waiting_for_resource":
    case "scheduled":
      return true;
    default:
      return false;
  }
}

export function CancelPipelineAction(props: { pipeline: Pipeline; onRefreshPipelines?: () => void }) {
  async function handle() {
    if (
      !(await confirmAlert({
        title: "Cancel Pipeline?",
        message: `Cancel all jobs in pipeline #${props.pipeline.iid}?`,
        primaryAction: { title: "Cancel Pipeline", style: Alert.ActionStyle.Destructive },
      }))
    ) {
      return;
    }
    try {
      await showToast({ style: Toast.Style.Animated, title: "Canceling pipeline..." });
      await gitlab.post(`projects/${props.pipeline.projectId}/pipelines/${props.pipeline.id}/cancel`);
      showToast(Toast.Style.Success, "Canceled pipeline");
      props.onRefreshPipelines?.();
    } catch (error) {
      showFailureToast(error, { title: "Failed to cancel pipeline" });
    }
  }
  return (
    <Action
      title="Cancel"
      style={Action.Style.Destructive}
      icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
      onAction={handle}
    />
  );
}

export function RetryPipelineAction(props: { pipeline: Pipeline; onRetryFinished?: () => void }) {
  async function handle() {
    if (
      !(await confirmAlert({
        title: "Retry Pipeline?",
        message: `Restart failed jobs in pipeline #${props.pipeline.iid}?`,
        primaryAction: { title: "Retry", style: Alert.ActionStyle.Destructive },
      }))
    ) {
      return;
    }
    try {
      await showToast({ style: Toast.Style.Animated, title: "Restarting jobs..." });
      await gitlab.post(`projects/${props.pipeline.projectId}/pipelines/${props.pipeline.id}/retry`);
      showToast(Toast.Style.Success, "Restarted jobs");
      props.onRetryFinished?.();
    } catch (error) {
      showFailureToast(error, { title: "Failed to restart jobs" });
    }
  }
  return (
    <Action
      title="Retry"
      icon={{ source: Icon.Repeat, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      onAction={handle}
    />
  );
}

export function RunPipelineAction(props: {
  projectId: string | number;
  ref?: string;
  mrIID?: number;
  onFinished?: () => void;
  shortcut?: Keyboard.Shortcut;
}): React.ReactElement | null {
  const ref = props.ref?.trim();
  if (!props.mrIID && !ref) {
    return null;
  }
  async function handle() {
    if (
      !(await confirmAlert({
        title: "Run Pipeline?",
        message: props.mrIID
          ? `Create a new pipeline for merge request !${props.mrIID}?`
          : `Create a new pipeline for ref "${ref}"?`,
        primaryAction: { title: "Run Pipeline" },
      }))
    ) {
      return;
    }
    try {
      await showToast({ style: Toast.Style.Animated, title: "Starting pipeline..." });
      const created = props.mrIID
        ? await gitlab.post(`projects/${props.projectId}/merge_requests/${props.mrIID}/pipelines`)
        : await gitlab.post(`projects/${props.projectId}/pipeline?ref=${encodeURIComponent(ref!)}`);
      showToast(Toast.Style.Success, "Started pipeline", created?.id ? `#${created.id}` : "");
      props.onFinished?.();
    } catch (error) {
      showFailureToast(error, { title: "Failed to run pipeline" });
    }
  }
  return (
    <Action
      title="Run Pipeline"
      icon={{ source: Icon.Play, tintColor: Color.Green }}
      shortcut={props.shortcut ?? { modifiers: ["cmd"], key: "n" }}
      onAction={handle}
    />
  );
}

export function TriggerPipelineAction(props: {
  projectId: string | number;
  defaultRef?: string;
  shortcut?: Keyboard.Shortcut;
}): React.ReactElement | null {
  const projectId = Number(props.projectId);
  if (!projectId) {
    return null;
  }
  return (
    <Action.Push
      title="Trigger New Pipeline"
      icon={{ source: Icon.Play, tintColor: Color.Green }}
      shortcut={props.shortcut ?? { modifiers: ["cmd", "shift"], key: "t" }}
      target={<PipelineTriggerForm projectId={projectId} defaultRef={props.defaultRef} />}
    />
  );
}

export function PipelineItemActions(props: {
  pipeline: Pipeline;
  onRefreshPipelines?: () => void;
  onDataChange?: () => void;
  mrIID?: number;
}) {
  return (
    <React.Fragment>
      <RunPipelineAction
        projectId={props.pipeline.projectId}
        ref={props.mrIID ? undefined : props.pipeline.ref}
        mrIID={props.mrIID}
        onFinished={props.onRefreshPipelines ?? props.onDataChange}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
      />
      {!props.mrIID && (
        <TriggerPipelineAction
          projectId={props.pipeline.projectId}
          defaultRef={props.pipeline.ref}
          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
        />
      )}
      <RefreshPipelinesAction
        pipeline={props.pipeline}
        onRefreshPipelines={props.onRefreshPipelines ?? props.onDataChange}
      />
    </React.Fragment>
  );
}
