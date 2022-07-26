import { ActionPanel, open, Icon, List, useNavigation, Action, showToast, Toast } from "@raycast/api";
import { Project } from "../../types";
import fromNow from "../../utils/time";
import SearchBarAccessory from "../search-projects/search-bar-accessory";
import useVercel from "../../hooks/use-vercel-info";
import { getFetchProjectsURL } from "../../vercel";
import { useFetch } from "@raycast/utils";
import { FetchHeaders } from "../../vercel";
import InspectDeployment from "../inspect-deployment";
import DeploymentsList from "./deployments-list";
import EnvironmentVariables from "./environment-variables-list";

const ProjectListSection = () => {
  const { selectedTeam, updateSelectedTeam, teams, user } = useVercel();

  const url = getFetchProjectsURL(selectedTeam?.id);

  const { isLoading, data, revalidate, } = useFetch<{
    projects: Project[];
    // TODO: why can't I `{ headers: FetchHeaders }` here?
  }>(url, {
    // @ts-expect-error Type 'null' is not assignable to type 'string'.
    headers: FetchHeaders.get("Authorization") ? [["Authorization", FetchHeaders.get("Authorization")]] : [[]],
  });

  const onTeamChange = async (teamIdOrUsername: string) => {
    await updateSelectedTeam(teamIdOrUsername);
    revalidate();
  }

  const projects = data?.projects;

  const { push } = useNavigation();

  return <List
    searchBarPlaceholder="Search Projects..."
    navigationTitle="Results"
    isLoading={isLoading}
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
                title="Inspect Most Recent Deployment"
                icon={Icon.ArrowRight}
                onAction={async () => {
                  if (project.latestDeployments?.length) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    push(<InspectDeployment deployment={project.latestDeployments[0] as any} />);
                  } else {
                    showToast({
                      style: Toast.Style.Failure,
                      title: "No deployments found",
                    });
                  }
                }}
              />
              <Action
                title="Search Deployments"
                icon={Icon.MagnifyingGlass}
                onAction={async () => {
                  push(<DeploymentsList projectId={project.id} />);
                }}
              />
              {!!project.latestDeployments?.length && <Action
                title="Visit Most Recent Deployment"
                icon={Icon.Link}
                onAction={async () => {
                  open("https://" + project.latestDeployments?.[0].url || "");
                }}
              />}
              <Action
                title="Inspect Environment Variables"
                icon={Icon.ArrowRight}
                onAction={async () => {
                  push(<EnvironmentVariables team={selectedTeam} project={project} />);
                }}
              />
            </ActionPanel>
          }
          accessories={[
            {
              text:
                project.latestDeployments?.length && project.latestDeployments[0].createdAt
                  ? fromNow(project.latestDeployments[0].createdAt, new Date())
                  : "never",
              tooltip: project.latestDeployments?.length && project.latestDeployments[0].createdAt ? new Date(project.latestDeployments[0].createdAt).toLocaleString() : "",
            },
          ]}
        />
      ))}
  </List>
};

export default ProjectListSection;
