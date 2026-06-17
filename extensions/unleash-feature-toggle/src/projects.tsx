import { Action, ActionPanel, Grid, Icon, useNavigation } from "@raycast/api";
import { useGetAllProjects } from "./hooks/useGetAllProjects";
import Error from "./components/Error";
import Features from "./views/Features";
import { useCachedState } from "@raycast/utils";
import { TError } from "./types";

export default function Projects() {
  const { data, isLoading, error, revalidate } = useGetAllProjects();

  const [, setSelectedProject] = useCachedState("project-id", "");

  const { push } = useNavigation();

  const errResponse = error as TError;

  if (error) {
    return <Error errCode={errResponse.code} revalidate={revalidate} />;
  }

  return (
    <Grid isLoading={isLoading} searchBarPlaceholder="Search Projects..." inset={Grid.Inset.Small}>
      {data?.map((project) => (
        <Grid.Item
          title={project.name}
          content={{
            source: Icon.Layers,
          }}
          key={project.name}
          subtitle={`${project.featureCount} Toggles`}
          actions={
            <ActionPanel>
              <Action
                title="View Toggles"
                onAction={() => {
                  setSelectedProject(project.id);
                  push(<Features />);
                }}
              />
            </ActionPanel>
          }
          accessory={{
            icon: Icon.Layers,
          }}
        />
      ))}
    </Grid>
  );
}
