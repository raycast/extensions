import { ActionPanel, Detail, Icon, List, OpenInBrowserAction, render, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import DockerProject from "./dto/docker-project";
import { DockerProjectAction } from "./actions/actions";
import { DockerService } from "./services/docker.service";
import tildify from "tildify";

const dockerService = new DockerService();

if (dockerService.dockerCliIsInstalled()) {
  render(<ProjectList />);
} else {
  render(
    <Detail navigationTitle="Docker CLI not installed" markdown={dockerService.dockerCliRequiredMessage()}>
      <ActionPanel>
        <OpenInBrowserAction url="https://docs.docker.com/desktop/mac/install/" />
      </ActionPanel>
    </Detail>
  );
}

function ProjectList() {
  const [searchQuery, setSearchText] = useState<string>();
  const { projects, error, isLoading } = getProjects(searchQuery);

  if (error) {
    showToast(ToastStyle.Failure, "Cannot search Project", error);
  }

  return (
    <List
      searchBarPlaceholder="Filter projects by name..."
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      throttle={true}
    >
      {projects?.map((project) => (
        <List.Item
          key={project.ID}
          id={project.ID}
          title={project.getTitle}
          keywords={[project.getTitle]}
          subtitle={`${project.getContainerCount} Containers  ${tildify(project.WorkingDir)}`}
          accessoryTitle={project.getState}
          icon={{ source: Icon.Window, tintColor: project.IconColor }}
          actions={
            <ActionPanel>
              {project.isRunning ? (
                <DockerProjectAction
                  project={project}
                  action="stop"
                  title="Stop all containers"
                  icon={Icon.XmarkCircle}
                  shortcut={{ modifiers: ["cmd"], key: "enter" }}
                />
              ) : (
                <DockerProjectAction
                  project={project}
                  action="start"
                  title="Start all containers"
                  icon={Icon.ArrowRight}
                  shortcut={{ modifiers: ["cmd"], key: "enter" }}
                />
              )}
              <DockerProjectAction
                project={project}
                action="restart"
                title="Restart all containers"
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                icon={Icon.ArrowClockwise}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export function getProjects(searchQuery: string | undefined): {
  projects?: DockerProject[];
  error?: string;
  isLoading: boolean;
} {
  const [projects, setProjects] = useState<DockerProject[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      if (searchQuery === null || cancel) {
        return;
      }

      setError(undefined);
      setIsLoading(true);

      try {
        const dockerProjects = await dockerService.getProjects(searchQuery);

        if (!cancel) {
          setProjects(dockerProjects);
        }
      } catch (e: any) {
        if (!cancel) {
          setError(e instanceof Error ? e.message : undefined);
        }
      } finally {
        if (!cancel) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, [searchQuery]);

  return { projects, error, isLoading };
}
