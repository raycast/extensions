import {
  showHUD,
  showToast,
  Toast,
  environment,
  launchCommand,
  LaunchType,
  open,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { spawn, execSync } from "child_process";
import { join } from "path";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs";

export interface Track {
  title: string;
  artist: string;
  isPlaying: boolean;
  playingFrom: string;
  currentTime: string;
  duration: string;
  isLiked: boolean;
  isShuffled: boolean;
  repeatMode: "off" | "all" | "one";
  timestamp?: number;
  receivedAt?: string;
}

export interface ServerStatus {
  startTime: string;
  requestCount: number;
  lastTrackUpdate: string | null;
  lastCommandSent: string | null;
  chromeConnected: boolean;
  raycastConnected: boolean;
  uptime: number;
  currentTrack: Track | null;
  pendingCommandsCount: number;
  port: number;
  pid: number;
}

export type ServerConnectionStatus = "connected" | "disconnected" | "connecting";

const API_BASE_URL = "http://localhost:3049";
const REQUEST_TIMEOUT = 1000;
const PID_FILE_NAME = "server.pid";

const SERVER_SCRIPT_CONTENT = `
const http = require("http")
const fs = require("fs")
const path = require("path")

const PORT = 3049
const PID_FILE = path.join(__dirname, "server.pid")

let currentTrackData = null
const pendingCommands = []
const serverStats = {
  startTime: new Date(),
  requestCount: 0,
  lastTrackUpdate: null,
  lastCommandSent: null,
  chromeConnected: false,
  raycastConnected: false,
  pid: process.pid,
}

const AUTH_TOKEN = process.env.LOCAL_API_AUTH_TOKEN;
if (!AUTH_TOKEN) {
    console.error("FATAL: LOCAL_API_AUTH_TOKEN environment variable not set. Server cannot start securely.");
    process.exit(1);
}

try {
  fs.writeFileSync(PID_FILE, process.pid.toString())
} catch (error) {
  console.error('Failed to write PID file:', error);
}

function setCORSHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ""
    req.on("data", (chunk) => {
      body += chunk.toString()
    })
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (error) {
        reject(new Error("Invalid JSON body"))
      }
    })
    req.on("error", (err) => {
      reject(err)
    })
  })
}

const server = http.createServer(async (req, res) => {
  serverStats.requestCount++
  const parsedUrl = new URL(req.url, \`http://localhost:\${PORT}\`)
  const pathname = parsedUrl.pathname
  const method = req.method

  setCORSHeaders(res)
  if (method === "OPTIONS") {
    res.writeHead(200)
    res.end()
    return
  }

  if (!(pathname === "/" && method === "GET")) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized: Missing or invalid Authorization header" }));
        return;
    }
    const requestToken = authHeader.split(' ')[1];
    if (requestToken !== AUTH_TOKEN) {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Forbidden: Invalid token" }));
        return;
    }
  }

  try {
    if (pathname === "/" && method === "GET") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(\`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tidal Raycast API Server</title>
    <style>
      body {
        font-family: system-ui, sans-serif;
        margin: 0;
        background: #f2f2f7;
        color: #1c1c1e;
        line-height: 1.6;
      }
      .container {
        max-width: 700px;
        margin: 4rem auto;
        padding: 2rem;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
      }
      h1 {
        color: #007aff;
        font-size: 1.8rem;
        margin-bottom: 1rem;
      }
      h2 {
        margin-top: 2rem;
        color: #444;
      }
      p {
        margin-bottom: 1rem;
      }
      ul {
        padding-left: 1.2rem;
      }
      li {
        margin-bottom: 0.5rem;
      }
      code {
        background: #f1f1f1;
        padding: 0.2rem 0.4rem;
        border-radius: 4px;
        font-family: monospace;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Tidal Raycast API Server</h1>
      <p>This server connects your <strong>Raycast</strong> and <strong>Chrome</strong> extensions for a smooth Tidal experience.</p>

      <h2>Endpoints</h2>
      <ul>
        <li><code>POST /track-data</code> — Send track info from Chrome</li>
        <li><code>GET /current-track</code> — Get current track in Raycast</li>
        <li><code>POST /send-command</code> — Send a control command from Raycast</li>
        <li><code>GET /get-command</code> — Chrome polls for the next command</li>
        <li><code>GET /status</code> — View server status and metrics</li>
        <li><code>GET /health</code> — Quick server health check</li>
      </ul>

      <h2>Authentication</h2>
      <p>All API requests (except this page) require a <code>Bearer Token</code> in the <code>Authorization</code> header. Set this in your Raycast preferences.</p>

      <h2>Tips</h2>
      <ul>
        <li>To stop the server, run <strong>"Stop Server"</strong> in Raycast.</li>
        <li>Need help? Run <strong>"Setup Guide"</strong> in Raycast for setup instructions.</li>
      </ul>
    </div>
  </body>
  </html>
\`);
    } else if (pathname === "/track-data" && method === "POST") {
      const trackData = await parseBody(req)
      currentTrackData = { ...trackData, receivedAt: new Date().toISOString() }
      serverStats.lastTrackUpdate = new Date()
      serverStats.chromeConnected = true
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ status: "success", message: "Track data received" }))
    } else if (pathname === "/get-command" && method === "GET") {
      serverStats.chromeConnected = true
      if (pendingCommands.length > 0) {
        const command = pendingCommands.shift()
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify(command))
      } else {
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ status: "no-commands" }))
      }
    } else if (pathname === "/current-track" && method === "GET") {
      serverStats.raycastConnected = true
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(currentTrackData || { status: "no-data" }))
    } else if (pathname === "/send-command" && method === "POST") {
      const command = await parseBody(req)
      command.timestamp = Date.now()
      command.id = Math.random().toString(36).substr(2, 9)
      pendingCommands.push(command)
      serverStats.lastCommandSent = new Date()
      serverStats.raycastConnected = true
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ status: "success", message: "Command queued" }))
    } else if (pathname === "/status" && method === "GET") {
      const status = {
        ...serverStats,
        uptime: Date.now() - serverStats.startTime.getTime(),
        currentTrack: currentTrackData,
        pendingCommandsCount: pendingCommands.length,
        port: PORT,
      }
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(status, null, 2))
    } else if (pathname === "/health" && method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ status: "healthy", timestamp: new Date().toISOString(), pid: process.pid }))
    } else {
      res.writeHead(404, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "Not found", path: pathname }))
    }
  } catch (error) {
    console.error(\`Request error: \${error.message} for \${method} \${pathname}\`)
    res.writeHead(500, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: "Internal server error", message: error.message }))
  }
})

server.on("error", (err) => {
  console.error(\`Server error: \${err.message}\`)
  if (err.code === "EADDRINUSE") {
    console.error(\`Port \${PORT} is already in use. Another server instance might be running.\`)
    process.exit(1)
  }
})

server
  .listen(PORT, () => {
    console.log(\`Server listening on port \${PORT}\`);
  })
  .on("error", (err) => {
    console.error(\`Failed to listen on port \${PORT}: \${err.message}\`)
    process.exit(1)
  })

function gracefulShutdown() {
  server.close(() => {
    try {
      if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE)
      }
    } catch (error) {
      console.error('Error removing PID file on shutdown:', error);
    }
    process.exit(0)
  })

  setTimeout(() => {
    process.exit(1)
  }, 5000)
}

process.on("SIGINT", gracefulShutdown)
process.on("SIGTERM", gracefulShutdown)

process.on("uncaughtException", (error, origin) => {
  console.error(\`Uncaught exception: \${error.message} at \${origin}]\`)
  console.error(error)
  process.exit(1)
})

process.on("unhandledRejection", (reason, promise) => {
  console.error(\`Unhandled rejection at promise: \${promise}, reason: \${reason}\`)
  console.error(reason)
})

setInterval(() => {
  const now = Date.now()
  if (serverStats.lastTrackUpdate && now - serverStats.lastTrackUpdate.getTime() > 15000) {
    serverStats.chromeConnected = false
  }
}, 5000)
`;

export const log = (message: string, level: "info" | "error" | "warn" = "info") => {
  console.log(`[TIDAL] [${level.toUpperCase()}] ${message}`);
};

const getAuthHeaders = (): Record<string, string> => {
  const { localApiAuthToken } = getPreferenceValues<{ localApiAuthToken: string }>();
  if (!localApiAuthToken) {
    const errorMessage = "Auth token not found in Raycast preferences.";
    log(errorMessage, "error");
    throw new Error(errorMessage);
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localApiAuthToken}`,
  };
};

export const getCurrentTrack = async (): Promise<Track | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/current-track`, {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (response.ok) {
      const data = (await response.json()) as Track | { status: string };
      if ("status" in data && data.status === "no-data") {
        return null;
      }
      return data as Track;
    }
    if (response.status === 401 || response.status === 403) {
      log("Authentication failed when getting current track.", "error");
    }
    return null;
  } catch (error) {
    log(`Failed to get current track: ${error}`, "error");
    return null;
  }
};

export const sendCommand = async (action: string, serverStatus?: ServerConnectionStatus): Promise<boolean> => {
  if (serverStatus && serverStatus !== "connected") {
    showToast({
      style: Toast.Style.Failure,
      title: "Not Connected",
      message: "Server connection lost",
    });
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/send-command`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ action }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (response.ok) {
      log(`Command sent: ${action}`);
      return true;
    } else {
      const errorText = await response.text();
      throw new Error(`Command failed: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    log(`Command error: ${error}`, "error");
    showToast({
      style: Toast.Style.Failure,
      title: "Command Failed",
      message: String(error),
    });
    return false;
  }
};

export const getServerStatus = async (): Promise<ServerStatus | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/status`, {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (response.ok) {
      return (await response.json()) as ServerStatus;
    }
    return null;
  } catch (error) {
    log(`Failed to get server status: ${error}`, "error");
    return null;
  }
};

export const checkServerHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });
    return response.ok;
  } catch (error) {
    log(`Health check failed: ${error}`, "error");
    return false;
  }
};

export const refreshData = async (): Promise<{
  track: Track;
  hasRealData: boolean;
  serverStatus: ServerConnectionStatus;
}> => {
  try {
    const headers = getAuthHeaders();
    const healthResponse = await fetch(`${API_BASE_URL}/health`, {
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status}`);
    }

    const trackResponse = await fetch(`${API_BASE_URL}/current-track`, {
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (trackResponse.ok) {
      const trackData = (await trackResponse.json()) as Track | { status: string };

      if ("status" in trackData && trackData.status === "no-data") {
        return {
          track: {
            title: "No Track Playing",
            artist: "Open Tidal and play a song",
            isPlaying: false,
            playingFrom: "",
            currentTime: "0:00",
            duration: "0:00",
            isLiked: false,
            isShuffled: false,
            repeatMode: "off",
          },
          hasRealData: false,
          serverStatus: "connected",
        };
      } else if ("title" in trackData && trackData.title && trackData.title !== "Unknown") {
        const dataAge = Date.now() - (trackData.timestamp || 0);
        if (dataAge < 600000) {
          return {
            track: trackData as Track,
            hasRealData: true,
            serverStatus: "connected",
          };
        } else {
          return {
            track: {
              title: "Stale Data",
              artist: `Chrome inactive? (${Math.round(dataAge / 1000)}s)`,
              isPlaying: false,
              playingFrom: "",
              currentTime: "0:00",
              duration: "0:00",
              isLiked: false,
              isShuffled: false,
              repeatMode: "off",
            },
            hasRealData: false,
            serverStatus: "connected",
          };
        }
      }
    }

    return {
      track: {
        title: "Loading...",
        artist: "Connecting...",
        isPlaying: false,
        playingFrom: "",
        currentTime: "0:00",
        duration: "0:00",
        isLiked: false,
        isShuffled: false,
        repeatMode: "off",
      },
      hasRealData: false,
      serverStatus: "connected",
    };
  } catch (error) {
    log(`Refresh error: ${error} (is the server down??)`, "error");
    return {
      track: {
        title: "Connection Error",
        artist: "Server not responding or auth failed",
        isPlaying: false,
        playingFrom: "",
        currentTime: "0:00",
        duration: "0:00",
        isLiked: false,
        isShuffled: false,
        repeatMode: "off",
      },
      hasRealData: false,
      serverStatus: "disconnected",
    };
  }
};

