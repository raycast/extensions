import { ActionPanel, Detail, Icon, List, OpenInBrowserAction, render, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import { DockerContainerAction } from "./actions/actions";
import DockerContainer from "./dto/docker-container";
import { DockerService } from "./services/docker.service";
import tildify from "tildify";

const dockerService = new DockerService();

if (dockerService.dockerCliIsInstalled()) {
  render(<ContainerList />);
} else {
  render(
    <Detail navigationTitle="Docker CLI not installed" markdown={dockerService.dockerCliRequiredMessage()}>
      <ActionPanel>
        <OpenInBrowserAction url="https://docs.docker.com/desktop/mac/install/" />
      </ActionPanel>
    </Detail>
  );
}

function ContainerList() {
  const [searchQuery, setSearchText] = useState<string>();
  const { containers, error, isLoading } = getContainers(searchQuery);

  if (error) {
    showToast(ToastStyle.Failure, "Cannot search Project", error);
  }

  return (
    <List
      searchBarPlaceholder="Filter containers by name..."
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      throttle={true}
    >
      {containers?.map((container) => (
        <List.Item
          key={container.ID}
          id={container.ID}
          title={container.getTitle}
          subtitle={` ${container.Project}  ${tildify(container.WorkingDir)}`}
          keywords={[container.Project, container.getTitle]}
          accessoryTitle={container.State}
          icon={{ source: Icon.Window, tintColor: container.IconColor }}
          actions={
            <ActionPanel>
              {container.isRunning ? (
                <DockerContainerAction
                  container={container}
                  action="stop"
                  title="Stop container"
                  icon={Icon.XmarkCircle}
                  shortcut={{ modifiers: ["cmd"], key: "enter" }}
                />
              ) : (
                <DockerContainerAction
                  container={container}
                  action="start"
                  title="Start container"
                  icon={Icon.ArrowRight}
                  shortcut={{ modifiers: ["cmd"], key: "enter" }}
                />
              )}
              <DockerContainerAction
                container={container}
                action="restart"
                title="Restart container"
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                icon={Icon.ArrowClockwise}
              />
            </ActionPanel>
          }
        ></List.Item>
      ))}
    </List>
  );
}

export function getContainers(searchQuery: string | undefined): {
  containers?: DockerContainer[];
  error?: string;
  isLoading: boolean;
} {
  const [containers, setContainers] = useState<DockerContainer[]>();
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
        const dockerContainers = await dockerService.getContainers(searchQuery);

        if (!cancel) {
          setContainers(dockerContainers);
        }
      } catch (e) {
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

  return { containers, error, isLoading };
}
