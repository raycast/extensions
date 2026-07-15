import { Application, Cache, Clipboard, Toast, open, showToast } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { buildResumeCommand, shellQuote } from "./commands";
import { getInteractivePermissionProfileId, getInteractiveSnapshot } from "./interactive";
import { isChatSessionCurrentlyActive } from "./sessions";
import { buildExternalSharedShellCommand, hasSharedSession } from "./shared-session";
import { ChatSession } from "./types";

type TerminalKind =
  | "terminal"
  | "iterm"
  | "warp"
  | "zed"
  | "vscode"
  | "cursor"
  | "windsurf"
  | "ghostty"
  | "wezterm"
  | "kitty"
  | "alacritty"
  | "other";

export type SupportedTerminalApplicationId =
  | "terminal"
  | "iterm"
  | "warp"
  | "zed"
  | "vscode"
  | "cursor"
  | "windsurf"
  | "ghostty"
  | "wezterm"
  | "kitty"
  | "alacritty";

interface SupportedTerminalApplication {
  id: SupportedTerminalApplicationId;
  name: string;
  bundleId: string;
  paths: string[];
  aliases: string[];
}

interface StoredTerminalSelection {
  selectedId: SupportedTerminalApplicationId;
}

type TerminalLaunchResult = "executed" | "opened" | false;

const terminalSelectionCache = new Cache({ namespace: "promptcast-preferences" });
const terminalSelectionCacheKey = "preferred-terminal-v1";
const supportedTerminalCatalog: SupportedTerminalApplication[] = [
  {
    id: "terminal",
    name: "Terminal",
    bundleId: "com.apple.Terminal",
    paths: ["/System/Applications/Utilities/Terminal.app"],
    aliases: ["terminal.app"],
  },
  {
    id: "iterm",
    name: "iTerm",
    bundleId: "com.googlecode.iterm2",
    paths: ["/Applications/iTerm.app", "/Applications/iTerm2.app"],
    aliases: ["iterm", "iterm2"],
  },
  {
    id: "warp",
    name: "Warp",
    bundleId: "dev.warp.Warp-Stable",
    paths: ["/Applications/Warp.app"],
    aliases: ["warp"],
  },
  {
    id: "zed",
    name: "Zed",
    bundleId: "dev.zed.Zed",
    paths: ["/Applications/Zed.app", "/Applications/Zed Preview.app"],
    aliases: ["zed", "zed preview"],
  },
  {
    id: "vscode",
    name: "Visual Studio Code",
    bundleId: "com.microsoft.VSCode",
    paths: ["/Applications/Visual Studio Code.app", "/Applications/Visual Studio Code - Insiders.app"],
    aliases: ["visual studio code", "vscode"],
  },
  {
    id: "cursor",
    name: "Cursor",
    bundleId: "com.todesktop.230313mzl4w4u92",
    paths: ["/Applications/Cursor.app"],
    aliases: ["cursor"],
  },
  {
    id: "windsurf",
    name: "Windsurf",
    bundleId: "com.exafunction.windsurf",
    paths: ["/Applications/Windsurf.app"],
    aliases: ["windsurf"],
  },
  {
    id: "ghostty",
    name: "Ghostty",
    bundleId: "com.mitchellh.ghostty",
    paths: ["/Applications/Ghostty.app"],
    aliases: ["ghostty"],
  },
  {
    id: "wezterm",
    name: "WezTerm",
    bundleId: "com.github.wez.wezterm",
    paths: ["/Applications/WezTerm.app"],
    aliases: ["wezterm"],
  },
  {
    id: "kitty",
    name: "kitty",
    bundleId: "net.kovidgoyal.kitty",
    paths: ["/Applications/kitty.app"],
    aliases: ["kitty"],
  },
  {
    id: "alacritty",
    name: "Alacritty",
    bundleId: "org.alacritty",
    paths: ["/Applications/Alacritty.app"],
    aliases: ["alacritty"],
  },
];

