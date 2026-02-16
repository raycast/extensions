import {
  Action,
  ActionPanel,
  Form,
  LocalStorage,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import path from "node:path";
import { useEffect, useState } from "react";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const POLL_INTERVAL_MS = 250;
const DEFAULT_TIMEOUT_MS = 8000;
const LAST_APP_NAME_KEY = "last-app-name";
const WINDOWS_EXECUTABLE_SUFFIX = /\.exe$/i;

type FormValues = {
  appName: string;
};

async function runCommand(command: string, args: string[]): Promise<void> {
  await execFileAsync(command, args);
}

async function runAppleScript(script: string): Promise<string> {
  const { stdout } = await execFileAsync("osascript", ["-e", script]);
  return stdout;
}

async function runPowerShell(script: string): Promise<string> {
  const { stdout } = await execFileAsync("powershell", [
    "-NoProfile",
    "-Command",
    script,
  ]);

  return stdout;
}

function escapePowerShell(value: string): string {
  return value.replace(/'/g, "''");
}

function toWindowsProcessName(appName: string): string {
  const trimmed = appName.trim();
  const fileName =
    trimmed.includes("\\") || trimmed.includes("/")
      ? path.basename(trimmed)
      : trimmed;

  return WINDOWS_EXECUTABLE_SUFFIX.test(fileName)
    ? fileName.slice(0, -4)
    : fileName;
}

function toWindowsExecutableName(appName: string): string {
  const processName = toWindowsProcessName(appName);
  return WINDOWS_EXECUTABLE_SUFFIX.test(processName)
    ? processName
    : `${processName}.exe`;
}

function findCaseInsensitiveMatch(
  target: string,
  candidates: string[],
): string | undefined {
  const normalizedTarget = target.trim().toLowerCase();
  if (!normalizedTarget) {
    return undefined;
  }

  return candidates.find(
    (candidate) => candidate.trim().toLowerCase() === normalizedTarget,
  );
}

async function isAppRunningMacOS(appName: string): Promise<boolean> {
  const script = `
tell application "System Events"
  set targetName to ${JSON.stringify(appName)}
  repeat with processRef in application processes
    try
      if name of processRef is targetName then
        return true
      end if
    end try
  end repeat
end tell

return false
  `.trim();
  const stdout = await runAppleScript(script);
  return stdout.trim().toLowerCase() === "true";
}

async function isAppRunningWindows(appName: string): Promise<boolean> {
  const processName = toWindowsProcessName(appName);
  const script = `$name = '${escapePowerShell(processName)}'; if (Get-Process -Name $name -ErrorAction SilentlyContinue) { 'true' } else { 'false' }`;
  const stdout = await runPowerShell(script);

  return stdout.trim().toLowerCase() === "true";
}

async function isAppRunning(appName: string): Promise<boolean> {
  if (process.platform === "darwin") {
    return isAppRunningMacOS(appName);
  }

  if (process.platform === "win32") {
    return isAppRunningWindows(appName);
  }

  throw new Error(`Unsupported platform: ${process.platform}`);
}

async function getRunningAppNamesMacOS(): Promise<string[]> {
  const { stdout } = await execFileAsync("lsappinfo", ["visibleprocesslist"]);
  const matches = stdout.match(/"([^"]+)"/g) ?? [];

  return [...new Set(matches.map((value) => value.slice(1, -1).trim()))]
    .filter((name) => name.length > 0)
    .sort((left, right) => left.localeCompare(right));
}

async function getRunningAppNamesWindows(): Promise<string[]> {
  const script =
    "Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.ProcessName } | Select-Object -ExpandProperty ProcessName -Unique | Sort-Object";
  const stdout = await runPowerShell(script);

  return stdout
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

async function getRunningAppNames(): Promise<string[]> {
  if (process.platform === "darwin") {
    return getRunningAppNamesMacOS();
  }

  if (process.platform === "win32") {
    return getRunningAppNamesWindows();
  }

  throw new Error(`Unsupported platform: ${process.platform}`);
}

async function forceQuitAppMacOS(appName: string): Promise<void> {
  try {
    await runCommand("pkill", ["-x", appName]);
    return;
  } catch {
    await runCommand("killall", ["-9", appName]);
  }
}

async function forceQuitAppWindows(appName: string): Promise<void> {
  const executableName = toWindowsExecutableName(appName);

  try {
    await runCommand("taskkill", ["/F", "/IM", executableName]);
    return;
  } catch {
    const processName = toWindowsProcessName(appName);
    const script = `Stop-Process -Name '${escapePowerShell(processName)}' -Force -ErrorAction Stop`;
    await runPowerShell(script);
  }
}

async function forceQuitApp(appName: string): Promise<void> {
  if (process.platform === "darwin") {
    await forceQuitAppMacOS(appName);
    return;
  }

  if (process.platform === "win32") {
    await forceQuitAppWindows(appName);
    return;
  }

  throw new Error(`Unsupported platform: ${process.platform}`);
}

async function getWindowsExecutablePath(
  appName: string,
): Promise<string | undefined> {
  const executableName = toWindowsExecutableName(appName);
  const script = `$target = '${escapePowerShell(executableName)}'; $path = Get-CimInstance Win32_Process | Where-Object { $_.Name -ieq $target } | Select-Object -First 1 -ExpandProperty ExecutablePath; if ($path) { $path }`;
  const stdout = await runPowerShell(script);
  const executablePath = stdout.trim();

  return executablePath.length > 0 ? executablePath : undefined;
}

async function launchApp(
  appName: string,
  executablePath?: string,
): Promise<void> {
  if (process.platform === "darwin") {
    await runCommand("open", ["-a", appName]);
    return;
  }

  if (process.platform === "win32") {
    const looksLikePath = appName.includes("\\") || appName.includes("/");
    const launchTarget = executablePath
      ? executablePath
      : looksLikePath
        ? appName
        : toWindowsExecutableName(appName);

    await runPowerShell(
      `Start-Process -FilePath '${escapePowerShell(launchTarget)}'`,
    );
    return;
  }

  throw new Error(`Unsupported platform: ${process.platform}`);
}

async function waitForStop(appName: string, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (!(await isAppRunning(appName))) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`Timed out waiting for ${appName} to stop`);
}

function parseTimeout(value?: string): number {
  const parsed = Number(value ?? String(DEFAULT_TIMEOUT_MS));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.floor(parsed);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Failed to restart app";
}

function getErrorText(error: unknown): string {
  if (!(error && typeof error === "object")) {
    return "";
  }

  const value = error as { message?: unknown; stderr?: unknown };
  const message = typeof value.message === "string" ? value.message : "";
  const stderr = typeof value.stderr === "string" ? value.stderr : "";

  return `${message}\n${stderr}`.toLowerCase();
}

function getRunningAppsLoadFailureMessage(error: unknown): string {
  const text = getErrorText(error);

  if (process.platform === "win32") {
    if (text.includes("powershell") || text.includes("get-process")) {
      return "Failed to query running processes through PowerShell. Confirm PowerShell is available, then run again.";
    }

    return "Failed to read running apps on Windows. Try running the command again.";
  }

  if (
    text.includes("not authorized to send apple events") ||
    text.includes("(-1743)")
  ) {
    return "Grant Automation permission for Raycast to control System Events in macOS Settings > Privacy & Security > Automation, then run again.";
  }

  if (text.includes("invalid index") || text.includes("(-1719)")) {
    return "System Events changed while reading processes. Try running the command again.";
  }

  return "Failed to read running apps from System Events. If this keeps happening, check Raycast Automation permission for System Events.";
}

export default function Command() {
  const { stopTimeoutMs } =
    getPreferenceValues<Preferences.ForceQuitAndRelaunch>();
  const [appName, setAppName] = useState<string>("");
  const [runningApps, setRunningApps] = useState<string[]>([]);
  const [selectedRunningApp, setSelectedRunningApp] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    async function loadStoredAppName() {
      const storedAppName =
        await LocalStorage.getItem<string>(LAST_APP_NAME_KEY);

      if (
        isMounted &&
        typeof storedAppName === "string" &&
        storedAppName.trim().length > 0
      ) {
        setAppName(storedAppName.trim());
      }
    }

    void loadStoredAppName();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadRunningApps() {
      try {
        const appNames = await getRunningAppNames();

        if (isMounted) {
          setRunningApps(appNames);
        }
      } catch (error) {
        if (isMounted) {
          setRunningApps([]);
        }

        await showToast({
          style: Toast.Style.Failure,
          title: "Could not load running apps",
          message: getRunningAppsLoadFailureMessage(error),
        });
      }
    }

    void loadRunningApps();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!appName) {
      setSelectedRunningApp("");
      return;
    }

    const directMatch = findCaseInsensitiveMatch(appName, runningApps);
    if (directMatch) {
      setSelectedRunningApp(directMatch);
      return;
    }

    if (process.platform === "win32") {
      const processName = toWindowsProcessName(appName);
      const processMatch = findCaseInsensitiveMatch(processName, runningApps);
      if (processMatch) {
        setSelectedRunningApp(processMatch);
        return;
      }
    }

    setSelectedRunningApp("");
  }, [appName, runningApps]);

  async function onSubmit(values: FormValues): Promise<void> {
    const appName = values.appName.trim();
    if (!appName) {
      await showToast({
        style: Toast.Style.Failure,
        title: "App name is required",
      });
      return;
    }

    await LocalStorage.setItem(LAST_APP_NAME_KEY, appName);

    const timeoutMs = parseTimeout(stopTimeoutMs);
    const progressToast = await showToast({
      style: Toast.Style.Animated,
      title: `Restarting ${appName}`,
    });

    try {
      let executablePath: string | undefined;
      const runningBeforeQuit = await isAppRunning(appName);
      if (runningBeforeQuit) {
        if (process.platform === "win32") {
          executablePath = await getWindowsExecutablePath(appName);
        }

        await forceQuitApp(appName);
        await waitForStop(appName, timeoutMs);
      }

      await launchApp(appName, executablePath);
      progressToast.style = Toast.Style.Success;
      progressToast.title = `${appName} restarted`;
      progressToast.message = undefined;
    } catch (error) {
      progressToast.style = Toast.Style.Failure;
      progressToast.title = "Restart failed";
      progressToast.message = toErrorMessage(error);
    }
  }

  function onAppNameChange(value: string): void {
    setAppName(value);

    const directMatch = findCaseInsensitiveMatch(value, runningApps);
    if (directMatch) {
      setSelectedRunningApp(directMatch);
      return;
    }

    if (process.platform === "win32") {
      const processName = toWindowsProcessName(value);
      const processMatch = findCaseInsensitiveMatch(processName, runningApps);
      if (processMatch) {
        setSelectedRunningApp(processMatch);
        return;
      }
    }

    setSelectedRunningApp("");
  }

  function onRunningAppChange(value: string): void {
    setSelectedRunningApp(value);
    setAppName(value);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Force Quit and Relaunch"
            onSubmit={onSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="appName"
        title="App Name"
        placeholder={
          process.platform === "win32"
            ? "notepad or notepad.exe"
            : "Google Chrome"
        }
        autoFocus
        value={appName}
        onChange={onAppNameChange}
      />
      <Form.Dropdown
        id="runningApps"
        title="Running Apps"
        value={selectedRunningApp}
        onChange={onRunningAppChange}
      >
        {runningApps.length > 0 ? (
          runningApps.map((appName) => (
            <Form.Dropdown.Item key={appName} value={appName} title={appName} />
          ))
        ) : (
          <Form.Dropdown.Item value="" title="No running foreground apps" />
        )}
      </Form.Dropdown>
    </Form>
  );
}
