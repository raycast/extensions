import { exec } from "child_process";
import { promisify } from "util";
import { open, getPreferenceValues } from "@raycast/api";

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

  if (message.includes("failed to connect to daemon") || message.includes("context deadline exceeded")) {
    return "NetBird daemon is not running. Run `netbird service install` and `netbird service start`.";
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

export interface NetbirdNetworkRoute {
  id: string;
  /**
   * Display label for the route in UI:
   * - network routes: CIDR (e.g. `10.0.0.0/24`)
   * - domain routes: domains list (e.g. `app.example.com, *.example.com`)
   */
  route: string | null;
  selected: boolean;
}

function shellEscapeSingleQuotes(value: string): string {
  // Shell-safe quoting for `child_process.exec` commands.
  // Example: "Default Subnet" -> 'Default Subnet'
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function parseNetbirdNetworksList(output: string): NetbirdNetworkRoute[] {
  if (/no networks available/i.test(output) || /no routes available/i.test(output)) {
    return [];
  }

  const routes: NetbirdNetworkRoute[] = [];
  const lines = output.split(/\r?\n/);

  let current: { id: string; route: string | null; selected?: boolean } | null = null;

  for (const line of lines) {
    const idMatch = /^\s*-\s*ID:\s*(.+)\s*$/.exec(line);
    if (idMatch) {
      if (current) {
        routes.push({
          id: current.id,
          route: current.route,
          selected: current.selected ?? false,
        });
      }

      current = {
        id: idMatch[1].trim(),
        route: null,
      };
      continue;
    }

    if (!current) continue;

    const networkOrDomainsMatch = /^\s*(Network|Domains):\s*(.+)\s*$/.exec(line);
    if (networkOrDomainsMatch) {
      current.route = networkOrDomainsMatch[2].trim();
      continue;
    }

    const statusMatch = /^\s*Status:\s*(Selected|Not Selected)\s*$/.exec(line);
    if (statusMatch) {
      current.selected = statusMatch[1] === "Selected";
      continue;
    }
  }

  if (current) {
    routes.push({
      id: current.id,
      route: current.route,
      selected: current.selected ?? false,
    });
  }

  return routes;
}

export async function getNetbirdNetworks(): Promise<NetbirdNetworkRoute[]> {
  const bin = await getNetbirdBin();
  try {
    const { stdout } = await execAsync(`${bin} networks list`);
    return parseNetbirdNetworksList(stdout);
  } catch (error: unknown) {
    throw new Error(formatNetbirdError(error));
  }
}

export async function netbirdNetworksSelect(id: string): Promise<void> {
  const bin = await getNetbirdBin();
  try {
    await execAsync(`${bin} networks select ${shellEscapeSingleQuotes(id)}`);
  } catch (error: unknown) {
    throw new Error(formatNetbirdError(error));
  }
}

export async function netbirdNetworksDeselect(id: string): Promise<void> {
  const bin = await getNetbirdBin();
  try {
    await execAsync(`${bin} networks deselect ${shellEscapeSingleQuotes(id)}`);
  } catch (error: unknown) {
    throw new Error(formatNetbirdError(error));
  }
}

/**
 * Tries to determine the NetBird admin dashboard URL using netbird status command or preferences.
 * Using management URL as last fallback.
 *
 * @returns full admin url
 */
export async function getAdminUrl(): Promise<string> {
  const prefs = getPreferenceValues<Preferences>();
  if (prefs.adminUrl) {
    return prefs.adminUrl;
  }

  try {
    const status = await getNetbirdStatus();
    const managementUrl = status.management.url;

    // Default cloud URL
    if (managementUrl.includes("api.netbird.io") || managementUrl.includes("api.wiretrustee.com")) {
      return "https://app.netbird.io";
    }

    // For self-hosted, the dashboard is often at the same URL as the management service
    // if it is not, it can be changed in command settings
    return managementUrl;
  } catch {
    return "https://app.netbird.io";
  }
}

/**
 * Polls getNetbirdStatus until the daemon responds or the timeout elapses.
 * Used after service restart to wait for the daemon to come back online.
 */
async function waitForDaemon(maxWaitMs = 5000, intervalMs = 500): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      await getNetbirdStatus();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  // Daemon didn't respond in time — non-fatal, caller handles serviceRestarted flag.
}

/**
 * Tries to update NetBird.
 *
 * @returns update info
 */
export async function netbirdUpdate(
  onPhase?: (phase: "checking" | "upgrading" | "restarting") => void | Promise<void>,
): Promise<{ version: string; updated: boolean; serviceRestarted: boolean }> {
  await onPhase?.("checking");

  const env = { ...process.env, PATH: `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin` };

  // Check if netbird exist and if new version is available
  const brewBefore = (await execAsync("brew list --versions netbird", { env })).stdout.trim();
  const brewVersionBefore = brewBefore.split(/\s+/)[1] ?? "";
  if (!brewVersionBefore) {
    throw new Error("NetBird is not installed via Homebrew. We can't update it automatically.");
  }

  const outdated = (await execAsync("brew outdated netbird", { env })).stdout.trim();
  if (!outdated) {
    return { version: brewVersionBefore, updated: false, serviceRestarted: false };
  }

  await onPhase?.("upgrading");
  await execAsync("brew upgrade netbird", { env });

  const brewVersion = (await execAsync("brew list --versions netbird", { env })).stdout.trim().split(/\s+/)[1] ?? "";
  const updated = brewVersionBefore !== brewVersion;

  if (!updated) {
    return { version: brewVersionBefore, updated: false, serviceRestarted: false };
  }

  let serviceRestarted = false;
  const bin = await getNetbirdBin();
  const safeBin = bin.replace(/'/g, "'\\''");
  const restartPath = "/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:/usr/local/bin";

  try {
    await onPhase?.("restarting");
    // Try sudo -n first (no password prompt). If it fails, fall back to an AppleScript
    // administrator prompt. See https://github.com/raycast/extensions/pull/10995
    await execAsync(`osascript -e 'do shell script "PATH=${restartPath}; sudo -n ${safeBin} service restart"'`);
    await waitForDaemon();
    serviceRestarted = true;
  } catch (error) {
    console.error("Failed to restart NetBird service (sudo -n):", error);
    try {
      await execAsync(
        `osascript -e 'do shell script "PATH=${restartPath}; ${safeBin} service restart" with administrator privileges'`,
      );
      await waitForDaemon();
      serviceRestarted = true;
    } catch (fallbackError) {
      console.error("Failed to restart NetBird service (admin prompt):", fallbackError);
    }
  }

  return { version: brewVersion, updated, serviceRestarted };
}