export function preferredTerminalApplication(): Application {
  const definition = definitionForId(preferredTerminalApplicationId());
  const availableDefinition =
    definition.id === "terminal" || definition.paths.some(existsSync) ? definition : definitionForId("terminal");
  return applicationForDefinition(availableDefinition);
}

function preferredTerminalApplicationId(): SupportedTerminalApplicationId {
  const stored = storedTerminalSelection();
  return stored?.selectedId && hasDefinition(stored.selectedId) ? stored.selectedId : "terminal";
}

export function installedTerminalApplications(): Application[] {
  return supportedTerminalCatalog
    .filter((definition) => definition.id === "terminal" || definition.paths.some(existsSync))
    .map(applicationForDefinition);
}

export function terminalApplicationId(application: Application): SupportedTerminalApplicationId {
  return definitionForValue(application)?.id || "terminal";
}

export function selectPreferredTerminalApplication(application: Application): void {
  const definition = definitionForValue(application);
  if (!definition || (definition.id !== "terminal" && !definition.paths.some(existsSync))) return;
  const stored: StoredTerminalSelection = {
    selectedId: definition.id,
  };
  terminalSelectionCache.set(terminalSelectionCacheKey, JSON.stringify(stored));
}

export function subscribePreferredTerminalApplication(listener: () => void): () => void {
  return terminalSelectionCache.subscribe((key) => {
    if (!key || key === terminalSelectionCacheKey) listener();
  });
}

export function preferredTerminalName(terminal = preferredTerminalApplication()): string {
  return terminal.localizedName || terminal.name;
}

export async function resumeSession(session: ChatSession): Promise<void> {
  const terminal = preferredTerminalApplication();
  const sharedSessionIsRunning = await hasSharedSession(session);
  const interactiveStatus = getInteractiveSnapshot(session).status;
  const raycastSessionIsRunning = interactiveStatus === "starting" || interactiveStatus === "running";
  const privateExternalSessionIsRunning = !sharedSessionIsRunning ? await isChatSessionCurrentlyActive(session) : false;
  if ((privateExternalSessionIsRunning || raycastSessionIsRunning) && !sharedSessionIsRunning) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Close The Private CLI To Share It",
      message: raycastSessionIsRunning
        ? "Close it in Raycast, then reopen it to migrate to shared mode."
        : "Close only the CLI in the other application, then open this chat and choose Start Shared Mode.",
    });
    return;
  }
  const permissionProfileId = getInteractivePermissionProfileId(session);
  const resumeCommand = buildResumeCommand(session, {
    permissionProfileId,
  });
  const sharedShellCommand = await buildExternalSharedShellCommand(session, permissionProfileId);
  const command = sharedShellCommand
    ? `cd ${shellQuote(session.cwd)} && ${sharedShellCommand}`
    : `cd ${shellQuote(session.cwd)} && ${shellQuote(resumeCommand.executable)} ${resumeCommand.arguments.map(shellQuote).join(" ")}`;

  try {
    const launchResult = await runInTerminal(
      terminal,
      session.cwd,
      command,
      `${providerTitle(session)} · ${session.projectName}`,
    );
    if (launchResult) {
      await showToast({
        style: launchResult === "executed" ? Toast.Style.Success : Toast.Style.Failure,
        title:
          launchResult === "executed"
            ? `${sharedSessionIsRunning ? "Connected" : "Resuming"} in ${terminal.localizedName || terminal.name}`
            : "Complete The Start Manually",
        message:
          launchResult === "executed"
            ? `${sharedShellCommand ? "Shared session" : resumeCommand.executable} · ${session.projectName}`
            : "The project is open and the command is copied. Create an integrated terminal or Terminal Thread, then paste it once.",
      });
      return;
    }

    await Clipboard.copy(command);
    await openSelectedApplication(terminal, session.cwd);
    await showToast({
      style: Toast.Style.Success,
      title: `Project opened in ${terminal.localizedName || terminal.name}`,
      message: sharedShellCommand
        ? "The shared command was copied. Open the integrated terminal and paste it once."
        : "The resume command was copied to the clipboard.",
    });
  } catch (error) {
    await showFailureToast(error, {
      title: `Could not open ${terminal.localizedName || terminal.name}`,
    });
  }
}

