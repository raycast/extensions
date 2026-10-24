import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { useEffect, useState } from "react";
import { promisify } from "util";

const execAsync = promisify(exec);

type PortProcess = {
  port: string;
  process: string;
  pid: string;
  command: string;
  fingerprint: string;
};

/**
 * Exact command names that should never be exposed as development servers.
 */
const IGNORED_EXACT_COMMANDS = new Set(["Raycast Backend", "rapportd"].map((value) => value.toLowerCase()));

/**
 * lsof may truncate COMMAND values, so some shortened variants are
 * intentionally included here.
 *
 * Only applications/services that are clearly unrelated to local
 * development servers should be added.
 */
const IGNORED_PROCESS_NAMES = new Set(
  [
    // macOS
    "ControlCenter",
    "ControlCe",
    "rapportd",

    // Raycast
    "Raycast",

    // Setapp
    "SetappPage",

    // Logitech
    "LogiPlugin",
    "LogiPlugi",
    "lghub_agent",
    "lghub_age",

    // Figma
    "figma_agent",
    "figma_age",

    // Ollama desktop app
    "ollama",

    // Antigravity
    "Antigravity",

    // Misc desktop helper previously detected
    "stable",

    // Android device bridge
    "adb",

    // Adobe
    "Adobe",
    "AdobeIPCBroker",
    "AdobeIPCB",
    "Adobe Desktop Service",
    "AdobeDesk",
    "CCXProcess",
    "CCXProces",
    "CoreSync",
    "Creative Cloud",
    "CreativeC",
    "AGMService",
    "AGSService",
  ].map((value) => value.toLowerCase()),
);

/**
 * Precise application paths are safer than broad substring matching.
 *
 * For example, we intentionally avoid:
 *
 *   command.includes("raycast")
 *
 * because a legitimate development project could itself live in a
 * directory containing the word "raycast".
 */
const IGNORED_APPLICATION_PATHS = [
  // Raycast
  "/Applications/Raycast.app/",
  "/Library/Application Support/com.raycast.macos/",

  // Figma
  "/Applications/Figma.app/",

  // Linear
  "/Applications/Linear.app/",

  // Antigravity
  "/Applications/Antigravity.app/",

  // Setapp
  "/Applications/Setapp.app/",
  "/Applications/Setapp/",

  // Ollama desktop application
  "/Applications/Ollama.app/",

  // Logitech
  "/Applications/Logi Options+.app/",
  "/Library/Application Support/Logitech",

  // Adobe / Creative Cloud
  "/Applications/Adobe ",
  "/Applications/Adobe Creative Cloud/",
  "/Applications/Utilities/Adobe Creative Cloud/",
  "/Library/Application Support/Adobe/",
  "/Library/PrivilegedHelperTools/com.adobe.",
];

async function getProcessCommand(pid: string) {
  try {
    const { stdout } = await execAsync(`ps -p ${pid} -o command=`);
    return stdout.trim();
  } catch {
    return "";
  }
}

async function getProcessFingerprint(pid: string) {
  try {
    /**
     * We combine the process start time with its full command.
     *
     * This allows us to check that a PID still belongs to the exact process
     * the user selected before sending a signal to it.
     */
    const { stdout } = await execAsync(`ps -p ${pid} -o lstart= -o command=`);

    return stdout.trim();
  } catch {
    return "";
  }
}

function shouldIgnoreProcess(process: string, command: string) {
  const normalizedProcess = process.toLowerCase();
  const normalizedCommand = command.toLowerCase();

  if (IGNORED_PROCESS_NAMES.has(normalizedProcess)) {
    return true;
  }

  if (IGNORED_EXACT_COMMANDS.has(normalizedCommand)) {
    return true;
  }

  return IGNORED_APPLICATION_PATHS.some((path) => normalizedCommand.startsWith(path.toLowerCase()));
}

