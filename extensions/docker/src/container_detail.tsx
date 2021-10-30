import { ActionPanel, Color, Detail, Icon, showToast, ToastStyle, useNavigation } from '@raycast/api';
import { DockerState } from './docker';
import { containerInspectName, formatContainerDetailMarkdown } from './docker/container';

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
            <>
              <ActionPanel.Item
                title="Stop Container"
                shortcut={{ modifiers: ['cmd', 'shift'], key: 'w' }}
                onAction={async () => {
                  await stopContainer(containerInfo);
                  await showToast(ToastStyle.Success, `Container ${containerInspectName(containerInfo)} stopped`);
                }}
              />
              <ActionPanel.Item
                title="Restart Container"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ['opt'], key: 'r' }}
                onAction={async () => {
                  await restartContainer(containerInfo);
                  await showToast(ToastStyle.Success, `Container ${containerInspectName(containerInfo)} restarted`);
                }}
              />
            </>
          )}
          {containerInfo?.State.Running === false && (
            <ActionPanel.Item
              title="Start Container"
              shortcut={{ modifiers: ['cmd', 'shift'], key: 'r' }}
              onAction={async () => {
                await startContainer(containerInfo);
                await showToast(ToastStyle.Success, `Container ${containerInspectName(containerInfo)} started`);
              }}
            />
          )}

          {containerInfo !== undefined && (
            <ActionPanel.Item
              title="Remove Container"
              icon={{ source: Icon.Trash, tintColor: Color.Red }}
              shortcut={{ modifiers: ['cmd', 'shift'], key: 'x' }}
              onAction={async () => {
                await removeContainer(containerInfo);
                await showToast(ToastStyle.Success, `Container ${containerInspectName(containerInfo)} removed`);
                pop();
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
