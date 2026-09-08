import { Action, ActionPanel, Icon, Keyboard, List, closeMainWindow, getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import { NewTabMenuEntry, Profile, resolveNewTabMenuOrder } from "./new-tab-menu";

interface WindowsTerminalSettings {
  profiles: {
    list: Profile[];
  };
  newTabMenu?: NewTabMenuEntry[];
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

function launchElevated(name: string) {
  // Start-Process -Verb RunAs joins ArgumentList tokens with spaces and does not re-quote them
  // before invoking ShellExecute, so the profile name has to arrive pre-quoted. Single quotes in
  // the name would end our PowerShell single-quoted string; double quotes in the name would end
  // the inner "..." wt.exe sees. Escape both.
  const escapedName = name.replace(/'/g, "''").replace(/"/g, '\\"');
  const argumentList = `'-p "${escapedName}"'`;
  // Elevation resets the CWD to System32, so pin the elevated wt.exe to home.
  // Profiles with their own startingDirectory still win.
  const workingDirectory = `'${os.homedir().replace(/'/g, "''")}'`;
  execFile("powershell", [
    "-NoProfile",
    "-Command",
    "Start-Process",
    "wt.exe",
    "-ArgumentList",
    argumentList,
    "-WorkingDirectory",
    workingDirectory,
    "-Verb",
    "RunAs",
  ]);
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
        title="Open as Administrator"
        shortcut={{ modifiers: ["ctrl", "shift"], key: "enter" }}
        onAction={async () => {
          // Always launch elevated in a normal window. Elevated quake windows don't respond to
          // Windows Terminal's global quake shortcut (Win+`), so once the admin drop-down loses
          // focus there's no way to summon it back — a regular window avoids that trap.
          launchElevated(props.name);
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

function isSsh(item: Profile) {
  return item.source === "Windows.Terminal.SSH";
}

function isWsl(item: Profile) {
  return item.source === "Microsoft.WSL" || item.source === "Windows.Terminal.Wsl";
}

function getIcon(item: Profile) {
  if (item.guid === "{b453ae62-4e3d-5e58-b989-0a998ec441b8}") return Icon.Cloud; // Azure Cloud Shell
  if (isSsh(item)) return Icon.Network;
  if (isWsl(item)) return Icon.HardDrive;
  return Icon.Terminal;
}

function getKeywords(item: Profile) {
  if (
    item.guid === "{61c54bbd-c2c6-5271-96e7-009a87ff44bf}" || // Windows PowerShell 1.0 (comes with Windows)
    item.guid === "{574e775e-4f2a-5b96-ac1e-a2962a402336}" // Windows Powershell 7.0+
  ) {
    return ["pwsh"];
  }
  if (item.guid === "{0caa0dad-35be-5f56-a8ff-afceeeaa6101}") return ["cmd"];
  return [];
}

function ProfileItem(props: { item: Profile; quake: boolean }) {
  return (
    <List.Item
      key={props.item.guid}
      icon={getIcon(props.item)}
      title={props.item.name}
      keywords={getKeywords(props.item)}
      actions={<Actions name={props.item.name} quake={props.quake} />}
    />
  );
}

export default function Command() {
  const { openProfilesInQuakeWindow: quake, useNewTabMenu } = getPreferenceValues<Preferences>();

  const newTabMenuOrder =
    useNewTabMenu && PROFILES.newTabMenu ? resolveNewTabMenuOrder(PROFILES.profiles.list, PROFILES.newTabMenu) : null;

  // The New Tab Menu can interleave regular, SSH, and WSL profiles, so honoring its order means
  // one flat list instead of the three fixed, independently-ordered sections below.
  if (newTabMenuOrder) {
    const orderIndex = new Map(newTabMenuOrder.map((guid, index) => [guid, index]));
    const items = PROFILES.profiles.list
      .filter((item) => item.hidden !== true && orderIndex.has(item.guid))
      .sort((a, b) => orderIndex.get(a.guid)! - orderIndex.get(b.guid)!);

    return (
      <List searchBarPlaceholder="Search all profiles...">
        <List.Section title="Profiles">
          {items.map((item) => (
            <ProfileItem key={item.guid} item={item} quake={quake} />
          ))}
        </List.Section>
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Search all profiles...">
      <List.Section title="Profiles">
        {PROFILES.profiles.list
          .filter((item) => item.hidden !== true && !isSsh(item) && !isWsl(item))
          .map((item) => (
            <ProfileItem key={item.guid} item={item} quake={quake} />
          ))}
      </List.Section>

      {PROFILES.profiles.list.some((item) => isSsh(item)) ? (
        <List.Section title="Remote Servers">
          {PROFILES.profiles.list
            .filter((item) => item.hidden !== true && isSsh(item))
            .map((item) => (
              <ProfileItem key={item.guid} item={item} quake={quake} />
            ))}
        </List.Section>
      ) : null}

      {PROFILES.profiles.list.some((item) => isWsl(item)) ? (
        <List.Section title="Windows Subsystem for Linux">
          {PROFILES.profiles.list
            .filter((item) => item.hidden !== true && isWsl(item))
            .map((item) => (
              <ProfileItem key={item.guid} item={item} quake={quake} />
            ))}
        </List.Section>
      ) : null}
    </List>
  );
}
