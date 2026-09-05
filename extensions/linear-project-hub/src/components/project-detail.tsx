import { Action, ActionPanel, Color, Detail, Icon, open, Keyboard } from "@raycast/api";
import { useMemo } from "react";

import { getConnectedPullRequests, type ConnectedPullRequest, type ProjectIssue } from "../api/project-issues";
import type { ProjectDetail as ProjectDetailData } from "../api/projects";
import {
  cleanLinearMarkdown,
  formatDate,
  formatHealth,
  formatRelative,
  PROJECT_HEALTH_LABEL,
  stripMarkdown,
  truncate,
} from "../helpers/format-update";
import { getLinearAppUrl } from "../helpers/open-linear";
import { projectHealthColor, projectStatusIcon } from "../helpers/icons";
import { getSlackChannelUrl } from "../helpers/slack-url";
import { useProjectDetail } from "../hooks/use-project-detail";
import { useProjectIssues } from "../hooks/use-project-issues";

import { ProjectIssuesList } from "./project-issues-list";
import { ProjectUpdatesList } from "./project-updates-list";

const CONTENT_MAX_LENGTH = 1500;
const PULSE_MAX_LENGTH = 280;

const HEALTH_EMOJI: Record<string, string> = {
  onTrack: "🟢",
  atRisk: "🟡",
  offTrack: "🔴",
};

function buildMarkdown(project: ProjectDetailData, pullRequests: ConnectedPullRequest[]): string {
  const sections: string[] = [];

  sections.push(`# ${project.name}`);

  const summary = project.description?.trim();
  const content = project.content ? cleanLinearMarkdown(project.content) : "";
  if (summary || content) {
    sections.push("## Summary");
    if (summary) {
      sections.push(summary);
    }
    if (content) {
      sections.push(truncate(content, CONTENT_MAX_LENGTH));
    }
  } else {
    sections.push("_No description in Linear._");
  }

  const updates = project.projectUpdates.nodes;
  sections.push("## Latest Pulse Updates");
  if (updates.length === 0) {
    sections.push("_No pulse updates yet._");
  } else {
    for (const update of updates.slice(0, 3)) {
      const emoji = update.health ? HEALTH_EMOJI[update.health] : "•";
      const health = update.health ? PROJECT_HEALTH_LABEL[update.health] : "Update";
      const when = formatRelative(update.createdAt) ?? formatDate(update.createdAt) ?? "";
      const body = truncate(stripMarkdown(update.body), PULSE_MAX_LENGTH);
      sections.push(`### ${emoji} ${health} · ${update.user.displayName} · ${when}`);
      sections.push(`> ${body || "_Empty update._"}`);
    }
    sections.push("_Press ⌘⇧U to browse all pulse updates._");
  }

  const links = project.externalLinks.nodes;
  const documents = project.documents.nodes;
  if (links.length > 0 || documents.length > 0) {
    sections.push("## Resources");
    for (const link of links) {
      sections.push(`- [${link.label || link.url}](${link.url})`);
    }
    for (const doc of documents) {
      sections.push(`- [${doc.title || "Document"}](${doc.url})`);
    }
  }

  sections.push("## Open Pull Requests");
  if (pullRequests.length === 0) {
    sections.push("_No connected PRs on open issues._");
  } else {
    for (const pr of pullRequests) {
      sections.push(`- [${pr.title}](${pr.url}) · ${pr.issueIdentifier}`);
    }
  }

  return sections.join("\n\n");
}

