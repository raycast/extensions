import { Action, ActionPanel, Icon, List, closeMainWindow, showHUD } from "@raycast/api";

import { getDeviceIcon } from "./utils";
import { Command, Device, DeviceType, Platform } from "./types";
import { executeCommand, launchDevice } from "./actions";

interface Props {
  name: string;
  commands: Command[];
  devices?: Device[];
}

const DeviceList = ({ commands, devices, name }: Props) => {
  return (
    <List.Section title={name}>
      {devices?.map(({ name, identifier, booted, displayName, type, platform }) => (
        <List.Item
          key={identifier || name}
          title={displayName}
          icon={getDeviceIcon(name)}
          accessories={[
            {
              text: booted ? "Booted" : "",
              icon: booted ? Icon.Checkmark : undefined,
            },
          ]}
          actions={
            <ActionPanel>
              {type === DeviceType.virtual ? (
                <Action
                  title={`Launch ${platform == Platform.android ? "Emulator" : "Simulator"}`}
                  onAction={() => {
                    launchDevice(name);
                    closeMainWindow();
                  }}
                />
              ) : null}
              {commands.map((command) => {
                if (command.needBootedDevice && !booted) return null;
                if (command?.bootsDevice && booted) return null;
                return (
                  <Action
                    key={command.id}
                    title={command.name}
                    onAction={() => {
                      executeCommand(command, name, identifier ?? "", type);
                      showHUD(`${command.name} ✅`);
                      closeMainWindow();
                    }}
                  />
                );
              })}
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
};

export default DeviceList;
