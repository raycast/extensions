import { ActionPanel, Icon, List, useNavigation, Action, LocalStorage } from "@raycast/api";
import ProjectComponent from "./project-list";

import { Project, Team } from "../types";
import { fromNow } from "../time";

type Props = {
  projects?: Project[];
  username?: string;
  selectedTeam?: Team;
  updateProject: (projectId: string, project: Partial<Project>, teamId?: string) => Promise<void>;
};

const ProjectList = ({ projects, username, selectedTeam: team, updateProject }: Props) => {
  const { push } = useNavigation();
  return (
    <List navigationTitle="Results" isLoading={!projects}>
      {projects &&
        projects.map((project) => (
          <List.Item
            key={project.id}
            id={project.id}
            title={project.name}
            subtitle={project.framework ?? ""}
            keywords={[project.framework || ""]}
            actions={
              <ActionPanel>
                <Action
                  title="Open"
                  icon={Icon.ArrowRight}
                  onAction={async () => {
                    const previous = await LocalStorage.getItem<string>("recents");
                    const recents = previous ? JSON.parse(previous) : [];
                    await LocalStorage.setItem(
                      "recents",
                      JSON.stringify(recents?.length ? [...recents, project.id] : [project.id])
                    );
                    push(
                      <ProjectComponent
                        username={username}
                        team={team}
                        project={project}
                        updateProject={updateProject}
                      />
                    );
                  }}
                />
              </ActionPanel>
            }
            accessories={[
              {
                text:
                  project.latestDeployments?.length && project.latestDeployments[0].createdAt
                    ? fromNow(project.latestDeployments[0].createdAt)
                    : "",
              },
            ]}
          />
        ))}
    </List>
  );
};

const ProjectListSection = ({ projects, selectedTeam, username, updateProject }: Props) => {
  const { push } = useNavigation();

  const newURL = `https://vercel.com/new${selectedTeam ? `/${selectedTeam.slug}` : ""}`;
  return (
    <List.Section title={selectedTeam ? `${selectedTeam.name}: Projects` : `Projects`}>
      <List.Item
        title={selectedTeam ? `${selectedTeam.name}: Search projects...` : `Search projects...`}
        icon={Icon.MagnifyingGlass}
        actions={
          <ActionPanel>
            <Action
              title="Search Projects..."
              icon={{ source: Icon.MagnifyingGlass }}
              onAction={() =>
                push(
                  <ProjectList
                    projects={projects}
                    updateProject={updateProject}
                    username={username}
                    selectedTeam={selectedTeam}
                  />
                )
              }
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Create New Project"
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={newURL} />
          </ActionPanel>
        }
      />
    </List.Section>
  );
};

export default ProjectListSection;
