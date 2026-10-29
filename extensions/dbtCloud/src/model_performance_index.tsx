import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import {
  ContextMetadata,
  dateAccessory,
  modelStatus,
  plural,
  successRateColor,
  useExplorerEnvironment,
  useJobNames,
} from "./display";
import { Shortcuts } from "./shortcuts";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { buildDbtCloudUrl, buildDocsUrl, formatRelativeTime } from "./api";
import { CatalogEnvironment, describeEnvironment, resolveCatalogEnvironments } from "./catalog_environments";
import { buildDurationChart, ChartPoint, ChartStatus } from "./duration_chart";
import { fetchModelHistoricalRuns, fetchModelPerformance, ModelPerformanceNode } from "./model_performance_api";
import { ModelGoTo } from "./navigation";

const RUN_COUNT = 50;

const STATUS_STYLE: Record<string, { emoji: string; color: Color; chart: ChartStatus }> = {
  success: { emoji: "🟢", color: Color.Green, chart: "success" },
  warn: { emoji: "🟡", color: Color.Yellow, chart: "warn" },
  error: { emoji: "🔴", color: Color.Red, chart: "error" },
  skipped: { emoji: "⚪️", color: Color.SecondaryText, chart: "cancelled" },
  reused: { emoji: "♻️", color: Color.SecondaryText, chart: "cancelled" },
};

const styleFor = (status: string | null | undefined) => STATUS_STYLE[status?.toLowerCase() ?? ""];

