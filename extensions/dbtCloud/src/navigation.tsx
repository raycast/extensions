import { Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchModelWithLineage, fetchSources } from "./api";
import { ModelDetail } from "./catalog_index";
import { returnJobs } from "./fetch_jobs";
import { returnProjects } from "./fetch_projects";
import { JobDetail } from "./jobs_index";
import { ProjectDetail } from "./projects_index";
import { SourceDetail } from "./sources_index";

// Views that start from an id (e.g. a run's job or an environment's project) load the record, then reuse the detail view

export function JobById({ jobId }: { jobId: number }) {
  const { data: job, isLoading } = useCachedPromise(
    async (id: number) => (await returnJobs()).find((j) => j.id === id),
    [jobId],
  );
  if (job) return <JobDetail job={job} />;
  return <Detail isLoading={isLoading} markdown={isLoading ? "" : `Job ${jobId} was not found.`} />;
}

export function ProjectById({ projectId }: { projectId: number }) {
  const { data: project, isLoading } = useCachedPromise(
    async (id: number) => (await returnProjects()).find((p) => p.id === id),
    [projectId],
  );
  if (project) return <ProjectDetail project={project} />;
  return <Detail isLoading={isLoading} markdown={isLoading ? "" : `Project ${projectId} was not found.`} />;
}

export function ModelByUniqueId({
  uniqueId,
  environmentId,
  projectId,
}: {
  uniqueId: string;
  environmentId: number;
  projectId: number;
}) {
  const { data: model, isLoading } = useCachedPromise(fetchModelWithLineage, [environmentId, uniqueId]);
  if (model) return <ModelDetail model={model} environmentId={environmentId} projectId={projectId} />;
  return <Detail isLoading={isLoading} markdown={isLoading ? "" : `Model \`${uniqueId}\` was not found.`} />;
}

export function SourceByUniqueId({
  uniqueId,
  environmentId,
  projectId,
}: {
  uniqueId: string;
  environmentId: number;
  projectId: number;
}) {
  const { data: source, isLoading } = useCachedPromise(
    async (envId: number, id: string) => (await fetchSources(envId)).find((s) => s.uniqueId === id),
    [environmentId, uniqueId],
  );
  if (source) return <SourceDetail source={source} environmentId={environmentId} projectId={projectId} />;
  return <Detail isLoading={isLoading} markdown={isLoading ? "" : `Source \`${uniqueId}\` was not found.`} />;
}
