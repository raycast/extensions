import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { Environment, EnvironmentDetails, Project, ProjectDetails, Resource } from "./lib/types";
import useCoolify from "./lib/use-coolify";
import { isValidCoolifyUrl } from "./lib/utils";
import InvalidUrl from "./lib/components/invalid-url";
import OpenInCoolify from "./lib/components/open-in-coolify";
import { getAvatarIcon } from "@raycast/utils";
import { useMemo } from "react";
import CreateProject from "./lib/components/projects/create";
import UpdateProject from "./lib/components/projects/update";
import EnvironmentVariables from "./lib/components/environment-variables";

export default function Projects() {
  if (!isValidCoolifyUrl()) return <InvalidUrl />;

  const { isLoading, data: projects = [], revalidate } = useCoolify<Project[]>("projects");

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search project">
      <List.Section title="Projects" subtitle={`${projects.length} projects`}>
        {projects.map((project) => (
          <List.Item
            key={project.uuid}
            icon={getAvatarIcon(project.name)}
            title={project.name}
            subtitle={project.description || ""}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Eye}
                  title="View Environments"
                  target={<ViewEnvironments project={project} />}
                />
                <Action.Push
                  icon={Icon.Pencil}
                  title="Update Project"
                  target={<UpdateProject project={project} onUpdated={revalidate} />}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                />
                <Action.Push
                  icon={Icon.Plus}
                  title="Add Project"
                  target={<CreateProject onAdded={revalidate} />}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
                <OpenInCoolify url={`project/${project.uuid}`} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function ViewEnvironments({ project }: { project: Project }) {
  const { isLoading, data } = useCoolify<ProjectDetails>(`projects/${project.uuid}`);
  const environments = data?.environments ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search environments">
      <List.Section
        title={`Projects / ${project.name} / Environments`}
        subtitle={`${environments.length} environments`}
      >
        {environments.map((environment) => (
          <List.Item
            key={environment.id}
            icon={getAvatarIcon(environment.name)}
            title={environment.name}
            subtitle={environment.description || ""}
            accessories={[{ date: new Date(environment.updated_at), tooltip: `Updated: ${environment.updated_at}` }]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Eye}
                  title="View Resources"
                  target={<ViewResources project={project} environment={environment} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function ViewResources({ project, environment }: { project: Project; environment: Environment }) {
  const { isLoading, data } = useCoolify<EnvironmentDetails>(`projects/${project.uuid}/${environment.name}`);
  const resources = useMemo(() => {
    if (!data) return [];
    const flattenedArray = Object.entries(data)
      .filter(([, val]) => Array.isArray(val))
      .flatMap(([key, val]) => (val as Resource[]).map((item) => ({ ...item, type: key })));
    return flattenedArray;
  }, [data]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search resource">
      <List.Section
        title={`Projects / ${project.name} / Environments / ${environment.name}`}
        subtitle={`${resources.length} resources`}
      >
        {resources.map((resource) => (
          <List.Item
            key={resource.uuid}
            icon={getAvatarIcon(resource.name)}
            title={resource.name}
            subtitle={resource.type}
            actions={
              <ActionPanel>
                {["applications", "services"].includes(resource.type) && (
                  <Action.Push
                    icon={Icon.MagnifyingGlass}
                    title="View Environment Variables"
                    target={<EnvironmentVariables resource={resource} />}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
