import { ContainerInfo } from '@priithaamer/dockerode';
import { ActionPanel, Color, Icon, List, Action, Keyboard, getPreferenceValues } from '@raycast/api';
import ContainerDetail from './container_detail';
import { useDocker } from './docker';
import { containerName, isContainerRunning } from './docker/container';
import { useDockerode } from './docker/dockerode';
import { formatContainerError } from './docker/error';
import ErrorDetail from './error_detail';
import { withToast } from './ui/toast';
import { groupByToArray } from './utils/group_by';

export default function ContainerList(props: { projectFilter?: string }) {
  const docker = useDockerode();
  const dockerState = useDocker(docker);
  const { useContainers } = dockerState;
  const { containers, isLoading, error } = useContainers();
  const { groupContainersByState } = getPreferenceValues();

  if (error) return <ErrorDetail error={error} />;

  const filteredContainers = filterContainers(containers, props.projectFilter);

  return (
    <List isLoading={isLoading}>
      {groupContainersByState
        ? groupByToArray(filteredContainers, (x) => x.State)
            .reverse()
            .map(([state, containers]) => (
              <List.Section key={state} title={state}>
                {containers.map((containerInfo) => (
                  <ContainerItem key={containerInfo.Id} containerInfo={containerInfo} dockerState={dockerState} />
                ))}
              </List.Section>
            ))
        : filteredContainers.map((containerInfo) => (
            <ContainerItem key={containerInfo.Id} containerInfo={containerInfo} dockerState={dockerState} />
          ))}
    </List>
  );
}

interface ContainerItemProps {
  containerInfo: ContainerInfo;
  dockerState: ReturnType<typeof useDocker>;
}

const ContainerItem = ({ containerInfo, dockerState }: ContainerItemProps) => {
  const cName = containerName(containerInfo);
  const { useContainers } = dockerState;
  const { startContainer, restartContainer, stopContainer, removeContainer, stopAndRemoveContainer } = useContainers();

  return (
    <List.Item
      key={containerInfo.Id}
      keywords={[containerInfo.Id, cName, containerInfo.Image]}
      title={cName}
      accessories={[{ text: { value: containerInfo.Image } }]}
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
                onStart: () => `Stopping container ${cName}`,
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
                onStart: () => `Restarting container ${cName}`,
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
                onStart: () => `Starting container ${cName}`,
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
          {!isContainerRunning(containerInfo) && (
            <Action
              title="Remove Container"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={withToast({
                action: () => removeContainer(containerInfo),
                onStart: () => `Removing container ${cName}`,
                onSuccess: () => `Container ${cName} removed`,
                onFailure: (error) => formatContainerError(error, containerInfo),
              })}
            />
          )}
          {isContainerRunning(containerInfo) && (
            <Action
              title="Stop and Remove Container"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={withToast({
                action: () => stopAndRemoveContainer(containerInfo),
                onStart: () => `Stopping and removing container ${cName}`,
                onSuccess: () => `Container ${cName} stopped and removed`,
                onFailure: (error) => formatContainerError(error, containerInfo),
              })}
            />
          )}
        </ActionPanel>
      }
    />
  );
};

const filterContainers = (containers: ContainerInfo[] | undefined, projectFilter?: string) => {
  if (projectFilter === undefined || containers === undefined) return containers ?? [];
  return containers.filter((container) => container.Labels['com.docker.compose.project'] === projectFilter);
};
