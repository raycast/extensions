import { ActionPanel, open, Icon, List, Action, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Project } from "./types/Project";

export default function SearchProjects() {
  const { isLoading, data } = useFetch<Project[]>("https://api.sanity.io/v2021-06-07/projects", {
    headers: {
      Authorization: `Bearer ${getPreferenceValues().accessToken}`,
    },
  });

  const projects = data;

  return (
    <List searchBarPlaceholder="Search Projects..." isLoading={isLoading}>
      {projects &&
        projects
          .filter((project) => !project.isDisabled && !project.isDisabledByUser)
          .map((project) => (
            <List.Item
              key={project.id}
              id={project.id}
              title={project.displayName}
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
                    <Action
                      title="Open Studio"
                      icon={Icon.Link}
                      onAction={async () => {
                        const url = project.metadata.externalStudioHost || project.studioHost;

                        if (url) {
                          open(url);
                        }
                      }}
                    />
                  )}

                  <Action
                    title="Manage Project"
                    icon={Icon.Cog}
                    onAction={async () => {
                      const url = project.organizationId
                        ? `https://www.sanity.io/organizations/${project.organizationId}/project/${project.id}`
                        : `https://www.sanity.io/manage/personal/project/${project.id}`;

                      open(url);
                    }}
                  />
                </ActionPanel>
              }
              accessories={[
                {
                  text: project.metadata.externalStudioHost || project.studioHost || "not deployed",
                },
              ]}
            />
          ))}
    </List>
  );
}
