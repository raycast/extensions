import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { ownerOf, Project, spansOrgs, useProjects } from "./api";
import { verwatch } from "./auth";
import { ProjectPackages } from "./project-packages";
import { RunUpdateForm } from "./run-update-form";
import { TeamDropdown, teamIcon, useTeamFilter } from "./team-dropdown";

function SearchProjects() {
  const { data, isLoading, revalidate } = useProjects();
  const teams = useTeamFilter();
  const projects = (data?.projects ?? []).filter(teams.includes);
  const showsOrg = spansOrgs(projects.map((project) => project.path));

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects by name or repository"
      searchBarAccessory={
        <TeamDropdown teams={data?.teams ?? []} onChange={teams.setTeam} />
      }
    >
      {projects.map((project) => (
        <List.Item
          key={`${project.team.slug}/${project.path}`}
          icon={
            project.urgent_packages_count > 0
              ? { source: Icon.ExclamationMark, tintColor: Color.Red }
              : project.is_outdated
                ? { source: Icon.ArrowUpCircle, tintColor: Color.Orange }
                : { source: Icon.CheckCircle, tintColor: Color.Green }
          }
          title={project.name}
          subtitle={showsOrg ? ownerOf(project.path) : undefined}
          keywords={[
            project.slug,
            project.path,
            project.repository ?? "",
            project.team.name,
          ].filter(Boolean)}
          accessories={accessories(project, teams.showsAll)}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Packages"
                icon={Icon.List}
                target={<ProjectPackages project={project} />}
              />
              <Action.OpenInBrowser
                title="Open in VerWatch"
                url={project.url}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
              {project.source_type === "github" && (
                <Action.Push
                  title="Run Update…"
                  icon={Icon.ArrowUpCircle}
                  target={<RunUpdateForm project={project} />}
                  shortcut={{ modifiers: ["cmd"], key: "u" }}
                />
              )}
              {project.repository && (
                <Action.OpenInBrowser
                  title="Open Repository"
                  icon={Icon.Code}
                  url={`https://github.com/${project.repository}`}
                  shortcut={{ modifiers: ["cmd"], key: "g" }}
                />
              )}
              <Action.CopyToClipboard
                title="Copy VerWatch URL"
                content={project.url}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={Keyboard.Shortcut.Common.Refresh}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function accessories(
  project: Project,
  showsTeam: boolean,
): List.Item.Accessory[] {
  return [
    ...(project.urgent_packages_count > 0
      ? [
          {
            tag: {
              value: String(project.urgent_packages_count),
              color: Color.Red,
            },
            tooltip: "Urgent packages",
          },
        ]
      : []),
    ...(project.outdated_packages_count > 0
      ? [
          {
            tag: {
              value: String(project.outdated_packages_count),
              color: Color.Orange,
            },
            tooltip: "Outdated packages",
          },
        ]
      : []),
    ...(project.craft_version
      ? [{ text: `Craft ${project.craft_version}` }]
      : []),
    ...(showsTeam
      ? [
          {
            tag: project.team.name,
            icon: teamIcon(project.team),
            tooltip: "Team",
          },
        ]
      : []),
  ];
}

export default withAccessToken(verwatch)(SearchProjects);