export async function openProjectInTerminal(cwd: string): Promise<void> {
  const terminal = preferredTerminalApplication();
  try {
    const opened = await runInTerminal(terminal, cwd, undefined, cwd.split("/").at(-1) || "Project");
    if (!opened) await openSelectedApplication(terminal, cwd);
    await showToast({
      style: Toast.Style.Success,
      title: `Project opened in ${terminal.localizedName || terminal.name}`,
      message: cwd,
    });
  } catch (error) {
    await showFailureToast(error, {
      title: `Could not open ${terminal.localizedName || terminal.name}`,
    });
  }
}

async function runInTerminal(
  terminal: Application,
  cwd: string,
  command: string | undefined,
  title: string,
): Promise<TerminalLaunchResult> {
  const kind = terminalKind(terminal);
  if (kind === "terminal") {
    await runTerminalAppleScript(command || `cd ${shellQuote(cwd)}`);
    return command ? "executed" : "opened";
  }
  if (kind === "iterm") {
    await runITermAppleScript(command || `cd ${shellQuote(cwd)}`);
    return command ? "executed" : "opened";
  }
  if (kind === "warp") {
    if (command) await runWarpTabConfiguration(terminal, cwd, command, title);
    else await open(`${warpScheme(terminal)}://action/new_tab?path=${encodeURIComponent(cwd)}`);
    return command ? "executed" : "opened";
  }
  if (kind === "zed") return runInZed(terminal, cwd, command);
  if (kind === "vscode" || kind === "cursor" || kind === "windsurf") {
    return runInCodeEditor(terminal, cwd, command, kind);
  }
  if (kind === "ghostty") {
    const executable = firstExisting([
      join(terminal.path, "Contents/MacOS/ghostty"),
      "/opt/homebrew/bin/ghostty",
      "/usr/local/bin/ghostty",
    ]);
    if (!executable) return false;
    await launchDetached(executable, [
      `--working-directory=${cwd}`,
      ...(command ? ["-e", "/bin/zsh", "-lic", command] : []),
    ]);
    return command ? "executed" : "opened";
  }
  if (kind === "wezterm") {
    const executable = firstExisting([
      join(terminal.path, "Contents/MacOS/wezterm"),
      "/opt/homebrew/bin/wezterm",
      "/usr/local/bin/wezterm",
    ]);
    if (!executable) return false;
    await launchDetached(executable, ["start", "--cwd", cwd, ...(command ? ["--", "/bin/zsh", "-lic", command] : [])]);
    return command ? "executed" : "opened";
  }
  if (kind === "kitty") {
    const executable = firstExisting([
      join(terminal.path, "Contents/MacOS/kitty"),
      "/opt/homebrew/bin/kitty",
      "/usr/local/bin/kitty",
    ]);
    if (!executable) return false;
    await launchDetached(executable, ["--directory", cwd, ...(command ? ["/bin/zsh", "-lic", command] : [])]);
    return command ? "executed" : "opened";
  }
  if (kind === "alacritty") {
    const executable = firstExisting([
      join(terminal.path, "Contents/MacOS/alacritty"),
      "/opt/homebrew/bin/alacritty",
      "/usr/local/bin/alacritty",
    ]);
    if (!executable) return false;
    await launchDetached(executable, [
      "--working-directory",
      cwd,
      ...(command ? ["-e", "/bin/zsh", "-lic", command] : []),
    ]);
    return command ? "executed" : "opened";
  }
  return false;
}

async function runTerminalAppleScript(command: string): Promise<void> {
  await runAppleScript(
    `on run argv
      tell application id "com.apple.Terminal"
        activate
        do script (item 1 of argv)
      end tell
    end run`,
    [command],
  );
}