const formatSeconds = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m ${secs}s`;
};

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export function ModelPerformanceDetail({
  model,
  environment,
}: {
  model: ModelPerformanceNode;
  environment: CatalogEnvironment;
}) {
  const jobName = useJobNames(environment.projectId);
  const explorerEnv = useExplorerEnvironment();
  const { data: runs = [], isLoading } = useCachedPromise(fetchModelHistoricalRuns, [
    environment.id,
    model.uniqueId,
    RUN_COUNT,
  ]);

  const built = runs.filter((run) => ["success", "warn"].includes(run.status?.toLowerCase() ?? ""));
  const errored = runs.filter((run) => run.status?.toLowerCase() === "error");
  const completed = built.length + errored.length;
  const successRatio = completed > 0 ? (built.length / completed) * 100 : null;
  const successRate = successRatio !== null ? `${successRatio.toFixed(2)}%` : "—";
  const durations = built.map((run) => run.executionTime).filter((t): t is number => t !== null);
  const average = durations.length > 0 ? durations.reduce((sum, t) => sum + t, 0) / durations.length : null;
  const slowest = durations.length > 0 ? Math.max(...durations) : null;

  const points: ChartPoint[] = runs.flatMap((run) => {
    const style = styleFor(run.status);
    return run.runGeneratedAt && run.executionTime !== null && style
      ? [{ time: new Date(run.runGeneratedAt), seconds: run.executionTime, status: style.chart }]
      : [];
  });
  const windowStart = points.length > 0 ? new Date(Math.min(...points.map((p) => p.time.getTime()))) : new Date();
  const chart = buildDurationChart(points, windowStart, new Date());

  const runUrl = (runId: number) => buildDbtCloudUrl(`/projects/${environment.projectId}/runs/${runId}`);
  const runRows = runs
    .slice(0, 15)
    .map((run) => {
      const style = styleFor(run.status);
      return `| ${style?.emoji ?? "❓"} ${modelStatus(run.status)?.label ?? run.status ?? "Unknown"} | [#${run.runId}](${runUrl(run.runId)}) | ${formatSeconds(
        run.executionTime,
      )} | ${run.jobId ? jobName(run.jobId) : "—"} | ${formatRelativeTime(run.runGeneratedAt)} |`;
    })
    .join("\n");

  const lastError = errored[0]?.error;
  const markdown = isLoading
    ? `# ${model.name}\n\nLoading run history...`
    : `# ${model.name}

**Model performance** · last ${runs.length} runs in ${describeEnvironment(environment)}

| Success rate | Built | Errored | Average | Slowest |
|:--:|:--:|:--:|:--:|:--:|
| **${successRate}** | ${built.length} | ${errored.length} | ${formatSeconds(average)} | ${formatSeconds(slowest)} |

${chart ? `![Execution time in minutes](${chart})\n\n🟢 success · 🟡 warn · 🔴 error · ⚪️ skipped or reused — execution time per run` : "_No timed runs for this model yet._"}
${lastError ? `\n**Latest error** (run #${errored[0].runId})\n\n\`\`\`\n${lastError.slice(0, 600)}\n\`\`\`\n` : ""}
## Runs

| Status | Run | Execution time | Job | When |
|--------|-----|----------------|-----|------|
${runRows || "| — | — | — | — | — |"}
`;

  const explorerUrl = environment.projectId
    ? buildDocsUrl(environment.projectId, model.uniqueId, explorerEnv(environment.id))
    : undefined;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`${model.name} · Performance`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Success Rate">
            <Detail.Metadata.TagList.Item text={successRate} color={successRateColor(successRatio)} />
          </Detail.Metadata.TagList>
          <ContextMetadata projectId={environment.projectId} environmentId={environment.id} />
          {model.materializedType && <Detail.Metadata.Label title="Materialization" text={model.materializedType} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Average Execution" text={formatSeconds(average)} icon={Icon.Clock} />
          <Detail.Metadata.Label title="Median Execution" text={formatSeconds(median(durations))} icon={Icon.Clock} />
          <Detail.Metadata.Label title="Slowest Run" text={formatSeconds(slowest)} icon={Icon.ArrowUp} />
          {model.tags && model.tags.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {model.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {explorerUrl && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Link title="dbt Cloud" target={explorerUrl} text="Open in Explorer" />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {environment.projectId > 0 && (
            <ModelGoTo
              uniqueId={model.uniqueId}
              name={model.name}
              environmentId={environment.id}
              projectId={environment.projectId}
              environmentName={environment.name}
              projectName={environment.projectName}
              withLastRun
              omit={["performance"]}
            />
          )}
          <ActionPanel.Section title="Open in dbt Cloud">
            {explorerUrl && (
              <Action.OpenInBrowser url={explorerUrl} title="Open in dbt Explorer" shortcut={Shortcuts.webDocs} />
            )}
            {runs[0] && (
              <Action.OpenInBrowser
                url={runUrl(runs[0].runId)}
                title="Open Latest Run in dbt Cloud"
                shortcut={Shortcuts.webRun}
                icon={Icon.Play}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Unique ID" shortcut={Shortcuts.copyId} content={model.uniqueId} />
            <Action.CopyToClipboard
              title="Copy Average Execution"
              shortcut={Shortcuts.copyAverage}
              content={formatSeconds(average)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  return <ModelPerformanceList />;
}

export function ModelPerformanceList({ environment: fixed }: { environment?: CatalogEnvironment } = {}) {
  const explorerEnv = useExplorerEnvironment();
  const [environmentId, setEnvironmentId] = useState<string>();
  const { data: environments = [], isLoading: loadingEnvironments } = useCachedPromise(resolveCatalogEnvironments, [], {
    execute: !fixed,
  });
  const environment = fixed ?? environments.find((env) => String(env.id) === environmentId) ?? environments[0];

  const { data: models = [], isLoading: loadingModels } = useCachedPromise(
    async (id: number) => {
      const nodes = await fetchModelPerformance(id);
      // Slowest first; models that never ran go last
      return nodes.sort((a, b) => (b.executionInfo?.executionTime ?? -1) - (a.executionInfo?.executionTime ?? -1));
    },
    [environment?.id ?? 0],
    { execute: Boolean(environment) },
  );

  return (
    <List
      isLoading={(!fixed && loadingEnvironments) || loadingModels}
      navigationTitle={fixed ? `Model Performance · ${describeEnvironment(fixed)}` : undefined}
      searchBarPlaceholder="Search models..."
      searchBarAccessory={
        fixed ? undefined : (
          <List.Dropdown tooltip="Environment" storeValue onChange={setEnvironmentId}>
            {environments.map((env) => (
              <List.Dropdown.Item key={env.id} title={describeEnvironment(env)} value={String(env.id)} />
            ))}
          </List.Dropdown>
        )
      }
    >
      <List.EmptyView title="No models found" description="This environment has no models in the catalog yet" />
      {environment && (
        <List.Section
          title="Slowest models"
          subtitle={`${plural(models.length, "model")} · ${describeEnvironment(environment)}`}
        >
          {models.map((model) => {
            const info = model.executionInfo;
            const style = styleFor(info?.lastRunStatus);
            return (
              <List.Item
                key={model.uniqueId}
                title={model.name}
                subtitle={model.materializedType ?? undefined}
                keywords={model.tags ?? []}
                icon={{ source: Icon.Clock, tintColor: style?.color ?? Color.SecondaryText }}
                accessories={[
                  ...(info?.lastRunStatus
                    ? [
                        {
                          tag: {
                            value: modelStatus(info.lastRunStatus)?.label ?? info.lastRunStatus,
                            color: style?.color,
                          },
                        },
                      ]
                    : []),
                  { text: formatSeconds(info?.executionTime), tooltip: "Last execution time" },
                  dateAccessory(info?.lastRunGeneratedAt, "Last run"),
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Performance"
                      shortcut={Shortcuts.performance}
                      icon={Icon.BarChart}
                      target={<ModelPerformanceDetail model={model} environment={environment} />}
                    />
                    {environment.projectId > 0 && (
                      <ModelGoTo
                        uniqueId={model.uniqueId}
                        name={model.name}
                        environmentId={environment.id}
                        projectId={environment.projectId}
                        environmentName={environment.name}
                        projectName={environment.projectName}
                        omit={["performance"]}
                      />
                    )}
                    {environment.projectId > 0 && (
                      <Action.OpenInBrowser
                        url={buildDocsUrl(environment.projectId, model.uniqueId, explorerEnv(environment.id))}
                        title="Open in dbt Explorer"
                        shortcut={Shortcuts.webDocs}
                      />
                    )}
                    <Action.CopyToClipboard
                      title="Copy Unique ID"
                      shortcut={Shortcuts.copyId}
                      content={model.uniqueId}
                    />
                    {info?.lastRunError && (
                      <Action.CopyToClipboard
                        title="Copy Last Error"
                        shortcut={Shortcuts.copyError}
                        content={info.lastRunError}
                      />
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
