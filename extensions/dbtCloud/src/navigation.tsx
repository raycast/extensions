import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchModelWithLineage, fetchSources } from "./api";
import { CatalogList, ModelDetail } from "./catalog_index";
import { EnvironmentDetail, EnvironmentsList } from "./environments_index";
import { returnEnvironments } from "./fetch_environments";
import { returnJobs } from "./fetch_jobs";
import { returnProjects } from "./fetch_projects";
import { fetchRun } from "./fetch_runs";
import { JobPerformanceDetail, JobPerformanceList } from "./job_performance_index";
import { JobDetail, JobsList } from "./jobs_index";
import { LineageDetail, LineageList } from "./lineage_index";
import { fetchModelHistoricalRuns } from "./model_performance_api";
import { ModelPerformanceDetail, ModelPerformanceList } from "./model_performance_index";
import { ProjectDetail } from "./projects_index";
import { RunDetail, RunsList } from "./runs_index";
import { SourceDetail, SourcesList } from "./sources_index";
import { JobModel, ModelNode, RunModel, SourceNode } from "./types";

// ============================================
// Loaders: views that start from an id load the record, then reuse the detail view
// ============================================

function NotFound({ isLoading, message }: { isLoading: boolean; message: string }) {
  return <Detail isLoading={isLoading} markdown={isLoading ? "" : message} />;
}

export function ProjectById({ projectId }: { projectId: number }) {
  const { data: project, isLoading } = useCachedPromise(
    async (id: number) => (await returnProjects()).find((p) => p.id === id),
    [projectId],
  );
  return project ? (
    <ProjectDetail project={project} />
  ) : (
    <NotFound isLoading={isLoading} message={`Project ${projectId} was not found.`} />
  );
}

export function EnvironmentById({ environmentId }: { environmentId: number }) {
  const { data: environment, isLoading } = useCachedPromise(
    async (id: number) => (await returnEnvironments()).find((e) => e.id === id),
    [environmentId],
  );
  return environment ? (
    <EnvironmentDetail environment={environment} />
  ) : (
    <NotFound isLoading={isLoading} message={`Environment ${environmentId} was not found.`} />
  );
}

export function JobById({ jobId }: { jobId: number }) {
  const { data: job, isLoading } = useCachedPromise(
    async (id: number) => (await returnJobs()).find((j) => j.id === id),
    [jobId],
  );
  return job ? <JobDetail job={job} /> : <NotFound isLoading={isLoading} message={`Job ${jobId} was not found.`} />;
}

export function RunById({ runId }: { runId: number }) {
  const { data: run, isLoading } = useCachedPromise(fetchRun, [runId]);
  return run ? <RunDetail run={run} /> : <NotFound isLoading={isLoading} message={`Run ${runId} was not found.`} />;
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
  return model ? (
    <ModelDetail model={model} environmentId={environmentId} projectId={projectId} />
  ) : (
    <NotFound isLoading={isLoading} message={`Model \`${uniqueId}\` was not found.`} />
  );
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
  return source ? (
    <SourceDetail source={source} environmentId={environmentId} projectId={projectId} />
  ) : (
    <NotFound isLoading={isLoading} message={`Source \`${uniqueId}\` was not found.`} />
  );
}

// ============================================
// "Go to" sections: the same links up and down the dbt hierarchy from every view
// (project > environment > job > run; environment > models and sources)
// ============================================

type Link =
  | "project"
  | "environment"
  | "job"
  | "details"
  | "environments"
  | "jobs"
  | "runs"
  | "models"
  | "sources"
  | "lineage"
  | "performance"
  | "modelPerformance"
  | "jobPerformance";

interface GoToProps {
  // Links to leave out, typically the view the section is shown in
  omit?: Link[];
}

const show = (omit: Link[] | undefined, link: Link) => !omit?.includes(link);

