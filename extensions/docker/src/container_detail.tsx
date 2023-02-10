import { Action, ActionPanel, Color, Detail, Icon, useNavigation } from '@raycast/api';
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
      metadata={
        containerInfo && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Image" text={containerInfo?.Config.Image} />
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                text={containerInfo.State.Status}
                color={containerInfo.State.Running ? Color.Green : Color.Yellow}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.TagList title="Command">
              <Detail.Metadata.TagList.Item text={containerInfo.Config.Cmd?.join(' ')} />
            </Detail.Metadata.TagList>
            {containerInfo.Config.ExposedPorts && (
              <Detail.Metadata.TagList title="Ports">
                {Object.keys(containerInfo.Config.ExposedPorts).map((p) => (
                  <Detail.Metadata.TagList.Item text={p} color={Color.PrimaryText} />
                ))}
              </Detail.Metadata.TagList>
            )}
            <Detail.Metadata.Separator />
            {containerInfo.Created && (
              <Detail.Metadata.Label title="Created at" text={new Date(containerInfo.Created).toLocaleString()} />
            )}
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          {containerInfo?.State.Running === true && (
            <Action
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
            <Action
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
            <Action
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
            <Action
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
