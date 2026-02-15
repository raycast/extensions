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
import { useEffect, useState } from "react";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const POLL_INTERVAL_MS = 250;
const DEFAULT_TIMEOUT_MS = 8000;
const LAST_APP_NAME_KEY = "last-app-name";

type Preferences = {
  stopTimeoutMs?: string;
};

type FormValues = {
  appName: string;
};

async function runCommand(command: string, args: string[]): Promise<void> {
  await execFileAsync(command, args);
}

async function isAppRunning(appName: string): Promise<boolean> {
  const script = `tell application "System Events" to (name of processes) contains ${JSON.stringify(appName)}`;
  const { stdout } = await execFileAsync("osascript", ["-e", script]);
  return stdout.trim().toLowerCase() === "true";
}

async function getRunningAppNames(): Promise<string[]> {
  const script =
    'tell application "System Events" to get name of (application processes whose background only is false)';
  const { stdout } = await execFileAsync("osascript", ["-e", script]);

  return stdout
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
    .sort((left, right) => left.localeCompare(right));
}

async function forceQuitApp(appName: string): Promise<void> {
  try {
    await runCommand("pkill", ["-x", appName]);
    return;
  } catch {
    await runCommand("killall", ["-9", appName]);
  }
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

export default function Command() {
  const { stopTimeoutMs } = getPreferenceValues<Preferences>();
  const [appName, setAppName] = useState<string>("");
  const [runningApps, setRunningApps] = useState<string[]>([]);
  const [selectedRunningApp, setSelectedRunningApp] = useState<string>("");
  const [isLoadingApps, setIsLoadingApps] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function loadRunningApps() {
      try {
        const [appNames, storedAppName] = await Promise.all([
          getRunningAppNames(),
          LocalStorage.getItem<string>(LAST_APP_NAME_KEY),
        ]);

        if (isMounted) {
          setRunningApps(appNames);

          if (
            typeof storedAppName === "string" &&
            storedAppName.trim().length > 0
          ) {
            const trimmedStoredAppName = storedAppName.trim();
            setAppName(trimmedStoredAppName);

            if (appNames.includes(trimmedStoredAppName)) {
              setSelectedRunningApp(trimmedStoredAppName);
            }
          }
        }
      } finally {
        if (isMounted) {
          setIsLoadingApps(false);
        }
      }
    }

    void loadRunningApps();

    return () => {
      isMounted = false;
    };
  }, []);

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
      const runningBeforeQuit = await isAppRunning(appName);
      if (runningBeforeQuit) {
        await forceQuitApp(appName);
        await waitForStop(appName, timeoutMs);
      }

      await runCommand("open", ["-a", appName]);
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

    if (runningApps.includes(value)) {
      setSelectedRunningApp(value);
    }
  }

  function onRunningAppChange(value: string): void {
    setSelectedRunningApp(value);
    setAppName(value);
  }

  return (
    <Form
      isLoading={isLoadingApps}
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
        placeholder="Google Chrome"
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
