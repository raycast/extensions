import { exec } from "child_process";
import { promisify } from "util";
import https from "https";
import fs from "fs";
import { IncomingMessage } from "http";

const execAsync = promisify(exec);

export interface NetbirdStatus {
  peers: {
    total: number;
    connected: number;
    details: Array<{
      fqdn: string;
      netbirdIp: string;
      publicKey: string;
      status: string;
      lastStatusUpdate: string;
      connectionType: string;
      iceCandidateType: {
        local: string;
        remote: string;
      };
      iceCandidateEndpoint: {
        local: string;
        remote: string;
      };
      relayAddress: string;
      lastWireguardHandshake: string;
      transferReceived: number;
      transferSent: number;
      latency: number;
      quantumResistance: boolean;
      networks: unknown;
    }>;
  };
  cliVersion: string;
  daemonVersion: string;
  management: {
    url: string;
    connected: boolean;
    error: string;
  };
  signal: {
    url: string;
    connected: boolean;
    error: string;
  };
  relays: {
    total: number;
    available: number;
    details: Array<{
      uri: string;
      available: boolean;
      error: string;
    }>;
  };
  netbirdIp: string;
  publicKey: string;
  usesKernelInterface: boolean;
  fqdn: string;
  quantumResistance: boolean;
  quantumResistancePermissive: boolean;
  networks: unknown;
  forwardingRules: number;
  dnsServers: Array<{
    servers: string[];
    domains: string[];
    enabled: boolean;
    error: string;
  }>;
  events: Array<{
    id: string;
    severity: string;
    category: string;
    message: string;
    userMessage: string;
    timestamp: string;
    metadata: unknown;
  }>;
  lazyConnectionEnabled: boolean;
  profileName: string;
  sshServer: {
    enabled: boolean;
    sessions: unknown[];
  };
}
const NETBIRD_BIN_PATHS = ["/usr/local/bin/netbird", "/usr/bin/netbird", "/opt/homebrew/bin/netbird"];
const NETBIRD_CONFIG_PATHS = ["/var/lib/netbird"];

async function getNetbirdBin(): Promise<string> {
  try {
    const { stdout } = await execAsync("which netbird");
    return stdout.trim();
  } catch {
    // Fallback to standard paths if `which` fails
    for (const path of NETBIRD_BIN_PATHS) {
      try {
        await execAsync(`test -f ${path}`);
        return path;
      } catch {
        // ignore
      }
    }

    throw new Error("NetBird binary not found. Please ensure NetBird is installed and in your PATH.");
  }
}

export function formatNetbirdError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("requires authentication") || message.includes("login")) {
    return "NetBird requires authentication. Run `netbird up` in the terminal to login.";
  }

  if (message.includes("network is unreachable") || message.includes("no internet connection")) {
    return "No internet connection detected. Please check your network.";
  }

  if (
    message.includes("is not running") ||
    message.includes("connection refused") ||
    message.includes("connect: no such file or directory")
  ) {
    return "NetBird daemon is not running. Start it in terminal or check the service.";
  }

  return message;
}

export async function getNetbirdStatus(): Promise<NetbirdStatus> {
  const bin = await getNetbirdBin();
  try {
    const { stdout } = await execAsync(`${bin} status --json`);
    return JSON.parse(stdout);
  } catch (error: unknown) {
    throw new Error(formatNetbirdError(error));
  }
}

export async function netbirdUp(): Promise<void> {
  const bin = await getNetbirdBin();
  try {
    const { stdout, stderr } = await execAsync(`${bin} up`);
    // Some successful executions might have misleading output or print to stderr
    if ((stderr && stderr.includes("Error:")) || stdout.includes("Error:")) {
      throw new Error(stderr || stdout);
    }
  } catch (error: unknown) {
    throw new Error(formatNetbirdError(error));
  }
}

export async function netbirdDown(): Promise<void> {
  const bin = await getNetbirdBin();
  try {
    await execAsync(`${bin} down`);
  } catch (error: unknown) {
    throw new Error(formatNetbirdError(error));
  }
}

export async function getAdminUrl(): Promise<string> {
  const config_filenames = ["active_profile.json", "default.json"];

  try {
    for (const folder_path of NETBIRD_CONFIG_PATHS) {
      for (const filename of config_filenames) {
        const fullPath = `${folder_path}/${filename}`;

        if (fs.existsSync(fullPath)) {
          try {
            const configContent = await fs.promises.readFile(fullPath, "utf-8");
            const config = JSON.parse(configContent);

            // check AdminURL first
            if (config.AdminURL) {
              if (typeof config.AdminURL === "string") {
                return config.AdminURL;
              } else if (config.AdminURL.Scheme && config.AdminURL.Host) {
                return `${config.AdminURL.Scheme}://${config.AdminURL.Host}`;
              }
            }

            // ManagementURL as fallback
            if (config.ManagementURL) {
              let url: string | undefined;

              if (typeof config.ManagementURL === "string") {
                url = config.ManagementURL;
              } else if (config.ManagementURL.Scheme && config.ManagementURL.Host) {
                url = `${config.ManagementURL.Scheme}://${config.ManagementURL.Host}`;
              }

              if (url && (url.includes("api.netbird.io") || url.includes("api.wiretrustee.com"))) {
                return "https://app.netbird.io";
              }
            }
          } catch {
            // ignore read/parse errors
          }
        }
      }
    }

    const status = await getNetbirdStatus();
    const managementUrl = status.management.url;

    // Default cloud URL
    if (managementUrl.includes("api.netbird.io") || managementUrl.includes("api.wiretrustee.com")) {
      return "https://app.netbird.io";
    }

    // For self-hosted, the dashboard is often at the same URL as the management service
    return managementUrl;
  } catch {
    return "https://app.netbird.io";
  }
}

async function getLatestRelease(): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(
        "https://api.github.com/repos/netbirdio/netbird/releases/latest",
        { headers: { "User-Agent": "Raycast-Extension" } },
        (res: IncomingMessage) => {
          let data = "";
          res.on("data", (chunk: unknown) => (data += String(chunk)));
          res.on("end", () => {
            try {
              const json = JSON.parse(data);
              resolve(json.tag_name.replace(/^v/, ""));
            } catch (e) {
              reject(e);
            }
          });
        },
      )
      .on("error", reject);
  });
}

export async function netbirdUpdate(): Promise<{ version: string; updated: boolean; latestVersion?: string }> {
  const status = await getNetbirdStatus();
  const currentVersion = status.daemonVersion;

  let latestVersion: string | undefined;
  try {
    latestVersion = await getLatestRelease();
  } catch {
    // ignore check failure
  }

  if (latestVersion && latestVersion === currentVersion) {
    return { version: currentVersion, updated: false, latestVersion };
  }

  // Try Brew first
  let updateTried = false;
  try {
    await execAsync("brew list netbird");
    updateTried = true;
    await execAsync("brew upgrade netbird");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // If brew upgrade failed but it's installed via brew (checked by brew list)
    if (updateTried && !message.includes("already installed")) {
      // Brew update failed
    }

    // If not installed via brew or brew failed, and we have a new version, try manual install script
    if (latestVersion && latestVersion !== currentVersion) {
      try {
        const installCmd = "curl -fsSL https://pkgs.netbird.io/install.sh | sh";
        const script = `do shell script "${installCmd}" with administrator privileges`;
        await execAsync(`osascript -e '${script}'`);
      } catch {
        // Manual update failed
      }
    }
  }

  const newStatus = await getNetbirdStatus();
  return {
    version: newStatus.daemonVersion,
    updated: newStatus.daemonVersion !== currentVersion,
    latestVersion,
  };
}