export const createCommandHandler = (
  action: string,
  serverStatus: ServerConnectionStatus,
  refreshCallback: () => void,
) => {
  return async () => {
    const success = await sendCommand(action, serverStatus);
    if (success) {
      setTimeout(refreshCallback, 200);
    }
  };
};

export const showServerStatusCmd = async () => {
  try {
    await launchCommand({ name: "server-status", type: LaunchType.UserInitiated });
  } catch (error) {
    log(`Failed to open server status: ${error}`, "error");
    await showToast({ style: Toast.Style.Failure, title: "Failed to Open Status" });
  }
};

export const editPreferencesCmd = async () => {
  try {
    await openExtensionPreferences();
  } catch (error) {
    log(`Failed to open preferences: ${error}`, "error");
    await showToast({ style: Toast.Style.Failure, title: "Failed to Open Preferences" });
  }
};

export const showDocsCmd = async () => {
  try {
    await open("https://github.com/Ek2100/tidal/blob/main/raycast/README.md");
  } catch (error) {
    log(`Failed to open documentation: ${error}`, "error");
    await showToast({ style: Toast.Style.Failure, title: "Failed to Open Documentation" });
  }
};

export const manualStartServer = async (refreshCallback: () => void) => {
  try {
    await launchCommand({ name: "start-server", type: LaunchType.Background });
    setTimeout(refreshCallback, 2000);
  } catch (error) {
    await showHUD("❌ Failed to start server");
    log(`Failed to start server: ${error}`, "error");
  }
};

