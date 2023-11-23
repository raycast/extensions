import { Action, ActionPanel, Icon, List, closeMainWindow, showHUD } from "@raycast/api";
import { Command, Device, Platform } from "./types";
import { getDeviceIcon } from "./utils";
import { executeCommand, launchDevice } from "./actions";
interface Props {
  name: string;
  platform: Platform;
  commands: Command[];
  devices?: Device[];
}

const DeviceList = ({ commands, devices, name, platform }: Props) => {
  return (
    <List.Section title={name}>
      {devices?.map(({ name, ID, booted, displayName }) => (
        <List.Item
          key={ID || name}
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
              <Action
                title={`Launch ${platform == Platform.android ? "Emulator" : "Simulator"}`}
                onAction={() => {
                  launchDevice(name);
                  closeMainWindow();
                }}
              />
              {commands.map((command) => {
                if (command.needBootedDevice && !booted) return null;
                if (command?.bootsDevice && booted) return null;
                return (
                  <Action
                    key={command.id}
                    title={command.name}
                    onAction={() => {
                      executeCommand(command, name, ID ?? "");
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
