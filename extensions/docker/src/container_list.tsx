import Dockerode, { ContainerInfo } from '@priithaamer/dockerode';
import { ActionPanel, Color, Icon, List, PushAction, showToast, ToastStyle } from '@raycast/api';
import { useMemo } from 'react';
import ContainerDetail from './container_detail';
import { useDocker } from './docker';
import { containerName, isContainerRunning } from './docker/container';
import ErrorDetail from './error_detail';

export default function ContainerList(props: { projectFilter?: string }) {
  const docker = useMemo(() => new Dockerode(), []);
  const dockerState = useDocker(docker);
  const { useContainers } = dockerState;

  const { containers, isLoading, error, startContainer, restartContainer, stopContainer, removeContainer } =
    useContainers();

  if (error) {
    return <ErrorDetail error={error} />;
  }

  return (
    <List isLoading={isLoading}>
      {filterContainers(containers, props.projectFilter)?.map((containerInfo) => (
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
                    icon={{ source: 'icon-stop.png', tintColor: Color.PrimaryText }}
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
                  icon={{ source: 'icon-start.png', tintColor: Color.PrimaryText }}
                  onAction={async () => {
                    await startContainer(containerInfo);
                    await showToast(ToastStyle.Success, `Container ${containerName(containerInfo)} started`);
                  }}
                />
              )}
              <PushAction
                title="Inspect"
                icon={{ source: Icon.Binoculars }}
                shortcut={{ modifiers: ['cmd'], key: 'i' }}
                target={<ContainerDetail docker={dockerState} containerId={containerInfo.Id} />}
              />
              <ActionPanel.Item
                title="Remove Container"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
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

const filterContainers = (containers: ContainerInfo[] | undefined, projectFilter?: string) => {
  if (projectFilter === undefined || containers === undefined) {
    return containers;
  }
  return containers.filter((container) => container.Labels['com.docker.compose.project'] === projectFilter);
};
