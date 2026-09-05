import { Action, ActionPanel, Icon, List, open, Keyboard } from "@raycast/api";
import { useState } from "react";

import type { ProjectListItem } from "../api/projects";
import { getUserAvatar, projectStatusIcon } from "../helpers/icons";
import { getLinearAppUrl } from "../helpers/open-linear";
import { getSlackChannelUrl } from "../helpers/slack-url";
import { useProjects } from "../hooks/use-projects";

import { ProjectDetail } from "./project-detail";

function ProjectListItemView({ project }: { project: ProjectListItem }) {
  const status = projectStatusIcon[project.status.type];
  const keywords = [project.status.name, ...project.teams.nodes.map((team) => team.key)];
  if (project.lead) {
    keywords.push(project.lead.displayName);
  }

  return (
    <List.Item
      title={project.name}
      subtitle={project.description}
      keywords={keywords}
      icon={{ source: status.source, tintColor: project.color || status.tintColor }}
      accessories={[
        { text: `${Math.round(project.progress * 100)}%`, tooltip: "Progress" },
        ...(project.teams.nodes.length > 0
          ? [{ icon: Icon.PersonLines, text: project.teams.nodes.map((team) => team.key).join(", ") }]
          : []),
        {
          icon: getUserAvatar(project.lead),
          tooltip: project.lead ? `Lead: ${project.lead.displayName}` : "Unassigned",
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Show Details"
              icon={Icon.Sidebar}
              target={<ProjectDetail projectId={project.id} projectName={project.name} />}
            />
            <Action.OpenInBrowser title="Open in Linear" url={project.url} icon={Icon.Globe} />
            <Action
              title="Open in Linear App"
              icon={Icon.AppWindow}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              onAction={() => open(getLinearAppUrl(project.url))}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            {project.slackChannelId ? (
              <Action.OpenInBrowser
                title="Open Slack Channel"
                url={getSlackChannelUrl(project.slackChannelId)}
                icon={Icon.SpeechBubble}
                shortcut={Keyboard.Shortcut.Common.Duplicate}
              />
            ) : null}
            <Action.CopyToClipboard
              title="Copy Project URL"
              content={project.url}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function ProjectList() {
  const [searchText, setSearchText] = useState("");
  const { projects, isLoadingProjects, pagination } = useProjects(searchText);

  return (
    <List
      isLoading={isLoadingProjects}
      onSearchTextChange={setSearchText}
      pagination={pagination}
      filtering={false}
      throttle
      searchBarPlaceholder="Search projects by name"
    >
      {projects.map((project) => (
        <ProjectListItemView key={project.id} project={project} />
      ))}
      <List.EmptyView title="No projects found" description="Try a different search term." />
    </List>
  );
}
