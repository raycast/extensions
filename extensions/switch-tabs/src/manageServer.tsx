import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  Detail,
  Color,
  Cache,
  environment,
  confirmAlert,
  Alert,
  popToRoot,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import fs from "fs";
import path from "path";
import https from "https";
import crypto from "crypto";
import { exec, spawn } from "child_process";

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVER_EXE_NAME = "raycast-bridge-server.exe";
const HEALTH_URL = "http://127.0.0.1:19222/health";
const SHUTDOWN_URL = "http://127.0.0.1:19222/shutdown";
const LOGIN_REG_KEY = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
const LOGIN_REG_NAME = "RaycastBridgeServer";

const RELEASE_BASE = "https://github.com/ferrocyante/Manage-Server/releases/download/v1";

const ASSETS: { name: string; url: string; sha256?: string }[] = [
  {
    name: SERVER_EXE_NAME,
    url: `${RELEASE_BASE}/raycast-bridge-server.exe`,
    sha256: "C588D30F034D6F4A6D5CB23125B8A56F24380B4EC82808760CE021701E69F5B5",
  },
  {
    name: "watch-logs.ps1",
    url: `${RELEASE_BASE}/watch-logs.ps1`,
  },
  {
    name: "ImportWorkspaces.ps1",
    url: `${RELEASE_BASE}/ImportWorkspaces.ps1`,
  },
];

// ─── Paths (always under environment.supportPath) ─────────────────────────────

const supportPath = environment.supportPath;
const exePath = path.join(supportPath, SERVER_EXE_NAME);

// ─── Download Helper ──────────────────────────────────────────────────────────

function downloadFile(url: string, dest: string, redirectCount = 0): Promise<void> {
  if (redirectCount > 5) return Promise.reject(new Error("Too many redirects"));

  return new Promise<void>((resolve, reject) => {
    const tmp = dest + ".download";
    const file = fs.createWriteStream(tmp);

    file.on("error", (err) => {
      file.close();
      fs.unlink(tmp, () => reject(err));
    });

    const req = https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlink(tmp, () => {
          const loc = res.headers.location!;
          if (!loc.startsWith("https://")) {
            reject(new Error(`Redirect to non-HTTPS blocked: ${loc}`));
            return;
          }
          resolve(downloadFile(loc, dest, redirectCount + 1));
        });
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(tmp, () => reject(new Error(`HTTP ${res.statusCode}`)));
        return;
      }
      res.pipe(file);
      file.on("finish", () =>
        file.close(() => {
          try {
            fs.renameSync(tmp, dest);
            resolve();
          } catch (renameErr) {
            reject(renameErr);
          }
        }),
      );
    });

    req.on("error", (err) => {
      file.close();
      fs.unlink(tmp, () => reject(err));
    });
  });
}

function verifySha256(filePath: string, expected: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => {
      const actual = hash.digest("hex").toUpperCase();
      if (actual === expected.toUpperCase()) {
        resolve();
      } else {
        reject(new Error(`Checksum mismatch.\nExpected: ${expected}\nGot:      ${actual}`));
      }
    });
  });
}

async function ensureAssets(): Promise<void> {
  if (!fs.existsSync(supportPath)) {
    fs.mkdirSync(supportPath, { recursive: true });
  }

  for (const asset of ASSETS) {
    const dest = path.join(supportPath, asset.name);
    const exists = fs.existsSync(dest);

    // For the exe, also verify checksum to catch corrupt/outdated binaries
    if (exists && asset.sha256) {
      try {
        await verifySha256(dest, asset.sha256);
        continue; // verified OK
      } catch {
        // checksum failed — re-download
        fs.unlinkSync(dest);
      }
    } else if (exists) {
      continue; // ps1 files — just check existence
    }

    await downloadFile(asset.url, dest);

    if (asset.sha256) {
      await verifySha256(dest, asset.sha256);
    }
  }
}

// ─── Server Control Helpers ───────────────────────────────────────────────────

interface HealthResponse {
  status: string;
  version: string;
  browsers: number;
  uptime: number;
}

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

function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const child = spawn(exePath, [], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      });
      child.unref();
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

