import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getProjectSummaries } from "./lib/session-parser";
import type { TimeRange, ProjectSummary, SessionSummary } from "./lib/types";
import {
  formatTokenCount,
  formatCost,
  formatLineCount,
  formatTimestamp,
} from "./lib/formatting";

export default function TokenWatcherProjects() {
  const [timeRange, setTimeRange] = useState<TimeRange>("today");

  const { data: projects, isLoading } = useCachedPromise(
    (range: TimeRange) => getProjectSummaries(range),
    [timeRange],
    { keepPreviousData: true },
  );

  const totalCost = projects?.reduce((s, p) => s + p.totalCost, 0) ?? 0;
  const totalTokens =
    projects?.reduce(
      (s, p) =>
        s +
        p.totalTokens.input_tokens +
        p.totalTokens.output_tokens +
        p.totalTokens.cache_creation_input_tokens +
        p.totalTokens.cache_read_input_tokens,
      0,
    ) ?? 0;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Projects"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Time Range"
          value={timeRange}
          onChange={(v) => setTimeRange(v as TimeRange)}
        >
          <List.Dropdown.Item title="Today" value="today" />
          <List.Dropdown.Item title="Past 7 Days" value="week" />
          <List.Dropdown.Item title="Past 30 Days" value="month" />
          <List.Dropdown.Item title="All Time" value="all" />
        </List.Dropdown>
      }
    >
      <List.Section
        title="Projects"
        subtitle={`${formatTokenCount(totalTokens)} tokens · ${formatCost(totalCost)}`}
      >
        {projects?.map((project) => (
          <ProjectItem key={project.projectDir} project={project} />
        ))}
      </List.Section>
    </List>
  );
}

function projectName(path: string): string {
  return path.split("/").pop() || path;
}

function allTokens(t: {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}): number {
  return (
    t.input_tokens +
    t.output_tokens +
    t.cache_creation_input_tokens +
    t.cache_read_input_tokens
  );
}

function ProjectItem({ project }: { project: ProjectSummary }) {
  const name = projectName(project.projectPath);
  const tokens = allTokens(project.totalTokens);

  return (
    <List.Item
      icon={Icon.Folder}
      title={name}
      accessories={[
        { text: formatTokenCount(tokens) },
        { text: formatCost(project.totalCost) },
        { tag: `${project.sessionCount} sessions` },
      ]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Project Path"
            content={project.projectPath}
          />
          <Action.CopyToClipboard
            title="Copy Cost Summary"
            content={`${name}\nPath: ${project.projectPath}\nSessions: ${project.sessionCount}\nTokens: ${tokens.toLocaleString()}\nCost: ${formatCost(project.totalCost)}`}
          />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Project"
                text={project.projectPath}
              />
              <List.Item.Detail.Metadata.Label
                title="Sessions"
                text={String(project.sessionCount)}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Input Tokens"
                text={formatTokenCount(project.totalTokens.input_tokens)}
              />
              <List.Item.Detail.Metadata.Label
                title="Output Tokens"
                text={formatTokenCount(project.totalTokens.output_tokens)}
              />
              <List.Item.Detail.Metadata.Label
                title="Cache Write"
                text={formatTokenCount(
                  project.totalTokens.cache_creation_input_tokens,
                )}
              />
              <List.Item.Detail.Metadata.Label
                title="Cache Read"
                text={formatTokenCount(
                  project.totalTokens.cache_read_input_tokens,
                )}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Total Tokens"
                text={formatTokenCount(tokens)}
              />
              <List.Item.Detail.Metadata.Label
                title="Total Cost"
                text={formatCost(project.totalCost)}
              />
              <List.Item.Detail.Metadata.Label
                title="Lines"
                text={formatLineCount(project.linesAdded, project.linesRemoved)}
              />
              {project.sessions.length > 0 && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Sessions" text="" />
                  {project.sessions.map((s) => (
                    <List.Item.Detail.Metadata.Label
                      key={s.sessionId}
                      title={`  ${sessionLabel(s)}`}
                      text={`${formatTokenCount(allTokens(s.totalTokens))} · ${formatCost(s.costUSD)} · ${formatLineCount(s.linesAdded, s.linesRemoved)}`}
                    />
                  ))}
                </>
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}

function sessionLabel(s: SessionSummary): string {
  const model = s.model.replace("claude-", "").replace(/-\d{8}$/, "");
  const time = formatTimestamp(s.lastTimestamp);
  return `${model} · ${time}`;
}
