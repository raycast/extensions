import { ActionPanel, Icon, List, useNavigation, Action } from "@raycast/api";
import ProjectComponent from "../project";
import { Project, Team, User } from "../../types";
import fromNow from "../../utils/time";
import SearchBarAccessory from "../search-projects/search-bar-accessory";
import useVercel from "../../hooks/use-vercel-info";

type Props = {
  projects?: Project[];
  user?: User;
  selectedTeam?: Team;
  updateProject: (projectId: string, project: Partial<Project>, teamId?: string) => Promise<void>;
  teams?: Team[];
};

const SearchProjectPage = ({ projects, user, selectedTeam, updateProject, teams }: Props) => {
  const { push } = useNavigation();
  const { onTeamChange } = useVercel();

  return (
    <List
      searchBarPlaceholder="Search Projects..."
      navigationTitle="Results"
      isLoading={!projects && !teams?.length}
      searchBarAccessory={
        <>
          {user && (
            <SearchBarAccessory selectedTeam={selectedTeam} teams={teams || []} user={user} onChange={onTeamChange} />
          )}
        </>
      }
    >
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
                    push(<ProjectComponent team={selectedTeam} project={project} updateProject={updateProject} />);
                  }}
                />
              </ActionPanel>
            }
            accessories={[
              {
                text:
                  project.latestDeployments?.length && project.latestDeployments[0].createdAt
                    ? fromNow(project.latestDeployments[0].createdAt, new Date())
                    : "",
              },
            ]}
          />
        ))}
    </List>
  );
};

const ProjectListSection = ({ projects, selectedTeam, user, updateProject, teams }: Props) => {
  return (
    <SearchProjectPage
      projects={projects}
      updateProject={updateProject}
      user={user}
      selectedTeam={selectedTeam}
      teams={teams}
    />
  );
};

export default ProjectListSection;
