import { Action, ActionPanel, List, Icon, Color } from "@raycast/api";
import { useMemo } from "react";
import { copyShortcut, formatDate, formatDateTime } from "../utils";
import { getCIJobStatusIcon, getMRPipelineStatusTooltip, JobList } from "./jobs";
import {
  CancelPipelineAction,
  isCancelablePipeline,
  PipelineItemActions,
  RetryPipelineAction,
  RunPipelineAction,
  TriggerPipelineAction,
} from "./pipeline_actions";
import { GitLabOpenInBrowserAction } from "./actions";
import { Pipeline } from "../gitlabapi";
import { usePaginatedProjectPipelines } from "./pipelines_data";
export { normalizePipelineForList } from "./pipelines_gql";

export const pipelineSearchBarPlaceholder = "Search pipelines by commit, ref, or author...";

export function PipelineListItem(props: {
  pipeline: Pipeline;
  projectFullPath: string;
  onRefreshPipelines: () => void;
  navigationTitle?: string;
  mrIID?: number;
}) {
  const finishedAt = props.pipeline.finished_at || (props.pipeline as { finishedAt?: string }).finishedAt;
  const startedAt = props.pipeline.started_at || (props.pipeline as { startedAt?: string }).startedAt;
  const createdAt = props.pipeline.created_at || (props.pipeline as { createdAt?: string }).createdAt;
  const iso = finishedAt ?? startedAt ?? createdAt;
  const keywords = useMemo(
    () =>
      [
        props.pipeline.commit_title,
        props.pipeline.ref,
        props.pipeline.user?.name,
        props.pipeline.user?.username,
      ].filter((keyword): keyword is string => !!keyword),
    [props.pipeline.commit_title, props.pipeline.ref, props.pipeline.user?.name, props.pipeline.user?.username],
  );
  const accessories = useMemo((): List.Item.Accessory[] => {
    if (!iso) {
      return [];
    }
    return [
      {
        text: formatDate(new Date(iso)),
        tooltip: finishedAt
          ? `Finished ${formatDateTime(new Date(iso))}`
          : startedAt
            ? `Started ${formatDateTime(new Date(iso))}`
            : `Created ${formatDateTime(new Date(iso))}`,
      },
    ];
  }, [finishedAt, iso, startedAt]);

  return (
    <List.Item
      id={`${props.pipeline.id}`}
      title={props.pipeline.id.toString()}
      keywords={keywords}
      icon={{
        value: getCIJobStatusIcon(props.pipeline.status, false),
        tooltip: props.pipeline.status ? getMRPipelineStatusTooltip(props.pipeline.status) : "",
      }}
      subtitle={props.pipeline.commit_title || props.pipeline.ref}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={`#${props.pipeline.iid}`}>
            <Action.Push
              title="Show Jobs"
              target={
                <JobList
                  projectFullPath={props.projectFullPath}
                  pipelineIID={props.pipeline.iid}
                  navigationTitle={props.navigationTitle}
                />
              }
              icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
            />
            <GitLabOpenInBrowserAction url={props.pipeline.webUrl} />
            <Action.CopyToClipboard title="Copy URL" content={props.pipeline.webUrl} shortcut={copyShortcut} />
            <RetryPipelineAction pipeline={props.pipeline} onRetryFinished={props.onRefreshPipelines} />
            {isCancelablePipeline(props.pipeline) && (
              <CancelPipelineAction pipeline={props.pipeline} onRefreshPipelines={props.onRefreshPipelines} />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title={props.mrIID !== undefined ? `MR !${props.mrIID}` : undefined}>
            <PipelineItemActions
              pipeline={props.pipeline}
              onRefreshPipelines={props.onRefreshPipelines}
              mrIID={props.mrIID}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function PipelineList(props: { projectFullPath: string; navigationTitle?: string }) {
  const { pipelines, isLoading, performRefetch, pagination } = usePaginatedProjectPipelines({
    cacheKey: `project_pipelines_${props.projectFullPath}`,
    projectFullPath: props.projectFullPath,
  });

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle={props.navigationTitle || "Pipelines"}
      searchBarPlaceholder={pipelineSearchBarPlaceholder}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {pipelines[0] && (
              <>
                <RunPipelineAction
                  projectId={pipelines[0].projectId}
                  ref={pipelines[0].ref}
                  onFinished={performRefetch}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
                <TriggerPipelineAction
                  projectId={pipelines[0].projectId}
                  defaultRef={pipelines[0].ref}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                />
              </>
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <List.Section title="Pipelines">
        {pipelines.map((pipeline) => (
          <PipelineListItem
            key={pipeline.id}
            pipeline={pipeline}
            projectFullPath={props.projectFullPath}
            onRefreshPipelines={performRefetch}
            navigationTitle={props.navigationTitle}
          />
        ))}
      </List.Section>
    </List>
  );
}
