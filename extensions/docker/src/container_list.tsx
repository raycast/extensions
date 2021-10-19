import { ActionPanel, Color, Detail, Icon, List } from '@raycast/api';
import { useEffect, useMemo, useState } from 'react';
import Dockerode, { ContainerInfo } from '@priithaamer/dockerode';

const containerName = (container: ContainerInfo) => container.Names.map((name) => name.replace(/^\//, '')).join(', ');

const filterContainers = (containers: ContainerInfo[], projectFilter?: string) => {
  if (projectFilter === undefined) {
    return containers;
  }
  return containers.filter((container) => container.Labels['com.docker.compose.project'] === projectFilter);
};

const useDocker = (docker: Dockerode, options: { projectFilter?: string }) => {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();

  const updateContainers = (containers: ContainerInfo[]) =>
    setContainers(filterContainers(containers, options.projectFilter));

  const fetchContainers = async () => {
    setLoading(true);
    try {
      const containers = await docker.listContainers({ all: true });
      updateContainers(containers);
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
    updateContainers(containers);
    setLoading(false);
  };

  const startContainer = async (containerInfo: ContainerInfo) => {
    setLoading(true);
    await docker.getContainer(containerInfo.Id).start();
    const containers = await docker.listContainers({ all: true });
    updateContainers(containers);
    setLoading(false);
  };

  useEffect(() => {
    fetchContainers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { containers, loading, error, stopContainer, startContainer };
};

export default function ContainerList(props: { projectFilter?: string }) {
  const docker = useMemo(() => new Dockerode(), []);
  const { containers, loading, error, stopContainer, startContainer } = useDocker(docker, props);

  if (error) {
    return <Detail markdown={`## Error connecting to Docker\n\n${error.message}\n`} />;
  }

  return (
    <List isLoading={loading}>
      {containers.map((containerInfo) => (
        <List.Item
          key={containerInfo.Id}
          title={containerName(containerInfo)}
          subtitle={containerInfo.Image}
          accessoryTitle={containerInfo.State}
          icon={{ source: Icon.Terminal, tintColor: containerInfo.State === 'running' ? Color.Green : Color.Red }}
          actions={
            <ActionPanel>
              {containerInfo.State === 'running' && (
                <ActionPanel.Item
                  title="Stop Container"
                  shortcut={{ modifiers: ['cmd', 'shift'], key: 'w' }}
                  onAction={() => stopContainer(containerInfo)}
                />
              )}
              {containerInfo.State !== 'running' && (
                <ActionPanel.Item
                  title="Start Container"
                  shortcut={{ modifiers: ['cmd', 'shift'], key: 'r' }}
                  onAction={() => startContainer(containerInfo)}
                />
              )}
              <ActionPanel.Item
                title="Remove Container"
                icon={Icon.Trash}
                shortcut={{ modifiers: ['cmd', 'shift'], key: 'x' }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
