import { ActionPanel, Color, Detail, Icon, useNavigation } from '@raycast/api';
import { DockerState } from './docker';
import { containerName, formatContainerDetailMarkdown } from './docker/container';
import { formatContainerError } from './docker/error';
import { withToast } from './ui/toast';

export default function ContainerDetail({ docker, containerId }: { docker: DockerState; containerId: string }) {
  const { isLoading, containerInfo, startContainer, restartContainer, stopContainer, removeContainer } =
    docker.useContainerInfo(containerId);
  const { pop } = useNavigation();

  return (
    <Detail
      isLoading={isLoading}
      markdown={formatContainerDetailMarkdown(containerInfo)}
      actions={
        <ActionPanel>
          {containerInfo?.State.Running === true && (
            <ActionPanel.Item
              title="Stop Container"
              shortcut={{ modifiers: ['cmd', 'shift'], key: 'w' }}
              onAction={withToast({
                action: () => stopContainer(containerInfo),
                onSuccess: () => `Container ${containerName(containerInfo)} stopped`,
                onFailure: (error) => formatContainerError(error, containerInfo),
              })}
            />
          )}
          {containerInfo?.State.Running === true && (
            <ActionPanel.Item
              title="Restart Container"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ['opt'], key: 'r' }}
              onAction={withToast({
                action: () => restartContainer(containerInfo),
                onSuccess: () => `Container ${containerName(containerInfo)} restarted`,
                onFailure: (error) => formatContainerError(error, containerInfo),
              })}
            />
          )}
          {containerInfo?.State.Running === false && (
            <ActionPanel.Item
              title="Start Container"
              shortcut={{ modifiers: ['cmd', 'shift'], key: 'r' }}
              onAction={withToast({
                action: () => startContainer(containerInfo),
                onSuccess: () => `Container ${containerName(containerInfo)} started`,
                onFailure: (error) => formatContainerError(error, containerInfo),
              })}
            />
          )}

          {containerInfo !== undefined && (
            <ActionPanel.Item
              title="Remove Container"
              icon={{ source: Icon.Trash, tintColor: Color.Red }}
              shortcut={{ modifiers: ['cmd', 'shift'], key: 'x' }}
              onAction={withToast({
                action: async () => {
                  await removeContainer(containerInfo);
                  pop();
                },
                onSuccess: () => `Container ${containerName(containerInfo)} removed`,
                onFailure: (error) => formatContainerError(error, containerInfo),
              })}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
