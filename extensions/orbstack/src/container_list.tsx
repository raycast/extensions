import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { getStatusIcon } from "./utils";
import CommandExecute from "./command_execute";
import { useContainerList, useContainerAction } from "./hooks";
import { DOCKER } from "./orbstack";

function containerStatusIcon(state: string) {
  if (state === "running" || state === "paused") {
    return getStatusIcon(state);
  }
  return getStatusIcon("stopped");
}

export default function ContainerList() {
  const { sections, isLoadingContainerList, revalidateContainerList } = useContainerList();
  const { runAction, isRunningAction } = useContainerAction(revalidateContainerList);

  if (isLoadingContainerList) {
    return <List isLoading={true}></List>;
  }

  return (
    <List isLoading={isRunningAction} isShowingDetail={true}>
      {sections.map((section) => (
        <List.Section
          key={section.title}
          title={section.title}
          subtitle={section.runningCount > 0 ? `${section.runningCount} running` : "stopped"}
        >
          {section.containers.map((container) => (
            <List.Item
              key={container.ID}
              id={container.Names}
              title={container.Service || container.Names}
              subtitle={container.Image}
              icon={containerStatusIcon(container.State)}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="State" text={container.State} icon={Icon.Power} />
                      <List.Item.Detail.Metadata.Label title="Status" text={container.Status} icon={Icon.Info} />
                      <List.Item.Detail.Metadata.Label
                        title="Stack"
                        text={container.Project || "—"}
                        icon={Icon.Layers}
                      />
                      <List.Item.Detail.Metadata.Label title="Name" text={container.Names} icon={Icon.Text} />
                      <List.Item.Detail.Metadata.Label title="Image" text={container.Image} icon={Icon.Box} />
                      <List.Item.Detail.Metadata.Label title="Command" text={container.Command} icon={Icon.Terminal} />
                      <List.Item.Detail.Metadata.Label
                        title="Ports"
                        text={container.Ports || "None"}
                        icon={Icon.Network}
                      />
                      <List.Item.Detail.Metadata.Label title="ID" text={container.ID} icon={Icon.Hashtag} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  {container.State === "running" ? (
                    <>
                      <Action
                        title="Stop"
                        icon={Icon.Stop}
                        onAction={() => {
                          runAction("stop", container.Names);
                        }}
                      />
                      <Action
                        title="Restart"
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "t" }}
                        onAction={() => {
                          runAction("restart", container.Names);
                        }}
                      />
                    </>
                  ) : (
                    <Action
                      title="Start"
                      icon={Icon.Play}
                      onAction={() => {
                        runAction("start", container.Names);
                      }}
                    />
                  )}
                  <Action.Push
                    title="Logs"
                    icon={Icon.Text}
                    target={
                      <CommandExecute
                        name={container.Names}
                        title="Logs"
                        bin={DOCKER}
                        command={["container", "logs", "--tail", "200", container.Names]}
                      />
                    }
                    shortcut={{ modifiers: ["cmd"], key: "l" }}
                  />
                  <Action.Push
                    title="Inspect"
                    icon={Icon.MagnifyingGlass}
                    target={
                      <CommandExecute
                        name={container.Names}
                        title="Inspect"
                        bin={DOCKER}
                        command={["container", "inspect", container.Names]}
                      />
                    }
                    shortcut={{ modifiers: ["cmd"], key: "i" }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => {
                      revalidateContainerList();
                    }}
                  />
                  <Action.Push
                    title="Remove"
                    icon={Icon.Trash}
                    target={
                      <CommandExecute
                        name={container.Names}
                        title="Remove Container"
                        bin={DOCKER}
                        command={["container", "rm", "-f", container.Names]}
                        markdown={`WARNING: This will PERMANENTLY REMOVE the following container:\n\n>\`${container.Names}\`\n\nYou cannot undo this action.`}
                        requireConfirmation={true}
                        refresh={revalidateContainerList}
                      />
                    }
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
