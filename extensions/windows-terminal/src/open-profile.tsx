import { Action, ActionPanel, Icon, Keyboard, List, closeMainWindow, getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";

interface Profile {
  guid: string;
  name: string;
  hidden?: boolean;
  source?: string;
  commandline?: string;
}

interface NewTabMenuEntry {
  type: string;
  profile?: string;
  name?: string;
  commandline?: string;
  source?: string;
  entries?: NewTabMenuEntry[];
}

interface WindowsTerminalSettings {
  profiles: {
    list: Profile[];
  };
  newTabMenu?: NewTabMenuEntry[];
}

// Mirrors Windows Terminal's own newTabMenu resolution: walk the tree (folders recurse),
// resolve "profile" entries by guid or name, "matchProfiles" by regex, and expand
// "remainingProfiles" to every profile not already referenced. Order of first reference wins.
function resolveNewTabMenuOrder(profiles: Profile[], newTabMenu: NewTabMenuEntry[]): string[] {
  const used = new Set<string>();
  const order: string[] = [];

  function addGuid(guid: string) {
    if (used.has(guid)) return;
    used.add(guid);
    order.push(guid);
  }

  function walk(entries: NewTabMenuEntry[]) {
    for (const entry of entries) {
      if (entry.type === "profile" && entry.profile) {
        const match = profiles.find((p) => p.guid === entry.profile || p.name === entry.profile);
        if (match) addGuid(match.guid);
      } else if (entry.type === "matchProfiles") {
        const nameRe = entry.name ? new RegExp(entry.name) : null;
        const cmdRe = entry.commandline ? new RegExp(entry.commandline) : null;
        const sourceRe = entry.source ? new RegExp(entry.source) : null;
        profiles.forEach((p) => {
          if (nameRe && !nameRe.test(p.name)) return;
          if (cmdRe && !cmdRe.test(p.commandline ?? "")) return;
          if (sourceRe && !sourceRe.test(p.source ?? "")) return;
          addGuid(p.guid);
        });
      } else if (entry.type === "folder" && entry.entries) {
        walk(entry.entries);
      } else if (entry.type === "remainingProfiles") {
        profiles.forEach((p) => addGuid(p.guid));
      }
    }
  }

  walk(newTabMenu);
  return order;
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

export default function Command() {
  const { openProfilesInQuakeWindow: quake, useNewTabMenu } = getPreferenceValues<Preferences>();

  const newTabMenuOrder =
    useNewTabMenu && PROFILES.newTabMenu ? resolveNewTabMenuOrder(PROFILES.profiles.list, PROFILES.newTabMenu) : null;
  const orderIndex = newTabMenuOrder ? new Map(newTabMenuOrder.map((guid, index) => [guid, index])) : null;

  // When ordering by the New Tab Menu, drop profiles it doesn't reference and sort by
  // first-reference order; otherwise keep the existing settings.json list order.
  function applyOrder(items: Profile[]): Profile[] {
    if (!orderIndex) return items;
    return items
      .filter((item) => orderIndex.has(item.guid))
      .sort((a, b) => orderIndex.get(a.guid)! - orderIndex.get(b.guid)!);
  }

  return (
    <List searchBarPlaceholder="Search all profiles...">
      <List.Section title="Profiles">
        {applyOrder(
          PROFILES.profiles.list.filter(
            (item) =>
              item.hidden !== true &&
              item.source !== "Microsoft.WSL" &&
              item.source !== "Windows.Terminal.Wsl" &&
              item.source !== "Windows.Terminal.SSH",
          ),
        ).map((item) => (
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

      {(() => {
        const remoteServers = applyOrder(
          PROFILES.profiles.list.filter((item) => item.hidden !== true && item.source === "Windows.Terminal.SSH"),
        );
        return remoteServers.length > 0 ? (
          <List.Section title="Remote Servers">
            {remoteServers.map((item) => (
              <List.Item
                key={item.guid}
                icon={Icon.Network}
                title={item.name}
                actions={<Actions name={item.name} quake={quake} />}
              />
            ))}
          </List.Section>
        ) : null;
      })()}

      {(() => {
        const wslProfiles = applyOrder(
          PROFILES.profiles.list.filter(
            (item) =>
              item.hidden !== true && (item.source === "Microsoft.WSL" || item.source === "Windows.Terminal.Wsl"),
          ),
        );
        return wslProfiles.length > 0 ? (
          <List.Section title="Windows Subsystem for Linux">
            {wslProfiles.map((item) => (
              <List.Item
                key={item.guid}
                icon={Icon.HardDrive}
                title={item.name}
                actions={<Actions name={item.name} quake={quake} />}
              />
            ))}
          </List.Section>
        ) : null;
      })()}
    </List>
  );
}
