import { ActionPanel, Action, Icon, List, closeMainWindow, Keyboard } from "@raycast/api";
import fs from "node:fs";
import os from "node:os";
import { execFile } from "node:child_process";

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

export default function Command() {
  return (
    <List searchBarPlaceholder="Search all profiles...">
      {PROFILES.profiles.list
        .filter((item) => item.hidden !== true && item.source !== "Microsoft.WSL")
        .map((item) => (
          <List.Item
            key={item.guid}
            icon={Icon.Terminal}
            title={item.name}
            keywords={
              item.guid === "{61c54bbd-c2c6-5271-96e7-009a87ff44bf}"
                ? ["pwsh"]
                : item.guid === "{0caa0dad-35be-5f56-a8ff-afceeeaa6101}"
                  ? ["cmd"]
                  : []
            }
            actions={
              <ActionPanel title={item.name}>
                <Action
                  icon={Icon.PlusSquare}
                  title="Open in New Tab"
                  onAction={async () => {
                    await closeMainWindow();
                    execFile("wt.exe", ["new-tab", "-p", item.name]);
                  }}
                />
                <Action
                  icon={Icon.PlusTopRightSquare}
                  title="Open in New Window"
                  onAction={async () => {
                    await closeMainWindow();
                    execFile("wt.exe", ["-p", item.name]);
                  }}
                />
                <Action
                  icon={Icon.Shield}
                  title="Open as Administrator"
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "enter" }}
                  onAction={async () => {
                    await closeMainWindow();
                    execFile("powershell", [
                      "Start-Process",
                      "wt.exe",
                      "-ArgumentList",
                      `"-p","${item.name}"`,
                      "-Verb",
                      "RunAs",
                    ]);
                  }}
                />
                <ActionPanel.Section>
                  <Action.Open
                    icon={Icon.Code}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    // settings.json is the case-sensitive name of the settings
                    // file for windows terminal. we do not need this.
                    // eslint-disable-next-line
                    title="Open settings.json"
                    target={`C:\\Users\\${os.userInfo().username}\\AppData\\Local\\Packages\\Microsoft.WindowsTerminal_8wekyb3d8bbwe\\LocalState\\settings.json`}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}

      {PROFILES.profiles.list.some((item) => item.source === "Microsoft.WSL") ? (
        <List.Section title="Windows Subsystem for Linux">
          {PROFILES.profiles.list
            .filter((item) => item.hidden !== true && item.source === "Microsoft.WSL")
            .map((item) => (
              <List.Item
                key={item.guid}
                icon={Icon.HardDrive}
                title={item.name}
                actions={
                  <ActionPanel title={item.name}>
                    <Action
                      icon={Icon.PlusSquare}
                      title="Open in New Tab"
                      onAction={async () => {
                        await closeMainWindow();
                        execFile("wt.exe", ["new-tab", "-p", item.name]);
                      }}
                    />
                    <Action
                      icon={Icon.PlusTopRightSquare}
                      title="Open in New Window"
                      onAction={async () => {
                        await closeMainWindow();
                        execFile("wt.exe", ["-p", item.name]);
                      }}
                    />
                    <Action
                      icon={Icon.Shield}
                      title="Open as Administrator"
                      shortcut={{ modifiers: ["ctrl", "shift"], key: "enter" }}
                      onAction={async () => {
                        await closeMainWindow();
                        execFile("powershell", [
                          "Start-Process",
                          "wt.exe",
                          "-ArgumentList",
                          "'",
                          "-p",
                          item.name,
                          "'",
                          "-Verb",
                          "RunAs",
                        ]);
                      }}
                    />
                    <ActionPanel.Section>
                      <Action.Open
                        icon={Icon.Code}
                        shortcut={Keyboard.Shortcut.Common.Edit}
                        // settings.json is the case-sensitive name of the settings
                        // file for windows terminal. we do not need this.
                        // eslint-disable-next-line
                        title="Open settings.json"
                        target={`C:\\Users\\${os.userInfo().username}\\AppData\\Local\\Packages\\Microsoft.WindowsTerminal_8wekyb3d8bbwe\\LocalState\\settings.json`}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ) : (
        ""
      )}
    </List>
  );
}
