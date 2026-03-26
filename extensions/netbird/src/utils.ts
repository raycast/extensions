import { exec } from "child_process";
import { promisify } from "util";
import https from "https";
import fs from "fs";
import { IncomingMessage } from "http";
import { open } from "@raycast/api";

const execAsync = promisify(exec);

/**
 * Type for NetBird status json output. Interface is used in order to avoid errors with
 * fields added in the future.
 * @link https://docs.netbird.io/get-started/cli
 */
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
/** Default paths for the NetBird binary */
const NETBIRD_BIN_PATHS = ["/usr/local/bin/netbird", "/usr/bin/netbird", "/opt/homebrew/bin/netbird"];

/** Default paths for netbird config (from version 55+) */
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

/**
 * Formatting errors to be user friendly
 *
 * @param error error recieved
 * @returns formatted string
 */
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

/**
 * Fetches NetBird status from `netbird status --json command`
 *
 * @returns netbird status
 */
export async function getNetbirdStatus(): Promise<NetbirdStatus> {
  const bin = await getNetbirdBin();
  try {
    const { stdout } = await execAsync(`${bin} status --json`);
    return JSON.parse(stdout);
  } catch (error: unknown) {
    throw new Error(formatNetbirdError(error));
  }
}

/**
 * Estabilishes netbird connection or throws formatted error.
 */
export async function netbirdUp(): Promise<void> {
  const bin = await getNetbirdBin();

  // we need to return explicit Promise in order to read live output from child process
  return new Promise((resolve, reject) => {
    const child = exec(`${bin} up`, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(formatNetbirdError(error)));
        return;
      }
      if ((stderr && stderr.includes("Error:")) || stdout.includes("Error:")) {
        reject(new Error(stderr || stdout));
        return;
      }
      resolve();
    });

    let urlOpened = false;
    child.stdout?.on("data", (data) => {
      const output = data.toString();
      if (
        !urlOpened &&
        (output.includes("Please do the SSO login in your browser") || output.includes("use this URL to log in"))
      ) {
        const match = output.match(/(https:\/\/[^\s]+)/);
        if (match) {
          urlOpened = true;
          open(match[1]);
        }
      }
    });
  });
}

/**
 * Disconnects with NetBird or throws formatted error.
 */
export async function netbirdDown(): Promise<void> {
  const bin = await getNetbirdBin();
  try {
    await execAsync(`${bin} down`);
  } catch (error: unknown) {
    throw new Error(formatNetbirdError(error));
  }
}

/**
 * Tries to determine the NetBird admin dashboard URL using config files. Using management URL as last fallback.
 *
 * @returns full admin url
 */
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

/**
 * Tries to update NetBird.
 *
 * @returns update info
 */
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

  const env = { ...process.env, PATH: `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin` };

  try {
    await execAsync("brew list netbird", { env });
  } catch (e) {
    console.log(e);
    throw new Error("NetBird is not installed via Homebrew. We can't update it automatically.");
  }

  let didUpgrade = false;
  try {
    await execAsync("brew upgrade netbird", { env });
    didUpgrade = true;
  } catch (error) {
    console.log(error);
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("already installed")) {
      throw error;
    }
  }

  if (didUpgrade) {
    const bin = await getNetbirdBin();
    try {
      await execAsync(
        `osascript -e 'do shell script "${bin} service uninstall && ${bin} service install && ${bin} service start" with administrator privileges'`,
      );
    } catch (error) {
      console.error("Failed to restart NetBird service:", error);
    }
  }

  const newStatus = await getNetbirdStatus();
  return {
    version: newStatus.daemonVersion,
    updated: newStatus.daemonVersion !== currentVersion,
    latestVersion,
  };
}
