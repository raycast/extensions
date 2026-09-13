import { List, showToast, Toast, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { returnProjects } from "./fetch_projects";
import { returnJobs } from "./fetch_jobs";
import { returnEnvironments } from "./fetch_environments";
import { returnRuns } from "./fetch_runs";
import { ProjectModel, JobModel, EnvironmentModel, RunModel } from "./types";
import { buildDbtCloudUrl, formatRelativeTime } from "./api";

type SearchResult =
  | { type: "project"; data: ProjectModel }
  | { type: "job"; data: JobModel }
  | { type: "environment"; data: EnvironmentModel }
  | { type: "run"; data: RunModel };

function getResultIcon(result: SearchResult): { source: Icon; tintColor: Color } {
  switch (result.type) {
    case "project":
      return { source: Icon.Document, tintColor: Color.Blue };
    case "job":
      return { source: Icon.Hammer, tintColor: Color.Green };
    case "environment":
      return { source: Icon.Globe, tintColor: Color.Purple };
    case "run": {
      const run = result.data as RunModel;
      if (run.status === 10) return { source: Icon.Checkmark, tintColor: Color.Green };
      if (run.status === 20) return { source: Icon.XmarkCircle, tintColor: Color.Red };
      if (run.status === 3) return { source: Icon.ArrowClockwise, tintColor: Color.Purple };
      return { source: Icon.Clock, tintColor: Color.Blue };
    }
  }
}

function getResultUrl(result: SearchResult): string {
  switch (result.type) {
    case "project":
      return buildDbtCloudUrl(`/projects/${result.data.id}`);
    case "job": {
      const job = result.data as JobModel;
      return buildDbtCloudUrl(`/projects/${job.project_id}/jobs/${job.id}`);
    }
    case "environment": {
      const env = result.data as EnvironmentModel;
      return buildDbtCloudUrl(`/projects/${env.project_id}/environments/${env.id}`);
    }
    case "run": {
      const run = result.data as RunModel;
      return run.href || buildDbtCloudUrl(`/projects/${run.project_id}/runs/${run.id}`);
    }
  }
}

function getResultTitle(result: SearchResult): string {
  switch (result.type) {
    case "project":
      return result.data.name;
    case "job":
      return (result.data as JobModel).name;
    case "environment":
      return (result.data as EnvironmentModel).name;
    case "run": {
      const run = result.data as RunModel;
      return `${run.job?.name || "Job"} - Run #${run.id}`;
    }
  }
}

function getResultSubtitle(result: SearchResult): string {
  switch (result.type) {
    case "project":
      return result.data.description || "Project";
    case "job": {
      const job = result.data as JobModel;
      return job.project?.name || `Project ${job.project_id}`;
    }
    case "environment": {
      const env = result.data as EnvironmentModel;
      return `${env.type} • ${env.project?.name || `Project ${env.project_id}`}`;
    }
    case "run": {
      const run = result.data as RunModel;
      return `${run.status_humanized} • ${run.finished_at_humanized || formatRelativeTime(run.finished_at)}`;
    }
  }
}

interface SearchResultItemProps {
  result: SearchResult;
}

const SearchResultItem = ({ result }: SearchResultItemProps) => {
  const url = getResultUrl(result);
  const icon = getResultIcon(result);
  const title = getResultTitle(result);
  const subtitle = getResultSubtitle(result);

  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      icon={icon}
      accessories={[{ text: result.type.charAt(0).toUpperCase() + result.type.slice(1) }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={url} title="Open in dbt Cloud" />
          <Action.CopyToClipboard title="Copy URL" content={url} />
          <Action.CopyToClipboard title="Copy ID" content={result.data.id.toString()} />
        </ActionPanel>
      }
    />
  );
};

export default function QuickSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [projects, jobs, environments, runs] = await Promise.all([
        returnProjects(),
        returnJobs(),
        returnEnvironments(),
        returnRuns(),
      ]);

      const allResults: SearchResult[] = [
        ...projects.map((p) => ({ type: "project" as const, data: p })),
        ...jobs.map((j) => ({ type: "job" as const, data: j })),
        ...environments.map((e) => ({ type: "environment" as const, data: e })),
        ...runs.slice(0, 20).map((r) => ({ type: "run" as const, data: r })), // Limit runs
      ];

      setResults(allResults);
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed loading data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter results based on search text
  const filteredResults = searchText
    ? results.filter((result) => {
        const title = getResultTitle(result).toLowerCase();
        const subtitle = getResultSubtitle(result).toLowerCase();
        const search = searchText.toLowerCase();
        return title.includes(search) || subtitle.includes(search);
      })
    : results;

  // Group results by type
  const groupedResults = filteredResults.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const typeLabels: Record<string, string> = {
    project: "📁 Projects",
    job: "🔨 Jobs",
    environment: "🌍 Environments",
    run: "🏃 Recent Runs",
  };

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search projects, jobs, environments, runs..."
      throttle
      onSearchTextChange={setSearchText}
    >
      <List.EmptyView title="No results found" description="Try a different search term" icon="icon_64p.png" />

      {Object.entries(groupedResults).map(([type, typeResults]) => (
        <List.Section key={type} title={typeLabels[type] || type} subtitle={`${typeResults.length} items`}>
          {typeResults.slice(0, 10).map((result, index) => (
            <SearchResultItem key={`${result.type}-${result.data.id}-${index}`} result={result} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
