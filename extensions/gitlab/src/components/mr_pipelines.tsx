import { ActionPanel, List } from "@raycast/api";
import { MergeRequest } from "../gitlabapi";
import { PipelineListItem, pipelineSearchBarPlaceholder } from "./pipelines";
import { RunPipelineAction } from "./pipeline_actions";
import { usePaginatedMRPipelines } from "./pipelines_data";

export function MRPipelineList(props: { mr: MergeRequest }) {
  const { pipelines, isLoading, performRefetch, pagination } = usePaginatedMRPipelines({
    cacheKey: `mr_pipelines_${props.mr.project_id}_${props.mr.iid}`,
    projectFullPath: props.mr.project_full_path,
    mrIID: props.mr.iid,
  });

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle={`Pipelines · ${props.mr.reference_full}`}
      searchBarPlaceholder={pipelineSearchBarPlaceholder}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <RunPipelineAction
              projectId={pipelines[0]?.projectId ?? `${props.mr.project_id}`}
              mrIID={props.mr.iid}
              onFinished={performRefetch}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <List.Section title="Pipelines" subtitle={pipelines.length ? `${pipelines.length}` : undefined}>
        {pipelines.map((pipeline) => (
          <PipelineListItem
            key={pipeline.id}
            pipeline={pipeline}
            projectFullPath={props.mr.project_full_path}
            onRefreshPipelines={performRefetch}
            navigationTitle={`Pipelines · ${props.mr.reference_full}`}
            mrIID={props.mr.iid}
          />
        ))}
      </List.Section>
      {!isLoading && pipelines.length === 0 && (
        <List.EmptyView title="No Pipelines" description="This merge request has no pipelines yet." />
      )}
    </List>
  );
}