async function runITermAppleScript(command: string): Promise<void> {
  await runAppleScript(
    `on run argv
      tell application id "com.googlecode.iterm2"
        activate
        if (count of windows) is 0 then
          create window with default profile command (item 1 of argv)
        else
          tell current window to create tab with default profile command (item 1 of argv)
        end if
      end tell
    end run`,
    [command],
  );
}

async function runWarpTabConfiguration(
  terminal: Application,
  cwd: string,
  command: string,
  title: string,
): Promise<void> {
  const configurationId = `raycast_cli_claude_codex_${createHash("sha256")
    .update(`${cwd}\0${command}`)
    .digest("hex")
    .slice(0, 12)}`;
  const configurationDirectory = join(
    homedir(),
    warpScheme(terminal) === "warppreview" ? ".warp-preview" : ".warp",
    "tab_configs",
  );
  const configurationPath = join(configurationDirectory, `${configurationId}.toml`);
  const toml = [
    `name = ${tomlString("PromptCast")}`,
    `title = ${tomlString(title)}`,
    "",
    "[[panes]]",
    'id = "main"',
    'type = "terminal"',
    `directory = ${tomlString(cwd)}`,
    `commands = [${tomlString(command)}]`,
    "is_focused = true",
  ].join("\n");
  await mkdir(configurationDirectory, { recursive: true });
  await writeFile(configurationPath, `${toml}\n`, "utf8");
  await open(`${warpScheme(terminal)}://tab_config/${encodeURIComponent(configurationId)}`);
}

async function runInZed(
  terminal: Application,
  cwd: string,
  command: string | undefined,
): Promise<TerminalLaunchResult> {
  const executable = firstExisting([
    join(terminal.path, "Contents/MacOS/cli"),
    "/Applications/Zed.app/Contents/MacOS/cli",
    "/Applications/Zed Preview.app/Contents/MacOS/cli",
    "/opt/homebrew/bin/zed",
    "/usr/local/bin/zed",
  ]);
  if (!executable) return false;
  await launchDetached(executable, ["--existing", cwd]);
  if (!command) return "opened";

  await Clipboard.copy(command);
  try {
    await runAppleScript(
      `on run argv
        set targetBundleId to item 1 of argv
        set terminalCommand to item 2 of argv
        tell application "System Events"
          set targetProcess to missing value
          repeat 60 times
            set matches to every application process whose bundle identifier is targetBundleId
            if (count of matches) > 0 then
              set targetProcess to item 1 of matches
              exit repeat
            end if
            delay 0.1
          end repeat
          if targetProcess is missing value then error "Zed did not open"
          tell targetProcess
            set frontmost to true
            delay 0.9
            keystroke "p" using {command down, shift down}
            delay 0.4
            set the clipboard to "agent: new terminal thread"
            keystroke "v" using {command down}
            delay 0.35
            key code 36
            delay 0.9
            set the clipboard to terminalCommand
            keystroke "v" using {command down}
            delay 0.2
            key code 36
          end tell
        end tell
      end run`,
      [terminal.bundleId || "dev.zed.Zed", command],
    );
    return "executed";
  } catch {
    return "opened";
  }
}

async function runInCodeEditor(
  application: Application,
  cwd: string,
  command: string | undefined,
  kind: "vscode" | "cursor" | "windsurf",
): Promise<TerminalLaunchResult> {
  const cliName = kind === "vscode" ? "code" : kind;
  const executable = firstExisting([
    join(application.path, `Contents/Resources/app/bin/${cliName}`),
    `/opt/homebrew/bin/${cliName}`,
    `/usr/local/bin/${cliName}`,
  ]);
  if (!executable) return false;

  await launchDetached(executable, ["--new-window", cwd]);
  if (!command) return "opened";

  await Clipboard.copy(command);
  try {
    await runAppleScript(
      `on run argv
        set targetBundleId to item 1 of argv
        tell application "System Events"
          set targetProcess to missing value
          repeat 60 times
            set matches to every application process whose bundle identifier is targetBundleId
            if (count of matches) > 0 then
              set targetProcess to item 1 of matches
              exit repeat
            end if
            delay 0.1
          end repeat
          if targetProcess is missing value then error "Editor did not open"
          tell targetProcess
            set frontmost to true
            delay 0.8
            key code 50 using {control down}
            delay 0.45
            keystroke "v" using {command down}
            delay 0.15
            key code 36
          end tell
        end tell
      end run`,
      [application.bundleId || ""],
    );
    return "executed";
  } catch {
    return "opened";
  }
}

