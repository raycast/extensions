import { ActionPanel, Cache, open, Icon, List, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { client } from "./util/client";
import { SanityProject } from "@sanity/client";

const cache = new Cache();

export default function SearchProjects() {
  const [projects, setProjects] = useState<SanityProject[] | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      const cachedProjects = cache.get("projects");
      /*
       * If we have a cached version of the projects, use that
       * while we fetch the fresh version in the background
       * */
      if (cachedProjects) {
        setProjects(JSON.parse(cachedProjects));
      }
      const freshProjects: SanityProject[] = await client.projects.list();
      cache.set("projects", JSON.stringify(freshProjects));
      setProjects(freshProjects);
    }
    fetchProjects();
  }, []);
  const isLoading = !projects;
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
