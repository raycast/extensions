import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  Detail,
  openExtensionPreferences,
  Color,
  Cache,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import fs from "fs";
import path from "path";
import { exec, spawn } from "child_process";

interface Preferences {
  serverDir?: string;
}

interface HealthResponse {
  status: string;
  version: string;
  browsers: number;
  uptime: number;
}

const SERVER_EXE_NAME = "raycast-bridge-server.exe";
const HEALTH_URL = "http://127.0.0.1:19222/health";
const SHUTDOWN_URL = "http://127.0.0.1:19222/shutdown";
const LOGIN_REG_KEY = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
const LOGIN_REG_NAME = "RaycastBridgeServer";

// ─── Server Control Helpers ───────────────────────────────────────────────────

function formatUptime(seconds: number): string {
  if (seconds < 3600) return `Up ${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `Up ${Math.floor(seconds / 3600)}h`;
  return `Up ${Math.floor(seconds / 86400)}d`;
}

async function checkHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(1500) });
    if (res.ok) return (await res.json()) as HealthResponse;
    return null;
  } catch {
    return null;
  }
}

function startServer(exePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Spawn detached so the process is fully independent from Raycast
      const child = spawn(exePath, [], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      });
      child.unref(); // Let Raycast exit without waiting for the server
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

async function stopServer(): Promise<void> {
  try {
    await fetch(SHUTDOWN_URL, { method: "POST", signal: AbortSignal.timeout(2000) });
  } catch {
    // Server may have already closed
  }
}

function killServer(): Promise<void> {
  return new Promise((resolve) => {
    exec(`taskkill /F /IM "${SERVER_EXE_NAME}"`, () => resolve());
  });
}

function checkLoginStartup(): Promise<boolean> {
  return new Promise((resolve) => {
    exec(`reg query "${LOGIN_REG_KEY}" /v "${LOGIN_REG_NAME}"`, (err) => resolve(!err));
  });
}

function enableLoginStartup(exePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(`reg add "${LOGIN_REG_KEY}" /v "${LOGIN_REG_NAME}" /t REG_SZ /d "${exePath}" /f`, (err) =>
      err ? reject(err) : resolve(),
    );
  });
}

function disableLoginStartup(): Promise<void> {
  return new Promise((resolve) => {
    exec(`reg delete "${LOGIN_REG_KEY}" /v "${LOGIN_REG_NAME}" /f`, () => resolve());
  });
}

// ─── Main Command ─────────────────────────────────────────────────────────────

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const serverDir = preferences.serverDir;

  const cache = new Cache();
  const cachedActive = cache.get("activeWindows");
  const initialActive = cachedActive ? JSON.parse(cachedActive) : [];

  // ─── Cached last-known state for flicker-free Frame 1 ────────────────────
  const cachedHealth = cache.get("lastHealth");
  const cachedLogin = cache.get("lastLoginStartup");
  const initialHealth: HealthResponse | null = cachedHealth ? JSON.parse(cachedHealth) : null;
  const initialLogin: boolean = cachedLogin === "true";

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validatedPath, setValidatedPath] = useState<string | null>(null);
  const [activeWindows, setActiveWindows] = useState<string[]>(initialActive);

  // Server status state — seeded from cache so Frame 1 is never grey
  const [health, setHealth] = useState<HealthResponse | null>(initialHealth);
  const [serverChecked, setServerChecked] = useState(initialHealth !== null);
  const [loginStartup, setLoginStartup] = useState<boolean>(initialLogin);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const exePath = serverDir ? path.join(serverDir, SERVER_EXE_NAME) : null;
  const isServerRunning = health !== null;

  // ─── Health polling ───────────────────────────────────────────────────────

  const refreshHealth = useCallback(async () => {
    const result = await checkHealth();
    setHealth(result);
    setServerChecked(true);
    // Update cache so next open is flicker-free
    if (result) {
      cache.set("lastHealth", JSON.stringify(result));
    } else {
      cache.remove("lastHealth");
    }
  }, []);

  useEffect(() => {
    refreshHealth();
    checkLoginStartup().then((val) => {
      setLoginStartup(val);
      cache.set("lastLoginStartup", String(val));
    });
    const interval = setInterval(refreshHealth, 3000);
    return () => clearInterval(interval);
  }, [refreshHealth]);

  // ─── Script window polling ────────────────────────────────────────────────

  const checkActiveWindows = useCallback(() => {
    const checkCmd =
      "powershell -NoProfile -Command \"Get-CimInstance Win32_Process -Filter 'Name = ''powershell.exe''' | Select-Object -ExpandProperty CommandLine | Select-String -Pattern 'watch-logs|ImportWorkspaces' | Select-String -Pattern 'Get-CimInstance' -NotMatch\"";
    exec(checkCmd, (_err, stdout) => {
      const output = stdout || "";
      const active: string[] = [];
      if (output.includes("watch-logs")) active.push("Watch Logs");
      if (output.includes("ImportWorkspaces")) active.push("Import Workspaces");

      setActiveWindows((prev) => {
        const isSame = active.length === prev.length && active.every((val, index) => val === prev[index]);
        if (isSame) return prev;
        cache.set("activeWindows", JSON.stringify(active));
        return active;
      });
    });
  }, []);

  useEffect(() => {
    checkActiveWindows();
    const interval = setInterval(checkActiveWindows, 2000);
    return () => clearInterval(interval);
  }, [checkActiveWindows]);

  // ─── Path validation ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!serverDir) {
      setErrorMsg("PreferenceRequired");
      return;
    }
    try {
      if (!fs.existsSync(serverDir)) {
        setErrorMsg("FolderDoesNotExist");
        return;
      }
      const requiredFiles = ["watch-logs.ps1", "ImportWorkspaces.ps1"];
      const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(serverDir, file)));
      if (missing.length > 0) {
        setErrorMsg(`MissingFiles:${missing.join(", ")}`);
        return;
      }
      setValidatedPath(serverDir);
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [serverDir]);

  // ─── Server actions ───────────────────────────────────────────────────────

  const handleStartServer = async () => {
    if (!exePath) {
      showToast({ style: Toast.Style.Failure, title: "Server path not configured" });
      return;
    }
    if (!fs.existsSync(exePath)) {
      showToast({ style: Toast.Style.Failure, title: "Server exe not found", message: exePath });
      return;
    }
    setIsStarting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Starting server..." });
    try {
      await startServer(exePath);
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        const result = await checkHealth();
        if (result) {
          clearInterval(poll);
          setHealth(result);
          setIsStarting(false);
          toast.style = Toast.Style.Success;
          toast.title = "Server started";
        } else if (attempts >= 25) {
          clearInterval(poll);
          setIsStarting(false);
          toast.style = Toast.Style.Failure;
          toast.title = "Server didn't respond in time";
        }
      }, 200);
    } catch {
      setIsStarting(false);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to start server";
    }
  };

  const handleStopServer = async () => {
    setIsStopping(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Stopping server..." });
    await stopServer();
    setTimeout(async () => {
      const result = await checkHealth();
      setHealth(result);
      setIsStopping(false);
      if (!result) {
        toast.style = Toast.Style.Success;
        toast.title = "Server stopped";
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Server still running — try Kill";
      }
    }, 1000);
  };

  const handleKillServer = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Killing server..." });
    await killServer();
    setTimeout(async () => {
      const result = await checkHealth();
      setHealth(result);
      toast.style = result ? Toast.Style.Failure : Toast.Style.Success;
      toast.title = result ? "Could not kill server" : "Server killed";
    }, 800);
  };

  const handleToggleLoginStartup = async () => {
    if (!exePath) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating startup setting..." });
    try {
      if (loginStartup) {
        await disableLoginStartup();
        setLoginStartup(false);
        cache.set("lastLoginStartup", "false");
        toast.style = Toast.Style.Success;
        toast.title = "Removed from login startup";
      } else {
        await enableLoginStartup(exePath);
        setLoginStartup(true);
        cache.set("lastLoginStartup", "true");
        toast.style = Toast.Style.Success;
        toast.title = "Added to login startup";
      }
    } catch {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update startup setting";
    }
  };

  // ─── Script actions ───────────────────────────────────────────────────────

  const handleRunScript = async (scriptName: string) => {
    if (!validatedPath) return;

    const isActive = activeWindows.includes(scriptName);

    if (isActive) {
      showToast({ style: Toast.Style.Animated, title: `Closing ${scriptName}...` });
      const scriptFileMap: Record<string, string> = {
        "Watch Logs": "watch-logs",
        "Import Workspaces": "ImportWorkspaces",
      };
      const pattern = scriptFileMap[scriptName] || "";
      const cmd1 = `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter 'Name = ''powershell.exe''' | Where-Object { $_.CommandLine -like '*${pattern}*' } | ForEach-Object { Stop-Process -Id $_.ParentProcessId -Force; Stop-Process -Id $_.ProcessId -Force }"`;
      const cmd2 = `taskkill /F /FI "WINDOWTITLE eq ${scriptName}*"`;
      exec(cmd1, () => {
        exec(cmd2, () => {
          showToast({ style: Toast.Style.Success, title: `${scriptName} Closed` });
          const updated = activeWindows.filter((name) => name !== scriptName);
          setActiveWindows(updated);
          cache.set("activeWindows", JSON.stringify(updated));
          checkActiveWindows();
        });
      });
      return;
    }

    const ps1FileMap: Record<string, string> = {
      "Watch Logs": "watch-logs.ps1",
      "Import Workspaces": "ImportWorkspaces.ps1",
    };
    const ps1FileName = ps1FileMap[scriptName];
    if (!ps1FileName) return;
    const ps1Path = path.join(validatedPath, ps1FileName);
    const toast = await showToast({ style: Toast.Style.Animated, title: `Starting ${scriptName}...` });
    // Open a visible PowerShell window — no -Wait so it doesn't block
    const cmd = `powershell -NoProfile -Command "Start-Process powershell -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', '\\"${ps1Path}\\"' -WindowStyle Normal"`;
    exec(cmd, (error) => {
      if (error) {
        toast.style = Toast.Style.Failure;
        toast.title = `${scriptName} Failed`;
        toast.message = error.message;
      } else {
        toast.style = Toast.Style.Success;
        toast.title = `${scriptName} Started`;
        toast.message = "Check the open terminal window.";
        const updated = [...activeWindows, scriptName];
        setActiveWindows(updated);
        cache.set("activeWindows", JSON.stringify(updated));
        setTimeout(checkActiveWindows, 1000);
      }
    });
  };

  // ─── Error views ──────────────────────────────────────────────────────────

  if (errorMsg === "PreferenceRequired") {
    return (
      <Detail
        markdown={`# Server Manager\n\nConfigure the path to your \`server\` directory in extension settings.\n\n### Steps:\n1. Open Extension Preferences below\n2. Select your local \`server\` directory\n3. Return here`}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  if (errorMsg === "FolderDoesNotExist") {
    return (
      <Detail
        markdown={`# Server Folder Not Found\n\nThe configured path does not exist:\n\`\`\`\n${serverDir}\n\`\`\`\n\nUpdate the Server Directory path in settings.`}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  if (errorMsg && errorMsg.startsWith("MissingFiles:")) {
    const missing = errorMsg.split(":")[1];
    return (
      <Detail
        markdown={`# Missing Scripts\n\nRequired files not found:\n\`\`\`\n${missing}\n\`\`\`\n\nVerify the files in \`${serverDir}\` and try again.`}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  if (errorMsg) {
    return (
      <Detail
        markdown={`# Configuration Error\n\n\`\`\`\n${errorMsg}\n\`\`\`\n\nCheck your settings.`}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  // ─── Main UI ──────────────────────────────────────────────────────────────

  const isWatchLogsActive = activeWindows.includes("Watch Logs");
  const isImportWorkspacesActive = activeWindows.includes("Import Workspaces");

  const serverStatusLabel = !serverChecked
    ? "Checking..."
    : isStarting
      ? "Starting..."
      : isStopping
        ? "Stopping..."
        : isServerRunning
          ? "Running"
          : "Stopped";

  const serverStatusColor = !serverChecked
    ? Color.SecondaryText
    : isStarting || isStopping
      ? Color.Yellow
      : isServerRunning
        ? Color.Green
        : Color.Red;

  const serverStatusIcon = isServerRunning ? Icon.Livestream : Icon.LivestreamDisabled;

  return (
    <List searchBarPlaceholder="Filter tasks...">
      {/* ── SERVER STATUS SECTION ── */}
      <List.Section title="Bridge Server">
        <List.Item
          title="Server Status"
          subtitle={
            isServerRunning
              ? `v${health!.version} • ${health!.browsers} ${health!.browsers === 1 ? "browser" : "browsers"} connected`
              : "Not running"
          }
          icon={{ source: serverStatusIcon, tintColor: serverStatusColor }}
          accessories={[
            ...(isServerRunning && health ? [{ text: formatUptime(health.uptime), icon: Icon.Clock }] : []),
            { tag: { value: serverStatusLabel, color: serverStatusColor } },
          ]}
          actions={
            <ActionPanel>
              {!isServerRunning && !isStarting && (
                <Action
                  title="Start Server"
                  icon={{ source: Icon.Play, tintColor: Color.Green }}
                  onAction={handleStartServer}
                />
              )}
              {isServerRunning && (
                <Action
                  title="Stop Server"
                  icon={{ source: Icon.Stop, tintColor: Color.Orange }}
                  onAction={handleStopServer}
                />
              )}
              {isServerRunning && (
                <Action
                  title="Kill Server"
                  icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={handleKillServer}
                />
              )}
              <Action
                title="Refresh Status"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["ctrl"], key: "r" }}
                onAction={refreshHealth}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Start at Login"
          subtitle={loginStartup ? "Server launches automatically on Windows startup" : "Manual start only"}
          icon={{
            source: loginStartup ? Icon.CheckCircle : Icon.Circle,
            tintColor: loginStartup ? Color.Green : Color.SecondaryText,
          }}
          accessories={[
            {
              tag: {
                value: loginStartup ? "Enabled" : "Disabled",
                color: loginStartup ? Color.Green : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={loginStartup ? "Disable Login Startup" : "Enable Login Startup"}
                icon={{
                  source: loginStartup ? Icon.XMarkCircle : Icon.CheckCircle,
                  tintColor: loginStartup ? Color.Red : Color.Green,
                }}
                onAction={handleToggleLoginStartup}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {/* ── TOOLS SECTION ── */}
      <List.Section title="Tools">
        <List.Item
          title="Watch Bridge Logs"
          subtitle="Real-time WebSocket communication logs in a terminal window"
          keywords={["logs", "watch", "debug", "console", "terminal"]}
          icon={{ source: Icon.Terminal, tintColor: Color.Blue }}
          accessories={[
            ...(isWatchLogsActive ? [{ tag: { value: "Running", color: Color.Green } }] : [{ text: "Debug tool" }]),
          ]}
          actions={
            <ActionPanel>
              <Action
                title={isWatchLogsActive ? "Close" : "Open"}
                icon={isWatchLogsActive ? Icon.Stop : Icon.Play}
                onAction={() => handleRunScript("Watch Logs")}
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Import Edge Workspaces"
          subtitle="Import workspace tab configurations from Edge sync exports"
          keywords={["import", "workspaces", "sync", "edge"]}
          icon={{ source: Icon.Download, tintColor: Color.Purple }}
          accessories={[
            ...(isImportWorkspacesActive
              ? [{ tag: { value: "Running", color: Color.Green } }]
              : [{ text: "Edge only" }]),
          ]}
          actions={
            <ActionPanel>
              <Action
                title={isImportWorkspacesActive ? "Close" : "Run"}
                icon={isImportWorkspacesActive ? Icon.Stop : Icon.Play}
                onAction={() => handleRunScript("Import Workspaces")}
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