function terminalKind(terminal: Application): TerminalKind {
  const signature = `${terminal.bundleId || ""} ${terminal.name} ${terminal.path}`.toLowerCase();
  if (signature.includes("com.apple.terminal") || /\/terminal\.app/i.test(terminal.path)) return "terminal";
  if (signature.includes("iterm")) return "iterm";
  if (signature.includes("warp")) return "warp";
  if (signature.includes("zed")) return "zed";
  if (signature.includes("com.microsoft.vscode") || signature.includes("visual studio code")) return "vscode";
  if (signature.includes("cursor")) return "cursor";
  if (signature.includes("windsurf")) return "windsurf";
  if (signature.includes("ghostty")) return "ghostty";
  if (signature.includes("wezterm")) return "wezterm";
  if (signature.includes("kitty")) return "kitty";
  if (signature.includes("alacritty")) return "alacritty";
  return "other";
}

function warpScheme(terminal: Application): "warp" | "warppreview" {
  return `${terminal.bundleId || ""} ${terminal.name} ${terminal.path}`.toLowerCase().includes("preview")
    ? "warppreview"
    : "warp";
}

function firstExisting(paths: string[]): string | undefined {
  return paths.find((path) => existsSync(path));
}

async function launchDetached(executable: string, argumentsList: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, argumentsList, { detached: true, stdio: "ignore" });
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
    child.once("error", reject);
  });
}

async function openSelectedApplication(application: Application, target: string): Promise<void> {
  const selector = application.bundleId
    ? ["-b", application.bundleId]
    : ["-a", application.path || application.localizedName || application.name];
  await launchDetached("/usr/bin/open", [...selector, target]);
}

function tomlString(value: string): string {
  return JSON.stringify(value.replace(/[\r\n]+/g, " "));
}

function providerTitle(session: ChatSession): string {
  return session.provider === "codex" ? "Codex" : "Claude";
}

function definitionForValue(value: string | Application | undefined): SupportedTerminalApplication | undefined {
  if (!value) return undefined;
  const signature =
    typeof value === "string"
      ? value.toLowerCase()
      : [value.bundleId, value.name, value.localizedName, value.path].filter(Boolean).join(" ").toLowerCase();
  return supportedTerminalCatalog.find(
    (definition) =>
      signature === definition.id ||
      signature.includes(definition.bundleId.toLowerCase()) ||
      definition.paths.some((path) => signature.includes(path.toLowerCase())) ||
      definition.aliases.some((alias) => signature.includes(alias)),
  );
}

function definitionForId(id: SupportedTerminalApplicationId): SupportedTerminalApplication {
  return supportedTerminalCatalog.find((definition) => definition.id === id) || supportedTerminalCatalog[0];
}

function hasDefinition(id: string): id is SupportedTerminalApplicationId {
  return supportedTerminalCatalog.some((definition) => definition.id === id);
}

function applicationForDefinition(definition: SupportedTerminalApplication): Application {
  return {
    name: definition.name,
    localizedName: definition.name,
    path: firstExisting(definition.paths) || definition.paths[0],
    bundleId: definition.bundleId,
  };
}

function storedTerminalSelection(): StoredTerminalSelection | undefined {
  try {
    const stored = terminalSelectionCache.get(terminalSelectionCacheKey);
    if (!stored) return undefined;
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return undefined;
    const selection = parsed as Partial<StoredTerminalSelection>;
    if (!selection.selectedId || !hasDefinition(selection.selectedId)) return undefined;
    return {
      selectedId: selection.selectedId,
    };
  } catch {
    return undefined;
  }
}
