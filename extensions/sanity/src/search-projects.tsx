import { ActionPanel, Icon, List, Action, Color } from "@raycast/api";
import { client, projectClient } from "./util/client";
import { useCachedPromise } from "@raycast/utils";
import { SanityProject } from "@sanity/client";

function generateProjectUrl(project: SanityProject) {
  return project.organizationId
    ? `https://www.sanity.io/organizations/${project.organizationId}/project/${project.id}`
    : `https://www.sanity.io/manage/personal/project/${project.id}`;
}

export default function SearchProjects() {
  const { isLoading, data: projects } = useCachedPromise(async () => await client.projects.list(), [], {
    initialData: [],
  });

  return (
    <List searchBarPlaceholder="Search Projects..." isLoading={isLoading}>
      {projects
        .filter((project) => !project.isDisabled && !project.isDisabledByUser)
        .map((project) => (
          <List.Item
            key={project.id}
            id={project.id}
            icon="sanity-icon.png"
            title={project.displayName}
            subtitle={project.metadata.externalStudioHost || project.studioHost || "not deployed"}
            keywords={
              project.metadata.externalStudioHost
                ? [project.metadata.externalStudioHost]
                : project.studioHost
                  ? [project.studioHost]
                  : []
            }
            actions={
              <ActionPanel>
                {(project.metadata.externalStudioHost || project.studioHost) && (
                  <Action.OpenInBrowser
                    title="Open Studio"
                    icon={Icon.Link}
                    url={project.metadata.externalStudioHost || `https://${project.studioHost}.sanity.studio`}
                  />
                )}

                <Action.OpenInBrowser title="Manage Project" icon={Icon.Cog} url={generateProjectUrl(project)} />
                <ActionPanel.Section>
                  <Action.Push icon={Icon.Coin} title="Search Datasets" target={<SearchDatasets project={project} />} />
                </ActionPanel.Section>
              </ActionPanel>
            }
            accessories={[
              {
                date: new Date(project.createdAt),
                tooltip: `Created At ${project.createdAt}`,
              },
            ]}
          />
        ))}
    </List>
  );
}

function SearchDatasets({ project }: { project: SanityProject }) {
  const { isLoading, data: datasets } = useCachedPromise(
    async () => await projectClient(project.id).datasets.list(),
    [],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading}>
      {datasets.map((dataset, datasetIndex) => (
        <List.Item
          key={datasetIndex}
          icon={Icon.Coin}
          title={dataset.name}
          accessories={[
            { tag: { value: dataset.aclMode, color: dataset.aclMode === "public" ? Color.Green : undefined } },
            { date: new Date(dataset.createdAt), tooltip: `Created At ${dataset.createdAt}` },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`${generateProjectUrl(project)}/datasets?name=${dataset.name}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
