import { Action, ActionPanel, Icon, Keyboard, List, closeMainWindow, getPreferenceValues } from "@raycast/api";
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

function getWindowsTerminalEnv() {
  const env = { ...process.env };
  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === "path") ?? "Path";
  const systemRoot = env.SystemRoot ?? "C:\\Windows";
  const pathParts = (env[pathKey] ?? "").split(";").filter(Boolean);
  const requiredPathParts = [`${systemRoot}\\System32\\OpenSSH`, `${systemRoot}\\System32`, systemRoot];
  const normalizePathPart = (pathPart: string) => pathPart.toLowerCase().replace(/\\+$/, "");

  env[pathKey] = [
    ...pathParts,
    ...requiredPathParts.filter(
      (requiredPathPart) =>
        !pathParts.some((pathPart) => normalizePathPart(pathPart) === normalizePathPart(requiredPathPart)),
    ),
  ].join(";");

  return env;
}

// Raycast spawns from System32, so profiles without a startingDirectory inherit
// that instead of the user's home. Launch from home so the default is sensible;
// configured startingDirectory values still take precedence.
function getSpawnOptions() {
  return { env: getWindowsTerminalEnv(), cwd: os.homedir() };
}

function Actions(props: { name: string; quake: boolean }) {
  return (
    <ActionPanel title={props.name}>
      <Action
        icon={Icon.PlusSquare}
        title={props.quake ? "Open in Quake Window" : "Open in New Tab"}
        onAction={async () => {
          const args = props.quake ? ["-w", "_quake", "new-tab", "-p", props.name] : ["new-tab", "-p", props.name];
          execFile("wt.exe", args, getSpawnOptions());
          await closeMainWindow();
        }}
      />
      <Action
        icon={Icon.PlusTopRightSquare}
        title="Open in New Window"
        onAction={async () => {
          execFile("wt.exe", ["-p", props.name], getSpawnOptions());
          await closeMainWindow();
        }}
      />
      <Action
        icon={Icon.Shield}
        title={props.quake ? "Open as Administrator (Quake)" : "Open as Administrator"}
        shortcut={{ modifiers: ["ctrl", "shift"], key: "enter" }}
        onAction={async () => {
          // Quote the profile name so names containing spaces (e.g. "Command Prompt") survive
          // Start-Process -Verb RunAs, which joins ArgumentList tokens with spaces and does not
          // re-quote them before invoking ShellExecute.
          const escapedName = props.name.replace(/'/g, "''");
          const argumentList = props.quake ? `'-w _quake new-tab -p "${escapedName}"'` : `'-p "${escapedName}"'`;
          // Elevation resets the CWD to System32, so pin the elevated wt.exe to home.
          // Profiles with their own startingDirectory still win.
          const workingDirectory = `'${os.homedir().replace(/'/g, "''")}'`;
          execFile("powershell", [
            "Start-Process",
            "wt.exe",
            "-ArgumentList",
            argumentList,
            "-WorkingDirectory",
            workingDirectory,
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
  const { openProfilesInQuakeWindow: quake } = getPreferenceValues<Preferences>();
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
              actions={<Actions name={item.name} quake={quake} />}
            />
          ))}
      </List.Section>

      {PROFILES.profiles.list.some((item) => item.source === "Windows.Terminal.SSH") ? (
        <List.Section title="Remote Servers">
          {PROFILES.profiles.list
            .filter((item) => item.hidden !== true && item.source === "Windows.Terminal.SSH")
            .map((item) => (
              <List.Item
                key={item.guid}
                icon={Icon.Network}
                title={item.name}
                actions={<Actions name={item.name} quake={quake} />}
              />
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
                actions={<Actions name={item.name} quake={quake} />}
              />
            ))}
        </List.Section>
      ) : null}
    </List>
  );
}