export const manualStopServer = async () => {
  try {
    await launchCommand({ name: "stop-server", type: LaunchType.Background });
  } catch (error) {
    await showHUD("❌ Failed to stop server");
    log(`Failed to stop server: ${error}`, "error");
  }
};

const findNodePath = (): string => {
  const possiblePaths = [
    "/usr/local/bin/node",
    "/opt/homebrew/bin/node",
    "/usr/bin/node",
    "/bin/node",
    process.execPath,
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      log(`Found Node.js at: ${path}`);
      return path;
    }
  }

  try {
    const nodePath = execSync("which node", { encoding: "utf8" }).trim();
    if (nodePath && existsSync(nodePath)) {
      log(`Found Node.js via 'which': ${nodePath}`);
      return nodePath;
    }
  } catch (error) {
    log(`'which node' failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  log("Could not find Node.js path, falling back to 'node'");
  return "node";
};

export const startServer = async (): Promise<boolean> => {
  const serverDir = environment.supportPath;
  const serverPath = join(serverDir, "server.js");
  const pidPath = join(serverDir, PID_FILE_NAME);

  log(`Server dir: ${serverDir}`);
  log(`Server path: ${serverPath}`);
  log(`PID file path: ${pidPath}`);

  const { localApiAuthToken } = getPreferenceValues<{ localApiAuthToken: string }>();
  if (!localApiAuthToken) {
    await showHUD("❌ Auth Token is not set in preferences!");
    log("Auth token is missing from preferences. Cannot start server.", "error");
    return false;
  }

  if (!existsSync(serverPath)) {
    try {
      writeFileSync(serverPath, SERVER_SCRIPT_CONTENT);
      log("Created server.js file");
    } catch (error) {
      log(`Failed to create server.js: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  const nodePath = findNodePath();

  if (existsSync(pidPath)) {
    try {
      const pid = readFileSync(pidPath, "utf8").trim();
      log(`Found PID file with PID: ${pid}`);
      try {
        execSync(`ps -p ${pid} -o comm=`);
        log(`Server process ${pid} seems to be running.`);
        manualStopServer();
        return true;
      } catch (e) {
        log(`Process ${pid} not running: ${e instanceof Error ? e.message : String(e)}`);
        writeFileSync(pidPath, "");
      }
    } catch (err) {
      log(`Error reading PID file: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  try {
    const healthResponse = await fetch(`${API_BASE_URL}/health`, {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(500),
    });
    if (healthResponse.ok) {
      const healthData = (await healthResponse.json()) as HealthStatusResponse;
      log(`Server already healthy on port 3049 (PID: ${healthData.pid}).`);
      await showHUD(`✅ Server already running (PID: ${healthData.pid})`);
      if (!existsSync(pidPath) || readFileSync(pidPath, "utf8").trim() !== String(healthData.pid)) {
        writeFileSync(pidPath, String(healthData.pid));
        log(`Updated PID file with PID: ${healthData.pid}`);
      }
      return true;
    }
  } catch (e) {
    log(`Health check failed: ${e instanceof Error ? e.message : String(e)}`, "warn");
  }

  log(`Attempting to start server using Node.js at: ${nodePath}`);
  try {
    const serverProcess = spawn(nodePath, [serverPath], {
      detached: true,
      stdio: "ignore",
      cwd: serverDir,
      env: {
        ...process.env,
        LOCAL_API_AUTH_TOKEN: localApiAuthToken,
        PATH: process.env.PATH || "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin",
      },
    });
    serverProcess.unref();
    log(`Server process spawned with PID: ${serverProcess.pid}`);

    if (serverProcess.pid) {
      writeFileSync(pidPath, serverProcess.pid.toString());
      log(`Wrote new PID ${serverProcess.pid} to ${pidPath}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 2500));

    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) {
        const data = (await response.json()) as HealthStatusResponse;
        log(`Server started successfully (PID: ${data.pid}).`);
        await showHUD(`✅ Server started (PID: ${data.pid})`);
        return true;
      } else {
        throw new Error(`Server responded with ${response.status}`);
      }
    } catch (err) {
      log(`Server health check failed after start: ${err instanceof Error ? err.message : String(err)}`);
      await showHUD(`❌ Server failed to start. Node.js: ${nodePath}`);
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Error spawning server process: ${errorMessage}`);
    await showHUD(`❌ Failed to start server: ${errorMessage}`);
    return false;
  }
};

interface HealthStatusResponse {
  status: string;
  timestamp: string;
  pid: number;
}

export const stopServer = async (): Promise<boolean> => {
  const serverDir = environment.supportPath;
  const pidPath = join(serverDir, PID_FILE_NAME);

  log(`Attempting to stop server. PID file path: ${pidPath}`);

  let pidToKill: number | null = null;
  let initialPidFromFile: string | null = null;

  const checkServerHealthAndGetPid = async (): Promise<number | null> => {
    try {
      const healthResponse = await fetch(`${API_BASE_URL}/health`, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(500),
      });
      if (healthResponse.ok) {
        const data = (await healthResponse.json()) as HealthStatusResponse;
        if (data && typeof data.pid === "number") {
          return data.pid;
        }
      }
    } catch (e) {
      log(`Health check failed: ${e instanceof Error ? e.message : String(e)}`, "warn");
    }
    return null;
  };

  if (existsSync(pidPath)) {
    try {
      initialPidFromFile = readFileSync(pidPath, "utf8").trim();
      if (initialPidFromFile) {
        pidToKill = parseInt(initialPidFromFile);
        log(`Found PID file with PID: ${pidToKill}`);
      } else {
        log("PID file is empty.");
      }
    } catch (err) {
      log(`Error reading PID file: ${err instanceof Error ? err.message : String(err)}.`, "warn");
    }
  } else {
    log("PID file not found.");
  }

  if (pidToKill === null) {
    log("No PID from file. Checking server health endpoint for active PID.");
    pidToKill = await checkServerHealthAndGetPid();
    if (pidToKill) {
      log(`Found active server PID from health endpoint: ${pidToKill}`);
    } else {
      log("Server not detected as running via health endpoint. Nothing to stop.", "warn");
      await showHUD("⚠️ Server not running");
      return false;
    }
  }

  try {
    log(`Attempting to send SIGTERM to PID: ${pidToKill}`);
    process.kill(pidToKill, "SIGTERM");
    log(`Sent SIGTERM to PID: ${pidToKill}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    log(
      `Error sending SIGTERM to PID ${pidToKill}: ${
        error instanceof Error ? error.message : String(error)
      }. Process might not exist or already stopped.`,
      "warn",
    );
  }

  const finalRunningPid = await checkServerHealthAndGetPid();

  if (finalRunningPid === null) {
    log("Server stopped successfully (final health check failed).");
    await showHUD("✅ Server stopped");
    if (existsSync(pidPath)) {
      try {
        unlinkSync(pidPath);
        log("PID file removed.");
      } catch (unlinkErr) {
        log(`Error removing PID file: ${unlinkErr instanceof Error ? unlinkErr.message : String(unlinkErr)}`, "error");
      }
    }
    const serverPath = join(serverDir, "server.js");
    if (existsSync(serverPath)) {
      try {
        unlinkSync(serverPath);
        log("server.js file removed.");
      } catch (unlinkErr) {
        log(
          `Error removing server.js file: ${unlinkErr instanceof Error ? unlinkErr.message : String(unlinkErr)}`,
          "error",
        );
      }
    }
    return true;
  } else {
    let message = `❌ Server still running (PID: ${finalRunningPid}).`;
    if (initialPidFromFile && finalRunningPid === parseInt(initialPidFromFile)) {
      message += ` Original PID ${initialPidFromFile} is still active.`;
    } else if (initialPidFromFile && finalRunningPid !== parseInt(initialPidFromFile)) {
      message += ` New PID ${finalRunningPid} detected, original PID ${initialPidFromFile} might have been replaced.`;
    } else {
      message += ` No original PID file found.`;
    }
    log(message, "error");
    await showHUD(message);
    return false;
  }
};

export const formatUptime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

export const getRepeatIcon = (repeatMode: Track["repeatMode"]) => {
  switch (repeatMode) {
    case "one":
      return "ArrowClockwise";
    case "all":
      return "Repeat";
    default:
      return "MinusCircle";
  }
};

export const getRepeatTitle = (repeatMode: Track["repeatMode"]) => {
  switch (repeatMode) {
    case "one":
      return "Repeat: One";
    case "all":
      return "Repeat: All";
    default:
      return "Repeat: Off";
  }
};

export const getServerIcon = (serverStatus: ServerConnectionStatus) => {
  switch (serverStatus) {
    case "connected":
      return "CheckCircle";
    case "connecting":
      return "Clock";
    default:
      return "XMarkCircle";
  }
};

export const getMenubarTitle = (hasRealData: boolean, currentTrack: Track, serverStatus: ServerConnectionStatus) => {
  if (hasRealData && currentTrack.title !== "Loading..." && currentTrack.title !== "No Track Playing") {
    return `${currentTrack.title.substring(0, 25)}${currentTrack.title.length > 25 ? "..." : ""}`;
  }

  switch (serverStatus) {
    case "connected":
      return "Tidal";
    case "connecting":
      return "Loading...";
    default:
      return "Offline";
  }
};
