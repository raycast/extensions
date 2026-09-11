import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getGitLabGQL, gitlab } from "../common";
import { Pipeline, Project } from "../gitlabapi";
import { PipelineListItem } from "./pipelines";

interface RestPipeline {
  id: number;
  iid?: number;
  status: string;
  ref: string;
  web_url: string;
  created_at?: string;
  updated_at?: string;
  started_at?: string;
  finished_at?: string;
  duration?: number;
}

function restPipelineToListPipeline(pipeline: RestPipeline, project: Project): Pipeline {
  return {
    id: pipeline.id,
    iid: pipeline.iid !== undefined ? `${pipeline.iid}` : `${pipeline.id}`,
    projectId: `${project.id}`,
    status: pipeline.status,
    ref: pipeline.ref,
    webUrl: pipeline.web_url || `${getGitLabGQL().url}/${project.fullPath}/-/pipelines/${pipeline.id}`,
    created_at: pipeline.created_at ?? "",
    updated_at: pipeline.updated_at ?? "",
    started_at: pipeline.started_at ?? "",
    finished_at: pipeline.finished_at ?? "",
    duration: pipeline.duration ?? 0,
  } as Pipeline;
}

export function MyPipelinesList() {
  const {
    data,
    isLoading,
    revalidate: performRefetch,
  } = useCachedPromise(async () => gitlab.getMyRecentPipelines({ perProject: 5 }), [], {
    initialData: { projects: [], scanned: 0, inaccessible: 0 },
  });

  return (
    <List isLoading={isLoading} navigationTitle="My Pipelines" searchBarPlaceholder="Filter pipelines">
      {data.inaccessible > 0 && data.projects.length > 0 && (
        <List.Section title="Notice">
          <List.Item
            title={`${data.inaccessible} of ${data.scanned} projects inaccessible`}
            subtitle="SAML SSO enforcement may require OAuth"
            icon={Icon.Warning}
          />
        </List.Section>
      )}
      {data.projects.map(({ project, pipelines }) => (
        <List.Section key={project.id} title={project.name_with_namespace} subtitle={project.fullPath}>
          {pipelines.map((pipeline: RestPipeline) => (
            <PipelineListItem
              key={`${project.id}-${pipeline.id}`}
              pipeline={restPipelineToListPipeline(pipeline, project)}
              projectFullPath={project.fullPath}
              onRefreshPipelines={performRefetch}
              navigationTitle={`${project.name} · Pipelines`}
            />
          ))}
        </List.Section>
      ))}
      {!isLoading && data.scanned > 0 && data.projects.length === 0 && data.inaccessible === data.scanned ? (
        <List.EmptyView
          icon={Icon.Lock}
          title="All projects inaccessible via Personal Access Token"
          description={`${data.scanned} projects scanned, ${data.inaccessible} blocked. This usually means SAML SSO enforcement on your GitLab group. Switch Authentication to OAuth in extension preferences.`}
        />
      ) : (
        <List.EmptyView
          title="No recent pipelines"
          description="Pipelines from projects you're a member of show up here."
        />
      )}
    </List>
  );
}
