import Dockerode, { ContainerInfo } from '@priithaamer/dockerode';
import { ActionPanel, Color, Icon, List, showToast, ToastStyle } from '@raycast/api';
import { useEffect, useMemo, useState } from 'react';
import { isContainerRunning } from './docker/container';
import ErrorDetail from './error_detail';

const containerName = (container: ContainerInfo) => container.Names.map((name) => name.replace(/^\//, '')).join(', ');

const filterContainers = (containers: ContainerInfo[], projectFilter?: string) => {
  if (projectFilter === undefined) {
    return containers;
  }
  return containers.filter((container) => container.Labels['com.docker.compose.project'] === projectFilter);
};

const useDocker = (docker: Dockerode) => {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();

  const fetchContainers = async () => {
    setLoading(true);
    try {
      const containers = await docker.listContainers({ all: true });
      setContainers(containers);
    } catch (error) {
      if (error instanceof Error) {
        setError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const stopContainer = async (containerInfo: ContainerInfo) => {
    setLoading(true);
    await docker.getContainer(containerInfo.Id).stop();
    const containers = await docker.listContainers({ all: true });
    setContainers(containers);
    setLoading(false);
  };

  const startContainer = async (containerInfo: ContainerInfo) => {
    setLoading(true);
    await docker.getContainer(containerInfo.Id).start();
    const containers = await docker.listContainers({ all: true });
    setContainers(containers);
    setLoading(false);
  };

  const restartContainer = async (containerInfo: ContainerInfo) => {
    setLoading(true);
    await docker.getContainer(containerInfo.Id).restart();
    const containers = await docker.listContainers({ all: true });
    setContainers(containers);
    setLoading(false);
  };

  const removeContainer = async (containerInfo: ContainerInfo) => {
    setLoading(true);
    await docker.getContainer(containerInfo.Id).remove();
    const containers = await docker.listContainers({ all: true });
    setContainers(containers);
    setLoading(false);
  };

  useEffect(() => {
    fetchContainers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { containers, loading, error, stopContainer, startContainer, restartContainer, removeContainer };
};

export default function ContainerList(props: { projectFilter?: string }) {
  const docker = useMemo(() => new Dockerode(), []);
  const { containers, loading, error, stopContainer, startContainer, restartContainer, removeContainer } =
    useDocker(docker);

  if (error) {
    return <ErrorDetail error={error} />;
  }

  return (
    <List isLoading={loading}>
      {filterContainers(containers, props.projectFilter).map((containerInfo) => (
        <List.Item
          key={containerInfo.Id}
          title={containerName(containerInfo)}
          subtitle={containerInfo.Image}
          accessoryTitle={containerInfo.State}
          icon={{ source: Icon.Terminal, tintColor: isContainerRunning(containerInfo) ? Color.Green : Color.Red }}
          actions={
            <ActionPanel>
              {containerInfo.State === 'running' && (
                <>
                  <ActionPanel.Item
                    title="Stop Container"
                    shortcut={{ modifiers: ['cmd', 'shift'], key: 'w' }}
                    onAction={async () => {
                      await stopContainer(containerInfo);
                      await showToast(ToastStyle.Success, `Container ${containerName(containerInfo)} stopped`);
                    }}
                  />
                  <ActionPanel.Item
                    title="Restart Container"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ['opt'], key: 'r' }}
                    onAction={async () => {
                      await restartContainer(containerInfo);
                      await showToast(ToastStyle.Success, `Container ${containerName(containerInfo)} restarted`);
                    }}
                  />
                </>
              )}
              {containerInfo.State !== 'running' && (
                <ActionPanel.Item
                  title="Start Container"
                  shortcut={{ modifiers: ['cmd', 'shift'], key: 'r' }}
                  onAction={async () => {
                    await startContainer(containerInfo);
                    await showToast(ToastStyle.Success, `Container ${containerName(containerInfo)} started`);
                  }}
                />
              )}
              <ActionPanel.Item
                title="Remove Container"
                icon={Icon.Trash}
                shortcut={{ modifiers: ['cmd', 'shift'], key: 'x' }}
                onAction={async () => {
                  await removeContainer(containerInfo);
                  await showToast(ToastStyle.Success, `Container ${containerName(containerInfo)} removed`);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