async function getListeningPorts(): Promise<PortProcess[]> {
  const { stdout } = await execAsync(`lsof -nP -iTCP -sTCP:LISTEN | awk 'NR>1 {print $1 "|" $2 "|" $9}'`);

  if (!stdout.trim()) {
    return [];
  }

  const unique = new Map<string, PortProcess>();

  for (const line of stdout.trim().split("\n")) {
    const [process, pid, address] = line.split("|");
    const port = address?.split(":").pop();

    if (!process || !pid || !port) {
      continue;
    }

    const command = await getProcessCommand(pid);

    if (!command) {
      continue;
    }

    if (shouldIgnoreProcess(process, command)) {
      continue;
    }

    const fingerprint = await getProcessFingerprint(pid);

    if (!fingerprint) {
      continue;
    }

    unique.set(`${port}-${pid}`, {
      port,
      process,
      pid,
      command,
      fingerprint,
    });
  }

  return Array.from(unique.values()).sort((a, b) => Number(a.port) - Number(b.port));
}

async function processStillMatches(item: PortProcess) {
  const currentFingerprint = await getProcessFingerprint(item.pid);

  return Boolean(currentFingerprint && currentFingerprint === item.fingerprint);
}

async function stopProcess(item: PortProcess) {
  try {
    /**
     * Verify the process immediately before signaling it.
     *
     * This prevents us from terminating an unrelated process if macOS
     * has reused the PID since the list was loaded.
     */
    if (!(await processStillMatches(item))) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Process changed",
        message: `PID ${item.pid} no longer belongs to the same process.`,
      });

      return;
    }

    await execAsync(`kill -TERM ${item.pid}`);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const stillRunning = await processStillMatches(item);

    if (stillRunning) {
      await showToast({
        style: Toast.Style.Animated,
        title: `Port ${item.port} is still in use`,
        message: "Use Force Kill if the process does not stop.",
      });

      return;
    }

    await showToast({
      style: Toast.Style.Success,
      title: `Port ${item.port} freed`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Unable to stop process on port ${item.port}`,
      message: String(error),
    });
  }
}

async function forceKillProcess(item: PortProcess) {
  const confirmed = await confirmAlert({
    title: `Force kill process on port ${item.port}?`,
    message: "This immediately terminates the process with SIGKILL.",
    primaryAction: {
      title: "Force Kill",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (!confirmed) {
    return;
  }

  try {
    /**
     * Recheck the process after the confirmation dialog as the PID may
     * have disappeared or been reused while the dialog was open.
     */
    if (!(await processStillMatches(item))) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Process changed",
        message: `PID ${item.pid} no longer belongs to the same process.`,
      });

      return;
    }

    await execAsync(`kill -KILL ${item.pid}`);

    await showToast({
      style: Toast.Style.Success,
      title: `Port ${item.port} freed`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Unable to force kill process on port ${item.port}`,
      message: String(error),
    });
  }
}

export default function Command() {
  const [ports, setPorts] = useState<PortProcess[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    setIsLoading(true);

    try {
      const result = await getListeningPorts();
      setPorts(result);
    } catch (error) {
      setPorts([]);

      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to retrieve ports",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for a port or process...">
      {!isLoading && ports.length === 0 ? (
        <List.EmptyView icon={Icon.CheckCircle} title="No listening ports found" />
      ) : (
        ports.map((item) => (
          <List.Item
            key={`${item.port}-${item.pid}`}
            icon={Icon.Terminal}
            title={`Port ${item.port}`}
            subtitle={item.process}
            accessories={[{ text: `PID ${item.pid}` }]}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.XMarkCircle}
                  title={`Stop Process on Port ${item.port}`}
                  onAction={async () => {
                    await stopProcess(item);
                    await refresh();
                  }}
                />

                <Action
                  icon={Icon.ExclamationMark}
                  title="Force Kill Process"
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    await forceKillProcess(item);
                    await refresh();
                  }}
                />

                <Action.CopyToClipboard title="Copy Command" content={item.command} />

                <Action.CopyToClipboard title="Copy PID" content={item.pid} />

                <Action
                  icon={Icon.ArrowClockwise}
                  title="Refresh"
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={refresh}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
