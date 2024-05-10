import { ActionPanel, open, Icon, List, useNavigation, Action, showToast, Toast } from "@raycast/api";
import { Project } from "../../types";
import fromNow from "../../utils/time";
import SearchBarAccessory from "../search-projects/team-switch-search-accessory";
import useVercel from "../../hooks/use-vercel-info";
import { getFetchProjectsURL } from "../../vercel";
import { useFetch } from "@raycast/utils";
import { FetchHeaders } from "../../vercel";
import InspectDeployment from "../inspect-deployment";
import DeploymentsList from "./deployments-list";
import EnvironmentVariables from "./environment-variables-list";

const ProjectListSection = () => {
  const { selectedTeam, teams, user } = useVercel();
  const url = getFetchProjectsURL(selectedTeam);

  const { isLoading, data, revalidate } = useFetch<{
    projects: Project[];
    // TODO: why can't I `{ headers: FetchHeaders }` here?
  }>(url, {
    // @ts-expect-error Type 'null' is not assignable to type 'string'.
    headers: FetchHeaders.get("Authorization") ? [["Authorization", FetchHeaders.get("Authorization")]] : [[]],
  });

  const onTeamChange = () => {
    revalidate();
  };

  const projects = data?.projects;

  const { push } = useNavigation();

  return (
    <List
      searchBarPlaceholder="Search Projects..."
      navigationTitle="Results"
      isLoading={isLoading}
      searchBarAccessory={<>{user && <SearchBarAccessory onTeamChange={onTeamChange} />}</>}
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
                  title="Search Deployments"
                  icon={Icon.MagnifyingGlass}
                  onAction={async () => {
                    push(<DeploymentsList projectId={project.id} />);
                  }}
                />
                <Action
                  title="Inspect Most Recent Deployment"
                  icon={Icon.ArrowRight}
                  onAction={async () => {
                    if (project.latestDeployments?.length) {
                      push(
                        <InspectDeployment
                          username={user?.username}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          deployment={project.latestDeployments[0] as any}
                          selectedTeam={teams?.find((team) => team.id === selectedTeam)}
                        />,
                      );
                    } else {
                      showToast({
                        style: Toast.Style.Failure,
                        title: "No deployments found",
                      });
                    }
                  }}
                />
                {!!project.latestDeployments?.length && (
                  <Action
                    title="Visit Most Recent Deployment"
                    icon={Icon.Link}
                    onAction={async () => {
                      open("https://" + project.latestDeployments?.[0].url || "");
                    }}
                  />
                )}
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
                tooltip:
                  project.latestDeployments?.length && project.latestDeployments[0].createdAt
                    ? new Date(project.latestDeployments[0].createdAt).toLocaleString()
                    : "",
              },
            ]}
          />
        ))}
    </List>
  );
};

export default ProjectListSection;