export function ProjectGoTo({ projectId, projectName, omit }: GoToProps & { projectId: number; projectName: string }) {
  return (
    <ActionPanel.Section title="Go To">
      {show(omit, "details") && (
        <Action.Push title="View Project Details" icon={Icon.Eye} target={<ProjectById projectId={projectId} />} />
      )}
      {show(omit, "environments") && (
        <Action.Push
          title="View Environments"
          icon={Icon.Globe}
          target={<EnvironmentsList projectId={projectId} scopeTitle={projectName} />}
        />
      )}
      {show(omit, "jobs") && (
        <Action.Push
          title="View Jobs"
          icon={Icon.Hammer}
          target={<JobsList projectId={projectId} scopeTitle={projectName} />}
        />
      )}
      {show(omit, "models") && (
        <Action.Push
          title="View Models"
          icon={Icon.Box}
          target={<CatalogList projectId={projectId} scopeTitle={projectName} />}
        />
      )}
      {show(omit, "jobPerformance") && (
        <Action.Push
          title="View Job Performance"
          icon={Icon.BarChart}
          target={<JobPerformanceList projectId={projectId} />}
        />
      )}
    </ActionPanel.Section>
  );
}

export function EnvironmentGoTo({
  environmentId,
  environmentName,
  projectId,
  projectName = "",
  isDeployment = true,
  omit,
}: GoToProps & {
  environmentId: number;
  environmentName: string;
  projectId: number;
  projectName?: string;
  isDeployment?: boolean;
}) {
  return (
    <ActionPanel.Section title="Go To">
      {show(omit, "project") && (
        <Action.Push title="Go to Project" icon={Icon.ArrowUp} target={<ProjectById projectId={projectId} />} />
      )}
      {show(omit, "details") && (
        <Action.Push
          title="View Environment Details"
          icon={Icon.Eye}
          target={<EnvironmentById environmentId={environmentId} />}
        />
      )}
      {show(omit, "jobs") && (
        <Action.Push
          title="View Jobs"
          icon={Icon.Hammer}
          target={<JobsList projectId={projectId} environmentId={environmentId} scopeTitle={environmentName} />}
        />
      )}
      {isDeployment && (
        <>
          {show(omit, "models") && (
            <Action.Push
              title="View Models"
              icon={Icon.Box}
              target={<CatalogList environmentId={environmentId} scopeTitle={environmentName} />}
            />
          )}
          {show(omit, "sources") && (
            <Action.Push
              title="View Sources"
              icon={Icon.HardDrive}
              target={
                <SourcesList environmentId={environmentId} environmentName={environmentName} projectId={projectId} />
              }
            />
          )}
          {show(omit, "lineage") && (
            <Action.Push
              title="View Lineage"
              icon={Icon.Link}
              target={
                <LineageList environmentId={environmentId} environmentName={environmentName} projectId={projectId} />
              }
            />
          )}
          {show(omit, "modelPerformance") && (
            <Action.Push
              title="View Model Performance"
              icon={Icon.Clock}
              target={
                <ModelPerformanceList
                  environment={{ id: environmentId, name: environmentName, projectName, projectId }}
                />
              }
            />
          )}
        </>
      )}
    </ActionPanel.Section>
  );
}

export function JobGoTo({ job, omit }: GoToProps & { job: JobModel }) {
  return (
    <ActionPanel.Section title="Go To">
      {show(omit, "project") && (
        <Action.Push title="Go to Project" icon={Icon.ArrowUp} target={<ProjectById projectId={job.project_id} />} />
      )}
      {show(omit, "environment") && (
        <Action.Push
          title="Go to Environment"
          icon={Icon.ArrowUp}
          target={<EnvironmentById environmentId={job.environment_id} />}
        />
      )}
      {show(omit, "details") && (
        <Action.Push title="View Job Details" icon={Icon.Eye} target={<JobDetail job={job} />} />
      )}
      {show(omit, "runs") && (
        <Action.Push title="View Runs" icon={Icon.List} target={<RunsList jobId={job.id} scopeTitle={job.name} />} />
      )}
      {show(omit, "performance") && (
        <Action.Push
          title="View Performance"
          icon={Icon.BarChart}
          target={<JobPerformanceDetail job={job} projectName={job.project?.name ?? `Project ${job.project_id}`} />}
        />
      )}
    </ActionPanel.Section>
  );
}

