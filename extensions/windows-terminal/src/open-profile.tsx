import { Action, ActionPanel, Icon, Keyboard, List, closeMainWindow } from "@raycast/api";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";

interface Profile {
  guid: string;
  name: string;
  hidden?: boolean;
  source?: string;
}

interface WindowsTerminalSettings {
  profiles: {
    list: Profile[];
  };
}

const PROFILES = JSON.parse(
  fs.readFileSync(
    `C:\\Users\\${os.userInfo().username}\\AppData\\Local\\Packages\\Microsoft.WindowsTerminal_8wekyb3d8bbwe\\LocalState\\settings.json`,
    "utf8",
  ),
) as WindowsTerminalSettings;

function Actions(props: { name: string }) {
  return (
    <ActionPanel title={props.name}>
      <Action
        icon={Icon.PlusSquare}
        title="Open in New Tab"
        onAction={async () => {
          execFile("wt.exe", ["new-tab", "-p", props.name]);
          await closeMainWindow();
        }}
      />
      <Action
        icon={Icon.PlusTopRightSquare}
        title="Open in New Window"
        onAction={async () => {
          execFile("wt.exe", ["-p", props.name]);
          await closeMainWindow();
        }}
      />
      <Action
        icon={Icon.Shield}
        title="Open as Administrator"
        shortcut={{ modifiers: ["ctrl", "shift"], key: "enter" }}
        onAction={async () => {
          execFile("powershell", [
            "Start-Process",
            "wt.exe",
            "-ArgumentList",
            `"-p","${props.name}"`,
            "-Verb",
            "RunAs",
          ]);
          await closeMainWindow();
        }}
      />
      <ActionPanel.Section>
        <Action.Open
          icon={Icon.Code}
          shortcut={Keyboard.Shortcut.Common.Edit}
          title="Open settings.json"
          target={`C:\\Users\\${os.userInfo().username}\\AppData\\Local\\Packages\\Microsoft.WindowsTerminal_8wekyb3d8bbwe\\LocalState\\settings.json`}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default function Command() {
  return (
    <List searchBarPlaceholder="Search all profiles...">
      <List.Section title="Profiles">
        {PROFILES.profiles.list
          .filter(
            (item) =>
              item.hidden !== true &&
              item.source !== "Microsoft.WSL" &&
              item.source !== "Windows.Terminal.Wsl" &&
              item.source !== "Windows.Terminal.SSH",
          )
          .map((item) => (
            <List.Item
              key={item.guid}
              icon={
                item.guid === "{b453ae62-4e3d-5e58-b989-0a998ec441b8}" // Azure Cloud Shell
                  ? Icon.Cloud
                  : Icon.Terminal
              }
              title={item.name}
              keywords={
                item.guid === "{61c54bbd-c2c6-5271-96e7-009a87ff44bf}" || // Windows PowerShell 1.0 (comes with Windows)
                item.guid === "{574e775e-4f2a-5b96-ac1e-a2962a402336}" // Windows Powershell 7.0+
                  ? ["pwsh"]
                  : item.guid === "{0caa0dad-35be-5f56-a8ff-afceeeaa6101}"
                    ? ["cmd"]
                    : []
              }
              actions={<Actions name={item.name} />}
            />
          ))}
      </List.Section>

      {PROFILES.profiles.list.some((item) => item.source === "Windows.Terminal.SSH") ? (
        <List.Section title="Remote Servers">
          {PROFILES.profiles.list
            .filter((item) => item.hidden !== true && item.source === "Windows.Terminal.SSH")
            .map((item) => (
              <List.Item key={item.guid} icon={Icon.Network} title={item.name} actions={<Actions name={item.name} />} />
            ))}
        </List.Section>
      ) : null}

      {PROFILES.profiles.list.some(
        (item) => item.source === "Microsoft.WSL" || item.source === "Windows.Terminal.Wsl",
      ) ? (
        <List.Section title="Windows Subsystem for Linux">
          {PROFILES.profiles.list
            .filter(
              (item) =>
                item.hidden !== true && (item.source === "Microsoft.WSL" || item.source === "Windows.Terminal.Wsl"),
            )
            .map((item) => (
              <List.Item
                key={item.guid}
                icon={Icon.HardDrive}
                title={item.name}
                actions={<Actions name={item.name} />}
              />
            ))}
        </List.Section>
      ) : null}
    </List>
  );
}
