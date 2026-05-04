import { Icon, List } from "@raycast/api";
import useInterval from "use-interval";
import { useCache } from "../cache";
import { getCIRefreshInterval, getGitLabGQL, gitlab } from "../common";
import { Pipeline, Project } from "../gitlabapi";
import { showErrorToast } from "../utils";
import { PipelineListItem } from "./pipelines";

interface RestPipeline {
  id: number;
  iid?: number;
  project_id: number;
  status: string;
  ref: string;
  web_url: string;
  created_at?: string;
  updated_at?: string;
  started_at?: string;
  finished_at?: string;
  duration?: number;
}

interface PipelineCardShape {
  id: number;
  iid: string;
  projectId: string;
  status: string;
  ref: string;
  webUrl: string;
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string;
  finishedAt?: string;
  duration?: number;
}

interface MyPipelinesData {
  projects: { project: Project; pipelines: RestPipeline[] }[];
  scanned: number;
  inaccessible: number;
}

function toPipelineCard(p: RestPipeline, project: Project): PipelineCardShape {
  const webUrl = p.web_url || `${getGitLabGQL().url}/${project.fullPath}/-/pipelines/${p.id}`;
  return {
    id: p.id,
    iid: p.iid !== undefined ? `${p.iid}` : `${p.id}`,
    projectId: `${project.id}`,
    status: p.status,
    ref: p.ref,
    webUrl,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    startedAt: p.started_at,
    finishedAt: p.finished_at,
    duration: p.duration,
  };
}

export function MyPipelinesList() {
  const { data, error, isLoading, performRefetch } = useCache<MyPipelinesData>(
    "my_pipelines_v1",
    async () => await gitlab.getMyRecentPipelines({ perProject: 5 }),
    { secondsToRefetch: 60 },
  );

  useInterval(() => {
    performRefetch();
  }, getCIRefreshInterval());

  if (error) {
    showErrorToast(error, "Cannot load pipelines");
  }

  const projects = data?.projects ?? [];
  const inaccessible = data?.inaccessible ?? 0;
  const scanned = data?.scanned ?? 0;
  const allBlocked = !isLoading && scanned > 0 && projects.length === 0 && inaccessible === scanned;

  return (
    <List isLoading={isLoading} navigationTitle="My Pipelines" searchBarPlaceholder="Filter pipelines">
      {inaccessible > 0 && projects.length > 0 && (
        <List.Section title="Notice">
          <List.Item
            title={`${inaccessible} of ${scanned} projects inaccessible`}
            subtitle="SAML SSO enforcement may require OAuth"
            icon={Icon.Warning}
          />
        </List.Section>
      )}
      {projects.map(({ project, pipelines }) => (
        <List.Section key={project.id} title={project.name_with_namespace} subtitle={project.fullPath}>
          {pipelines.map((p) => (
            <PipelineListItem
              key={`${project.id}-${p.id}`}
              pipeline={toPipelineCard(p, project) as Pipeline}
              projectFullPath={project.fullPath}
              onRefreshPipelines={performRefetch}
              navigationTitle={`${project.name} · Pipelines`}
            />
          ))}
        </List.Section>
      ))}
      {allBlocked ? (
        <List.EmptyView
          icon={Icon.Lock}
          title="All projects inaccessible via Personal Access Token"
          description={`${scanned} projects scanned, ${inaccessible} blocked. This usually means SAML SSO enforcement on your GitLab group. Use \`glab\` CLI or wait for OAuth support in this extension.`}
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
