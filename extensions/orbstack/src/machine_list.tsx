import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useState } from "react";
import { getStatusIcon } from "./utils";
import CommandExecute from "./command_execute";
import MachineCreate from "./machine_create";
import MachineClone from "./machine_clone";
import MachineRename from "./machine_rename";
import { useMachineList, useMachineStateTransition, useMachineInfo, useMachineToggleAll } from "./hooks";

export default function MachineList() {
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const { machines, isLoadingMachineList, revalidateMachineList } = useMachineList();
  const { startTransition, isTransitioningState } = useMachineStateTransition(revalidateMachineList);
  const { machineInfo, isLoadingMachineInfo } = useMachineInfo(selectedMachine);
  const { startAll, stopAll, isTogglingAll } = useMachineToggleAll(revalidateMachineList);

  if (isLoadingMachineList) {
    return <List isLoading={true}></List>;
  }

  return (
    <List
      isLoading={isTransitioningState || isLoadingMachineInfo || isTogglingAll}
      isShowingDetail={machineInfo !== null}
      onSelectionChange={(name) => {
        setSelectedMachine(name);
      }}
    >
      {machines.map((machine) => (
        <List.Item
          key={machine.id}
          id={machine.name}
          title={machine.name}
          icon={getStatusIcon(machine.state)}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  {machineInfo && selectedMachine === machine.name ? (
                    <>
                      <List.Item.Detail.Metadata.Label
                        title="State"
                        text={machineInfo.record.state}
                        icon={Icon.Power}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Distro"
                        text={machineInfo.record.image.distro}
                        icon={Icon.Box}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Version"
                        text={machineInfo.record.image.version}
                        icon={Icon.Tag}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Architecture"
                        text={machineInfo.record.image.arch}
                        icon={Icon.ComputerChip}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Default Username"
                        text={machineInfo.record.config.default_username}
                        icon={Icon.Person}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Isolated"
                        text={machineInfo.record.config.isolated ? "Yes" : "No"}
                        icon={Icon.Lock}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Disk Size"
                        text={`${(machineInfo.disk_size / 1000 / 1000).toFixed(1)} MB`}
                        icon={Icon.HardDrive}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Built-in"
                        text={machineInfo.record.builtin ? "Yes" : "No"}
                        icon={Icon.Star}
                      />
                    </>
                  ) : (
                    <List.Item.Detail.Metadata.Label title="Select a machine" text="Choose a machine to view details" />
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              {machine.state === "running" ? (
                <Action
                  title="Stop"
                  onAction={() => {
                    startTransition(machine, "stopped");
                  }}
                />
              ) : (
                <Action
                  title="Start"
                  onAction={() => {
                    startTransition(machine, "running");
                  }}
                />
              )}
              <Action.Open
                title="SSH"
                target={`ssh://${machine.config.default_username}@${machine.name}@orb`}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action
                title="Refresh"
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => {
                  revalidateMachineList();
                }}
              />
              <Action.Push
                title="Info"
                target={<CommandExecute name={machine.name} title={"Info"} command={["info", machine.name]} />}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
              />
              <Action.Push
                title="OrbStack Config"
                target={<CommandExecute name={`OrbStack`} title={"Config"} command={["config", "show"]} />}
                shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
              />
              <Action.Push
                title="Logs"
                target={<CommandExecute name={machine.name} title={"Logs"} command={["logs", machine.name]} />}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
              />
              <Action.Push
                title="Create"
                target={<MachineCreate refresh={revalidateMachineList} />}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action.Push
                title="Clone"
                target={<MachineClone oldName={machine.name} refresh={revalidateMachineList} />}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.Push
                title="Rename"
                target={<MachineRename oldName={machine.name} refresh={revalidateMachineList} />}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              />
              <Action.Push
                title="Delete"
                target={
                  <CommandExecute
                    name={machine.name}
                    title={"Delete Machine"}
                    command={["delete", "-f", machine.name]}
                    markdown={`WARNING: This will PERMANENTLY DELETE ALL DATA in the following machines:\n\n>\`${machine.name}\`\n\nYou cannot undo this action.`}
                    requireConfirmation={true}
                    refresh={revalidateMachineList}
                  />
                }
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              />
              <Action
                title="Start All Machines"
                onAction={startAll}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              />
              <Action
                title="Stop All Machines"
                onAction={stopAll}
                shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
