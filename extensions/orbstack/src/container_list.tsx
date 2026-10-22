import { List, ActionPanel, Action, Icon, Keyboard, Color, getPreferenceValues } from "@raycast/api";
import CommandExecute from "./command_execute";
import { composeProjectFromLabels, DockerContainer, DOCKER, dockerArgs, isContainerRunning } from "./docker";
import { useContainerAction, useContainerList } from "./hooks";
import { withToast } from "./ui/toast";
import { getContainerStatusIcon } from "./utils";
import { groupByToArray } from "./utils/group_by";

interface Preferences {
  groupContainersByState: boolean;
}

export default function ContainerList() {
  const { groupContainersByState } = getPreferenceValues<Preferences>();
  const { containers, isLoadingContainerList, revalidateContainerList, applyOptimisticState } = useContainerList();
  const dockerActions = useContainerAction(revalidateContainerList, applyOptimisticState);
  const { isRunningContainerAction } = dockerActions;

  const hasContainers = containers.length > 0;

  if (isLoadingContainerList && !hasContainers) {
    return <List isLoading={true} />;
  }

  return (
    <List isLoading={isLoadingContainerList || isRunningContainerAction}>
      {containers.length === 0 ? (
        <List.EmptyView
          title="No Containers"
          description="No Docker containers found in the OrbStack context."
          icon={{ source: "icon-container.png", tintColor: Color.SecondaryText }}
        />
      ) : groupContainersByState ? (
        groupByToArray(containers, (c) => c.State)
          .reverse()
          .map(([state, stateContainers]) => (
            <List.Section key={state} title={state}>
              {stateContainers.map((container) => (
                <ContainerItem
                  key={container.ID}
                  container={container}
                  dockerActions={dockerActions}
                  revalidate={revalidateContainerList}
                />
              ))}
            </List.Section>
          ))
      ) : (
        containers.map((container) => (
          <ContainerItem
            key={container.ID}
            container={container}
            dockerActions={dockerActions}
            revalidate={revalidateContainerList}
          />
        ))
      )}
    </List>
  );
}

interface ContainerItemProps {
  container: DockerContainer;
  dockerActions: ReturnType<typeof useContainerAction>;
  revalidate: () => void;
}

function ContainerItem({ container, dockerActions, revalidate }: ContainerItemProps) {
  const name = container.Names;
  const project = composeProjectFromLabels(container.Labels);
  const running = isContainerRunning(container.State);
  const { startContainer, stopContainer, restartContainer, removeContainer, stopAndRemoveContainer } = dockerActions;

  const accessories = [...(project ? [{ tag: project }] : []), { text: { value: container.Image } }];

  return (
    <List.Item
      id={container.ID}
      title={name}
      keywords={[container.ID, name, container.Image, project].filter((k): k is string => Boolean(k))}
      icon={getContainerStatusIcon(container.State)}
      accessories={accessories}
      actions={
        <ActionPanel>
          {running ? (
            <Action
              title="Stop Container"
              icon={Icon.Stop}
              shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
              onAction={withToast({
                action: () => stopContainer(container),
                onStart: () => `Stopping container ${name}`,
                onSuccess: () => `Container ${name} stopped`,
                onFailure: (error) => [`Failed to stop ${name}`, error.message],
              })}
            />
          ) : (
            <Action
              title="Start Container"
              icon={Icon.Play}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={withToast({
                action: () => startContainer(container),
                onStart: () => `Starting container ${name}`,
                onSuccess: () => `Container ${name} started`,
                onFailure: (error) => [`Failed to start ${name}`, error.message],
              })}
            />
          )}
          {running && (
            <Action
              title="Restart Container"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["opt"], key: "r" }}
              onAction={withToast({
                action: () => restartContainer(container),
                onStart: () => `Restarting container ${name}`,
                onSuccess: () => `Container ${name} restarted`,
                onFailure: (error) => [`Failed to restart ${name}`, error.message],
              })}
            />
          )}
          <Action.Push
            title="Inspect"
            icon={Icon.Binoculars}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            target={
              <CommandExecute bin={DOCKER} name={name} title="Inspect" command={dockerArgs("inspect", container.ID)} />
            }
          />
          <Action.Push
            title="Logs"
            icon={Icon.Document}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            target={
              <CommandExecute
                bin={DOCKER}
                name={name}
                title="Logs"
                command={dockerArgs("logs", "--tail", "200", container.ID)}
              />
            }
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => {
              revalidate();
            }}
          />
          <Action.CopyToClipboard
            title="Copy Container ID"
            content={container.ID}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard title="Copy Name" content={name} />
          {!running ? (
            <Action
              title="Remove Container"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={withToast({
                action: () => removeContainer(container),
                onStart: () => `Removing container ${name}`,
                onSuccess: () => `Container ${name} removed`,
                onFailure: (error) => [`Failed to remove ${name}`, error.message],
              })}
            />
          ) : (
            <Action
              title="Stop and Remove Container"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={withToast({
                action: () => stopAndRemoveContainer(container),
                onStart: () => `Stopping and removing container ${name}`,
                onSuccess: () => `Container ${name} stopped and removed`,
                onFailure: (error) => [`Failed to remove ${name}`, error.message],
              })}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
