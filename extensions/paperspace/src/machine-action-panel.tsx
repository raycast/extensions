import { Action, ActionPanel, Icon } from "@raycast/api";
import { iconForMachineState, isUsable, Machine } from "./machine";
import { FC } from "react";
import {
  restartMachine,
  startMachine,
  stopMachine,
  toggleMachine,
  usePaperspace,
} from "./use-paperspace";

export const MachineActionPanel: FC<{ machine: Machine }> = ({ machine }) => {
  const users = usePaperspace<{ teamId: string }[]>("GET", "/users/getUsers");

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {isUsable(machine) && machine.state !== "restarting" && (
          <Action
            // eslint-disable-next-line @raycast/prefer-title-case
            title="Toggle Start/Stop"
            icon={Icon.Power}
            onAction={toggleMachine(machine)}
            shortcut={{ modifiers: [], key: "enter" }}
          />
        )}
        {users.data && users.data[0] && (
          <Action.OpenInBrowser
            title="Open in Browser"
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
            url={`https://console.paperspace.com/${users.data[0].teamId}/machines/${machine.id}/details`}
          />
        )}
        {isUsable(machine) && (
          <>
            <Action
              title="Start"
              icon={iconForMachineState.ready}
              onAction={startMachine(machine)}
              shortcut={{ modifiers: ["cmd"], key: "w" }}
            />
            <Action
              title="Stop"
              icon={iconForMachineState.off}
              onAction={stopMachine(machine)}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
            <Action
              title="Restart"
              icon={iconForMachineState.restarting}
              onAction={restartMachine(machine)}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </>
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
};