function ProjectMetadata({ project }: { project: ProjectDetailData }) {
  const statusIcon = projectStatusIcon[project.status.type];
  const startDate = formatDate(project.startDate);
  const targetDate = formatDate(project.targetDate);

  return (
    <Detail.Metadata>
      <Detail.Metadata.TagList title="Status">
        <Detail.Metadata.TagList.Item text={project.status.name} color={statusIcon.tintColor} />
      </Detail.Metadata.TagList>

      <Detail.Metadata.TagList title="Health">
        <Detail.Metadata.TagList.Item
          text={formatHealth(project.health)}
          color={project.health ? projectHealthColor[project.health] : Color.SecondaryText}
        />
      </Detail.Metadata.TagList>

      <Detail.Metadata.Label
        title="Lead"
        text={project.lead ? project.lead.displayName : "Unassigned"}
        icon={project.lead ? Icon.Person : undefined}
      />

      <Detail.Metadata.Label title="Progress" text={`${Math.round(project.progress * 100)}%`} />

      {project.teams.nodes.length > 0 ? (
        <Detail.Metadata.Label title="Teams" text={project.teams.nodes.map((team) => team.key).join(", ")} />
      ) : null}

      {project.initiatives.nodes.length > 0 ? (
        <Detail.Metadata.Label title="Initiative" text={project.initiatives.nodes.map((i) => i.name).join(", ")} />
      ) : null}

      {startDate ? <Detail.Metadata.Label title="Start" text={startDate} /> : null}
      {targetDate ? <Detail.Metadata.Label title="Target" text={targetDate} /> : null}

      <Detail.Metadata.Separator />

      {project.slackChannelId ? (
        <Detail.Metadata.Link title="Slack" target={getSlackChannelUrl(project.slackChannelId)} text="Open channel" />
      ) : null}
      <Detail.Metadata.Link title="Linear" target={project.url} text="Open project" />
    </Detail.Metadata>
  );
}

function ProjectActions({
  project,
  issues,
  pullRequests,
}: {
  project: ProjectDetailData;
  issues: ProjectIssue[];
  pullRequests: ConnectedPullRequest[];
}) {
  const appUrl = getLinearAppUrl(project.url);

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open in Linear" url={project.url} icon={Icon.Globe} />
        <Action
          title="Open in Linear App"
          icon={Icon.AppWindow}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={() => open(appUrl)}
        />
        <Action.Push
          title="See Pulse Updates"
          icon={Icon.Heartbeat}
          shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
          target={<ProjectUpdatesList updates={project.projectUpdates.nodes} projectName={project.name} />}
        />
        <Action.Push
          title="Browse Issues"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
          target={<ProjectIssuesList projectId={project.id} projectName={project.name} initialIssues={issues} />}
        />
      </ActionPanel.Section>

      {project.slackChannelId ? (
        <ActionPanel.Section>
          <Action.OpenInBrowser
            title="Open Slack Channel"
            url={getSlackChannelUrl(project.slackChannelId)}
            icon={Icon.SpeechBubble}
            shortcut={Keyboard.Shortcut.Common.Duplicate}
          />
        </ActionPanel.Section>
      ) : null}

      {project.externalLinks.nodes.length > 0 || project.documents.nodes.length > 0 ? (
        <ActionPanel.Section title="Resources">
          {project.externalLinks.nodes.map((link) => (
            <Action.OpenInBrowser key={link.id} title={link.label || link.url} url={link.url} icon={Icon.Link} />
          ))}
          {project.documents.nodes.map((doc) => (
            <Action.OpenInBrowser key={doc.id} title={doc.title || "Document"} url={doc.url} icon={Icon.Document} />
          ))}
        </ActionPanel.Section>
      ) : null}

      {pullRequests.length > 0 ? (
        <ActionPanel.Section title="Open Pull Requests">
          {pullRequests.map((pr) => (
            <Action.OpenInBrowser key={pr.id} title={pr.title} url={pr.url} icon={Icon.CodeBlock} />
          ))}
        </ActionPanel.Section>
      ) : null}

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Project URL"
          content={project.url}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export function ProjectDetail({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { project, isLoadingProject } = useProjectDetail(projectId);
  const { issues, isLoadingIssues } = useProjectIssues(projectId);

  const pullRequests = useMemo(() => getConnectedPullRequests(issues), [issues]);
  const markdown = project ? buildMarkdown(project, pullRequests) : "";

  return (
    <Detail
      isLoading={isLoadingProject || isLoadingIssues}
      navigationTitle={projectName}
      markdown={markdown}
      metadata={project ? <ProjectMetadata project={project} /> : undefined}
      actions={project ? <ProjectActions project={project} issues={issues} pullRequests={pullRequests} /> : undefined}
    />
  );
}
