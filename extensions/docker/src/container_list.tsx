import { ContainerInfo } from '@priithaamer/dockerode';
import { ActionPanel, Color, Icon, List, Action, Keyboard } from '@raycast/api';
import ContainerDetail from './container_detail';
import { useDocker } from './docker';
import { containerName, isContainerRunning } from './docker/container';
import { useDockerode } from './docker/dockerode';
import { formatContainerError } from './docker/error';
import ErrorDetail from './error_detail';
import { withToast } from './ui/toast';

export default function ContainerList(props: { projectFilter?: string }) {
  const docker = useDockerode();
  const dockerState = useDocker(docker);
  const { useContainers } = dockerState;

  const { containers, isLoading, error, startContainer, restartContainer, stopContainer, removeContainer } =
    useContainers();

  if (error) {
    return <ErrorDetail error={error} />;
  }

  return (
    <List isLoading={isLoading}>
      {filterContainers(containers, props.projectFilter)?.map((containerInfo) => {
        const cName = containerName(containerInfo);
        return (
          <List.Item
            keywords={[containerInfo.Id, cName, containerInfo.Image]}
            key={containerInfo.Id}
            title={cName}
            subtitle={containerInfo.Image}
            accessories={[{ text: { value: containerInfo.State } }]}
            icon={
              isContainerRunning(containerInfo)
                ? { source: 'icon-container-running.png', tintColor: Color.Green }
                : { source: 'icon-container.png', tintColor: Color.SecondaryText }
            }
            actions={
              <ActionPanel>
                {isContainerRunning(containerInfo) && (
                  <Action
                    title="Stop Container"
                    shortcut={{ modifiers: ['cmd', 'shift'], key: 'w' }}
                    icon={{ source: 'icon-stop.png', tintColor: Color.PrimaryText }}
                    onAction={withToast({
                      action: () => stopContainer(containerInfo),
                      onSuccess: () => `Container ${cName} stopped`,
                      onFailure: (error) => formatContainerError(error, containerInfo),
                    })}
                  />
                )}
                {isContainerRunning(containerInfo) && (
                  <Action
                    title="Restart Container"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ['opt'], key: 'r' }}
                    onAction={withToast({
                      action: () => restartContainer(containerInfo),
                      onSuccess: () => `Container ${cName} restarted`,
                      onFailure: (error) => formatContainerError(error, containerInfo),
                    })}
                  />
                )}
                {isContainerRunning(containerInfo) && (
                  <Action.CopyToClipboard
                    title="Copy Container Id"
                    shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
                    content={containerInfo.Id}
                  />
                )}
                {!isContainerRunning(containerInfo) && (
                  <Action
                    title="Start Container"
                    shortcut={{ modifiers: ['cmd', 'shift'], key: 'r' }}
                    icon={{ source: 'icon-start.png', tintColor: Color.PrimaryText }}
                    onAction={withToast({
                      action: () => startContainer(containerInfo),
                      onSuccess: () => `Container ${cName} started`,
                      onFailure: (error) => formatContainerError(error, containerInfo),
                    })}
                  />
                )}
                <Action.Push
                  title="Inspect"
                  icon={{ source: Icon.Binoculars }}
                  shortcut={{ modifiers: ['cmd'], key: 'i' }}
                  target={<ContainerDetail docker={dockerState} containerId={containerInfo.Id} />}
                />
                <Action
                  title="Remove Container"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={withToast({
                    action: () => removeContainer(containerInfo),
                    onSuccess: () => `Container ${cName} removed`,
                    onFailure: (error) => formatContainerError(error, containerInfo),
                  })}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

const filterContainers = (containers: ContainerInfo[] | undefined, projectFilter?: string) => {
  if (projectFilter === undefined || containers === undefined) {
    return containers;
  }
  return containers.filter((container) => container.Labels['com.docker.compose.project'] === projectFilter);
};