export function RunGoTo({ run, omit }: GoToProps & { run: RunModel }) {
  return (
    <ActionPanel.Section title="Go To">
      {show(omit, "project") && (
        <Action.Push title="Go to Project" icon={Icon.ArrowUp} target={<ProjectById projectId={run.project_id} />} />
      )}
      {show(omit, "environment") && (
        <Action.Push
          title="Go to Environment"
          icon={Icon.ArrowUp}
          target={<EnvironmentById environmentId={run.environment_id} />}
        />
      )}
      {show(omit, "job") && (
        <Action.Push title="Go to Job" icon={Icon.ArrowUp} target={<JobById jobId={run.job_definition_id} />} />
      )}
      {show(omit, "details") && (
        <Action.Push title="View Run Details" icon={Icon.Eye} target={<RunDetail run={run} />} />
      )}
      {show(omit, "runs") && (
        <Action.Push
          title="View Other Runs of This Job"
          icon={Icon.List}
          target={
            <RunsList jobId={run.job_definition_id} scopeTitle={run.job?.name ?? `Job ${run.job_definition_id}`} />
          }
        />
      )}
    </ActionPanel.Section>
  );
}

// Last run and job come from the model's run history, so only detail views ask for them
function ModelLastRunActions({ uniqueId, environmentId }: { uniqueId: string; environmentId: number }) {
  const { data: runs = [] } = useCachedPromise(fetchModelHistoricalRuns, [environmentId, uniqueId, 1]);
  const last = runs[0];
  if (!last) return null;
  return (
    <>
      <Action.Push title={`View Last Run (#${last.runId})`} icon={Icon.Play} target={<RunById runId={last.runId} />} />
      {last.jobId && <Action.Push title="Go to Last Job" icon={Icon.Hammer} target={<JobById jobId={last.jobId} />} />}
    </>
  );
}

export function ModelGoTo({
  uniqueId,
  name,
  environmentId,
  projectId,
  environmentName,
  projectName = "",
  withLastRun = false,
  omit,
}: GoToProps & {
  uniqueId: string;
  name: string;
  environmentId: number;
  projectId: number;
  environmentName?: string;
  projectName?: string;
  withLastRun?: boolean;
}) {
  const node = { uniqueId, name, resourceType: "model" } as ModelNode;
  return (
    <ActionPanel.Section title="Go To">
      {show(omit, "project") && (
        <Action.Push title="Go to Project" icon={Icon.ArrowUp} target={<ProjectById projectId={projectId} />} />
      )}
      {show(omit, "environment") && (
        <Action.Push
          title="Go to Environment"
          icon={Icon.ArrowUp}
          target={<EnvironmentById environmentId={environmentId} />}
        />
      )}
      {withLastRun && <ModelLastRunActions uniqueId={uniqueId} environmentId={environmentId} />}
      {show(omit, "details") && (
        <Action.Push
          title="View Model Details"
          icon={Icon.Eye}
          target={<ModelByUniqueId uniqueId={uniqueId} environmentId={environmentId} projectId={projectId} />}
        />
      )}
      {show(omit, "lineage") && (
        <Action.Push
          title="View Lineage"
          icon={Icon.Link}
          target={<LineageDetail node={node} environmentId={environmentId} projectId={projectId} />}
        />
      )}
      {show(omit, "performance") && (
        <Action.Push
          title="View Performance"
          icon={Icon.BarChart}
          target={
            <ModelPerformanceDetail
              model={{ uniqueId, name, description: null, materializedType: null, tags: null, executionInfo: null }}
              environment={{
                id: environmentId,
                name: environmentName ?? `Environment ${environmentId}`,
                projectName,
                projectId,
              }}
            />
          }
        />
      )}
    </ActionPanel.Section>
  );
}

export function SourceGoTo({
  source,
  environmentId,
  projectId,
  omit,
}: GoToProps & {
  source: Pick<SourceNode, "uniqueId"> & Partial<SourceNode>;
  environmentId: number;
  projectId: number;
}) {
  return (
    <ActionPanel.Section title="Go To">
      {show(omit, "project") && (
        <Action.Push title="Go to Project" icon={Icon.ArrowUp} target={<ProjectById projectId={projectId} />} />
      )}
      {show(omit, "environment") && (
        <Action.Push
          title="Go to Environment"
          icon={Icon.ArrowUp}
          target={<EnvironmentById environmentId={environmentId} />}
        />
      )}
      {show(omit, "details") && (
        <Action.Push
          title="View Source Details"
          icon={Icon.Eye}
          target={<SourceByUniqueId uniqueId={source.uniqueId} environmentId={environmentId} projectId={projectId} />}
        />
      )}
      {show(omit, "lineage") && source.children && (
        <Action.Push
          title="View Lineage"
          icon={Icon.Link}
          target={<LineageDetail node={source as SourceNode} environmentId={environmentId} projectId={projectId} />}
        />
      )}
    </ActionPanel.Section>
  );
}
