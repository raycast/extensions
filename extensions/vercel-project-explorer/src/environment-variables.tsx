import isValidToken from "./utils/is-valid-token";
import useVercel from "./hooks/use-vercel-info";
import { Action, ActionPanel, Icon, List, LocalStorage, useNavigation } from "@raycast/api";
import EnvironmentVariables from "./pages/lists/environment-variables-list";

function Main() {
  isValidToken();

  const { projects, selectedTeam } = useVercel();

  const { push } = useNavigation();
  return (
    <List isLoading={!projects} navigationTitle="Select a project to edit" searchBarPlaceholder="Search Projects...">
      {projects &&
        projects.map((project) => (
          <List.Item
            key={project.id}
            id={project.id}
            title={project.name}
            subtitle={(project.env?.length || "No") + " Environment Variables"}
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
                    push(<EnvironmentVariables project={project} team={selectedTeam} />);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

export default Main;