function enableLoginStartup(): Promise<void> {
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
  const cache = new Cache();

  const cachedActive = cache.get("activeWindows");
  const initialActive = cachedActive ? JSON.parse(cachedActive) : [];
  const cachedHealth = cache.get("lastHealth");
  const cachedLogin = cache.get("lastLoginStartup");
  const initialHealth: HealthResponse | null = cachedHealth ? JSON.parse(cachedHealth) : null;
  const initialLogin: boolean = cachedLogin === "true";

  // Download state — seed assetsReady from cache so returning users skip the init screen
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState("");
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [assetsReady, setAssetsReady] = useState(() => cache.get("assetsReady") === "true");

  const [activeWindows, setActiveWindows] = useState<string[]>(initialActive);
  const [health, setHealth] = useState<HealthResponse | null>(initialHealth);
  const [serverChecked, setServerChecked] = useState(initialHealth !== null);
  const [loginStartup, setLoginStartup] = useState<boolean>(initialLogin);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const isServerRunning = health !== null;

  // ─── Asset download on mount ──────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await ensureAssets();
        if (!cancelled) {
          cache.set("assetsReady", "true");
          setAssetsReady(true);
        }
        return;
      } catch {
        // Need to download — only show loading UI if not already cached as ready
      }

      if (cancelled) return;
      setIsDownloading(true);
      setDownloadMsg("Downloading server files...");

      try {
        await ensureAssets();
        if (!cancelled) {
          cache.set("assetsReady", "true");
          setAssetsReady(true);
          setIsDownloading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setDownloadError(err instanceof Error ? err.message : String(err));
          setIsDownloading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Health polling ───────────────────────────────────────────────────────

  const refreshHealth = useCallback(async () => {
    const result = await checkHealth();
    setHealth(result);
    setServerChecked(true);
    if (result) {
      cache.set("lastHealth", JSON.stringify(result));
    } else {
      cache.remove("lastHealth");
    }
  }, []);

  useEffect(() => {
    if (!assetsReady) return;
    refreshHealth();
    checkLoginStartup().then((val) => {
      setLoginStartup(val);
      cache.set("lastLoginStartup", String(val));
    });
    const interval = setInterval(refreshHealth, 3000);
    return () => clearInterval(interval);
  }, [assetsReady, refreshHealth]);

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
    if (!assetsReady) return;
    checkActiveWindows();
    const interval = setInterval(checkActiveWindows, 2000);
    return () => clearInterval(interval);
  }, [assetsReady, checkActiveWindows]);

  // ─── Server actions ───────────────────────────────────────────────────────

  const handleStartServer = async () => {
    setIsStarting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Starting server..." });
    try {
      await startServer();
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
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating startup setting..." });
    try {
      if (loginStartup) {
        await disableLoginStartup();
        setLoginStartup(false);
        cache.set("lastLoginStartup", "false");
        toast.style = Toast.Style.Success;
        toast.title = "Removed from login startup";
      } else {
        await enableLoginStartup();
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

    const ps1Path = path.join(supportPath, ps1FileName);
    const toast = await showToast({ style: Toast.Style.Animated, title: `Starting ${scriptName}...` });
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

  // ─── Download / error views ───────────────────────────────────────────────

  if (downloadError) {
    return (
      <Detail
        markdown={`# Download Failed\n\nCould not download server files:\n\`\`\`\n${downloadError}\n\`\`\`\n\nCheck your internet connection and try again.`}
        actions={
          <ActionPanel>
            <Action
              title="Retry Download"
              icon={Icon.RotateClockwise}
              onAction={() => {
                setDownloadError(null);
                setIsDownloading(true);
                setDownloadMsg("Retrying download...");
                ensureAssets()
                  .then(() => {
                    setAssetsReady(true);
                    setIsDownloading(false);
                  })
                  .catch((err) => {
                    setDownloadError(err instanceof Error ? err.message : String(err));
                    setIsDownloading(false);
                  });
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (isDownloading) {
    return (
      <Detail markdown={`# Setting Up Bridge Server\n\n${downloadMsg}\n\nThis only happens once. Please wait...`} />
    );
  }

  if (!assetsReady) {
    return <Detail markdown="# Initializing..." />;
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
            </ActionPanel>
          }
        />
        <List.Item
          title="Clean Up Extension Data"
          subtitle="Remove all server files, workspace data, and cached state"
          keywords={["clean", "reset", "uninstall", "remove", "delete", "purge"]}
          icon={{ source: Icon.Trash, tintColor: Color.Red }}
          accessories={[{ text: "Irreversible" }]}
          actions={
            <ActionPanel>
              <Action
                title="Clean up All Data"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                style={Action.Style.Destructive}
                onAction={async () => {
                  const confirmed = await confirmAlert({
                    title: "Clean Up All Extension Data?",
                    message:
                      "This will delete the server exe, scripts, workspace data, and all cached state. The server will be stopped. This cannot be undone.",
                    icon: { source: Icon.Trash, tintColor: Color.Red },
                    primaryAction: {
                      title: "Clean Up",
                      style: Alert.ActionStyle.Destructive,
                    },
                  });
                  if (!confirmed) return;

                  const toast = await showToast({ style: Toast.Style.Animated, title: "Cleaning Up..." });
                  try {
                    // 1. Stop server first if running
                    await stopServer();
                    await new Promise((r) => setTimeout(r, 500));
                    await killServer();

                    // 2. Remove all files in supportPath
                    if (fs.existsSync(supportPath)) {
                      for (const file of fs.readdirSync(supportPath)) {
                        try {
                          fs.unlinkSync(path.join(supportPath, file));
                        } catch {
                          /* best effort */
                        }
                      }
                    }

                    // 3. Clear all Raycast cache keys we own
                    const CACHE_KEYS = [
                      "assetsReady",
                      "lastHealth",
                      "lastLoginStartup",
                      "activeWindows",
                      "browser_bridge_skinny_cache",
                      "workspaces_roster_cache",
                      "browser_filter",
                      "window_filters",
                      "browser_bridge_collapsed",
                      "manual_search_mode",
                    ];
                    for (const key of CACHE_KEYS) {
                      try {
                        cache.remove(key);
                      } catch {
                        /* best effort */
                      }
                    }

                    // 4. Remove login startup registry entry
                    await disableLoginStartup().catch(() => {});

                    toast.style = Toast.Style.Success;
                    toast.title = "Cleaned Up";
                    toast.message = "All extension data removed.";
                    setAssetsReady(false);
                    setHealth(null);
                    setLoginStartup(false);
                    await popToRoot({ clearSearchBar: true });
                  } catch (err) {
                    toast.style = Toast.Style.Failure;
                    toast.title = "Cleanup failed";
                    toast.message = err instanceof Error ? err.message : String(err);
                  }
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
