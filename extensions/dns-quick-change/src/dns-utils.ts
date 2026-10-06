import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as net from "net";

export const execFileAsync = promisify(execFile);

export interface DNSPreset {
  name: string;
  servers: string;
  description?: string;
}

export interface NetworkInfo {
  service: string;
  manualDNS: string[];
  activeDNS: string[];
  isDHCP: boolean;
  isUnknown?: boolean;
}

export const PRESETS_FILE = `${os.homedir()}/.dns_presets`;
export const COMMAND_TIMEOUT_MS = 8000;
export const DEFAULT_NETWORK_SERVICE = "Wi-Fi";
export const DEFAULT_NETWORK_INTERFACE = "en0";

/**
 * Validate network service name against a safe pattern.
 * Prevents shell injection via service names with special characters while supporting
 * international/accented names and characters like '&' used in macOS service names.
 * Blocks shell metacharacters and control characters: ', ", `, $, \, ;, |, <, >, newlines
 */
export function validateNetworkServiceName(serviceName: string): boolean {
  if (!serviceName || typeof serviceName !== "string" || serviceName.length > 128) {
    return false;
  }
  if (/['"`$\\;|<>\n\r\0]|&&/.test(serviceName)) {
    return false;
  }
  return /^[\p{L}\p{N}\s\-_.&/()+,@]+$/u.test(serviceName);
}

/**
 * Validate comma-separated list of DNS servers.
 * Rejects empty strings, strings containing only commas or whitespace, and invalid IP addresses.
 */
export function validateServers(value: string | undefined): string | undefined {
  if (!value || value.trim().length === 0) return "At least one DNS server is required";
  const servers = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (servers.length === 0) return "At least one DNS server is required";
  for (const ip of servers) {
    if (!net.isIP(ip)) {
      return `Invalid IP: "${ip}"`;
    }
  }
  return undefined;
}

/**
 * Parse macOS network services output into service-name and BSD-interface pairs.
 */
export function parseNetworkServices(output: string): Array<{ service: string; device: string }> {
  const mappings: Array<{ service: string; device: string }> = [];
  let service: string | undefined;

  for (const line of output.split(/\r?\n/)) {
    const serviceMatch = line.match(/^\s*\(\d+\)\s+(.+)\s*$/);
    if (serviceMatch) {
      service = serviceMatch[1].trim();
      continue;
    }

    const deviceMatch = line.match(/^\s*\(Hardware Port: .*?, Device: ([^)]+)\)\s*$/);
    if (service && deviceMatch) {
      const device = deviceMatch[1].trim();
      if (validateNetworkServiceName(service) && /^[A-Za-z0-9._-]+$/.test(device)) {
        mappings.push({ service, device });
      }
      service = undefined;
    } else if (line.trim() === "" || line.startsWith("(*)")) {
      service = undefined;
    }
  }
  return mappings;
}

/**
 * Extract default route interface from `route -n get default` output.
 */
export function parseDefaultRouteInterface(routeOutput: string): string | undefined {
  return routeOutput.match(/^\s*interface:\s*(\S+)/m)?.[1];
}

/**
 * Parse active non-tunnel network interfaces from `scutil --nwi` output.
 */
export function parseNwiActiveInterfaces(nwiOutput: string): string[] {
  const match = nwiOutput.match(/Network interfaces:\s*([^\n]+)/);
  if (!match) return [];
  return match[1]
    .trim()
    .split(/\s+/)
    .filter((dev) => !/^(utun|ppp|ipsec|gif|stf|bridge)/i.test(dev));
}

/**
 * Select the active network service based on the detected route interface
 * and active devices with fallback for VPN tunnels and unmapped interfaces.
 */
export function selectActiveNetworkService(
  services: Array<{ service: string; device: string }>,
  routeIface?: string,
  activeDevices?: string[],
): { service: string; device: string } {
  // If route interface is not a virtual tunnel (utun, ppp, ipsec, etc.), try direct match
  if (routeIface && !/^(utun|ppp|ipsec|gif|stf)/i.test(routeIface)) {
    const direct = services.find((entry) => entry.device === routeIface);
    if (direct) {
      return direct;
    }
  }

  // Prefer scutil's interface order. The underlying adapter is listed before other
  // connected devices, which may appear earlier in the network service list.
  if (activeDevices && activeDevices.length > 0) {
    for (const device of activeDevices) {
      const activeMatch = services.find((entry) => entry.device === device);
      if (activeMatch) {
        return activeMatch;
      }
    }
  }

  // Fallback: Skip virtual tunnel interfaces (utun, ppp, ipsec, bridge) and pick first physical adapter
  const physical = services.find((entry) => !/^(utun|ppp|ipsec|gif|stf|bridge)/i.test(entry.device));
  if (physical) {
    return physical;
  }

  if (services.length > 0) {
    return services[0];
  }

  return { service: DEFAULT_NETWORK_SERVICE, device: DEFAULT_NETWORK_INTERFACE };
}

/**
 * Asynchronously retrieve macOS network services and BSD interface mappings.
 */
export async function getNetworkServices(
  exec: typeof execFileAsync = execFileAsync,
): Promise<Array<{ service: string; device: string }>> {
  try {
    const { stdout } = await exec("/usr/sbin/networksetup", ["-listnetworkserviceorder"], {
      encoding: "utf-8",
      timeout: COMMAND_TIMEOUT_MS,
    });
    return parseNetworkServices(stdout);
  } catch (error) {
    console.error("Unable to list network services:", error);
    return [];
  }
}

/**
 * Asynchronously detect the network service attached to the default route.
 * Handles VPN/tunnel fallback gracefully by inspecting active network interfaces.
 */
export async function getActiveNetworkService(
  exec: typeof execFileAsync = execFileAsync,
): Promise<{ service: string; device: string }> {
  let iface: string | undefined;
  try {
    const { stdout: route } = await exec("/sbin/route", ["-n", "get", "default"], {
      encoding: "utf-8",
      timeout: COMMAND_TIMEOUT_MS,
    });
    iface = parseDefaultRouteInterface(route);
  } catch (error) {
    console.error("Unable to inspect default route:", error);
  }

  let activeDevices: string[] = [];

  // When default route is missing or pointing to a virtual tunnel, query scutil --nwi for active physical adapters
  if (!iface || /^(utun|ppp|ipsec|gif|stf)/i.test(iface)) {
    try {
      const { stdout: nwi } = await exec("/usr/sbin/scutil", ["--nwi"], {
        encoding: "utf-8",
        timeout: COMMAND_TIMEOUT_MS,
      });
      activeDevices = parseNwiActiveInterfaces(nwi);
    } catch (error) {
      console.error("Unable to query scutil --nwi:", error);
    }
  }

  const services = await getNetworkServices(exec);

  // If activeDevices is still empty, verify candidate physical services with ifconfig for active status or IP
  if (activeDevices.length === 0) {
    const physicalServices = services.filter((s) => !/^(utun|ppp|ipsec|gif|stf|bridge)/i.test(s.device));
    for (const service of physicalServices) {
      try {
        const { stdout: ifconfigOut } = await exec("/sbin/ifconfig", [service.device], {
          encoding: "utf-8",
          timeout: 2000,
        });
        // An unplugged adapter can still hold a link-local address. Require an active
        // link, or a routable address, before treating it as the one in use.
        if (/status:\s*inactive/i.test(ifconfigOut)) {
          continue;
        }
        const hasActiveStatus = /status:\s*active/i.test(ifconfigOut);
        const hasRoutableInet = /\binet\s+(?!169\.254\.)\d/.test(ifconfigOut);
        if (hasActiveStatus || hasRoutableInet) {
          activeDevices.push(service.device);
          break;
        }
      } catch {
        // Continue checking other candidates
      }
    }
  }

  return selectActiveNetworkService(services, iface, activeDevices);
}

/**
 * Asynchronously resolve the BSD interface for a configured network service.
 */
export async function getNetworkInterfaceForService(
  serviceName: string,
  exec: typeof execFileAsync = execFileAsync,
): Promise<string | undefined> {
  try {
    const services = await getNetworkServices(exec);
    return services.find((entry) => entry.service === serviceName)?.device;
  } catch (error) {
    console.error("Unable to map network service to interface:", error);
    return undefined;
  }
}

// Default descriptions for known presets — used to migrate old files
export const DEFAULT_DESCRIPTIONS: { [name: string]: string } = {
  cloudflare: "Cloudflare - Fast & private, no logging",
  google: "Google - Reliable & global",
  quad9: "Quad9 - Malware & phishing protection",
  opendns: "OpenDNS - Filtering & protection",
  adguard: "AdGuard - Blocks ads & trackers",
  control_d: "Control D - Malware & ad blocking",
};

export const DEFAULT_PRESETS = `# DNS Presets Configuration
# Format: name=servers:description (servers is a comma-separated list of IPs; description is optional)

cloudflare=1.1.1.1,1.0.0.1:Cloudflare - Fast & private, no logging
google=8.8.8.8,8.8.4.4:Google - Reliable & global
quad9=9.9.9.9,149.112.112.112:Quad9 - Malware & phishing protection
opendns=208.67.222.222,208.67.220.220:OpenDNS - Filtering & protection
adguard=94.140.14.14,94.140.15.15:AdGuard - Blocks ads & trackers
control_d=76.76.2.2,76.76.10.2:Control D - Malware & ad blocking
`;

/**
 * Parse a preset line: name=servers[:description]
 * Correctly distinguishes IPv6 colons from the optional trailing description delimiter,
 * and preserves descriptions containing commas or colons.
 */
export function parsePresetLine(line: string): DNSPreset | null {
  line = line.trim();
  if (!line || line.startsWith("#")) return null;

  const eqIndex = line.indexOf("=");
  if (eqIndex === -1) return null;

  const name = line.substring(0, eqIndex).trim();
  const rest = line.substring(eqIndex + 1).trim();

  // Validate preset name (no spaces or equals signs allowed)
  if (!name || !/^[^\s=]+$/.test(name) || !rest) {
    return null;
  }

  // If all comma-separated parts in rest are already valid IPs, there is no description
  const rawParts = rest
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (rawParts.length > 0 && rawParts.every((ip) => Boolean(net.isIP(ip)))) {
    return { name, servers: rawParts.join(","), description: undefined };
  }

  // Otherwise, there is a description separated by a colon: servers:description
  // The description itself may contain colons or commas (e.g., "Office: primary, secondary").
  // Find all colons in rest where the prefix before the colon is a valid comma-separated list of IPs.
  let bestCandidate: { servers: string; description?: string } | null = null;

  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === ":") {
      const candidateServers = rest.substring(0, i).trim();
      const candidateDesc = rest.substring(i + 1).trim();
      const serverParts = candidateServers
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (serverParts.length > 0 && serverParts.every((ip) => Boolean(net.isIP(ip)))) {
        // In case an IPv6 address has a valid IPv6 prefix before one of its internal colons,
        // pick the candidate with the longest candidateServers to select the full address before description.
        if (!bestCandidate || candidateServers.length > bestCandidate.servers.length) {
          bestCandidate = {
            servers: serverParts.join(","),
            description: candidateDesc || undefined,
          };
        }
      }
    }
  }

  if (bestCandidate) {
    return { name, servers: bestCandidate.servers, description: bestCandidate.description };
  }

  return null;
}

/**
 * Initialize presets file if it doesn't exist.
 */
export function initializePresets(): void {
  if (fs.existsSync(PRESETS_FILE)) return;

  try {
    fs.writeFileSync(PRESETS_FILE, DEFAULT_PRESETS, { mode: 0o600 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("Error creating default presets file:", error);
    throw new Error(`Could not create DNS presets file ${PRESETS_FILE}: ${detail}`);
  }
}

/**
 * Get all presets from ~/.dns_presets
 */
export function getPresets(): DNSPreset[] {
  initializePresets();

  try {
    const content = fs.readFileSync(PRESETS_FILE, "utf-8");
    const presets: DNSPreset[] = [];
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const preset = parsePresetLine(line);
      if (preset) {
        presets.push(preset);
      }
    }

    return presets;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return [];
    }
    const detail = error instanceof Error ? error.message : String(error);
    console.error("Error reading presets file:", error);
    throw new Error(`Could not read saved DNS presets from ${PRESETS_FILE}: ${detail}`);
  }
}

/**
 * Get a specific preset by name
 */
export function getPreset(name: string): string | null {
  const presets = getPresets();
  const found = presets.find((p) => p.name === name);
  return found ? found.servers : null;
}

/**
 * Add or update a preset in ~/.dns_presets
 */
export function addPreset(name: string, servers: string, description?: string): void {
  initializePresets();

  try {
    const content = fs.readFileSync(PRESETS_FILE, "utf-8");
    const lines = content.split(/\r?\n/);
    let updated = false;

    const newLines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;

      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) return line;

      const presetName = trimmed.substring(0, eqIndex).trim();
      if (presetName === name) {
        updated = true;
        return description ? `${name}=${servers}:${description}` : `${name}=${servers}`;
      }
      return line;
    });

    if (!updated) {
      const lastLine = newLines[newLines.length - 1];
      if (lastLine && lastLine.trim() !== "") {
        newLines.push("");
      }
      newLines.push(description ? `${name}=${servers}:${description}` : `${name}=${servers}`);
    }

    fs.writeFileSync(PRESETS_FILE, newLines.join("\n"), { mode: 0o600 });
  } catch (error) {
    console.error("Error saving preset:", error);
    throw new Error(`Failed to save preset: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete a preset from ~/.dns_presets
 */
export function deletePreset(name: string): void {
  initializePresets();

  try {
    const content = fs.readFileSync(PRESETS_FILE, "utf-8");
    const lines = content.split(/\r?\n/);

    const newLines = lines.filter((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return true;

      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) return true;

      const presetName = trimmed.substring(0, eqIndex).trim();
      return presetName !== name;
    });

    fs.writeFileSync(PRESETS_FILE, newLines.join("\n"), { mode: 0o600 });
  } catch (error) {
    console.error("Error deleting preset:", error);
    throw new Error(`Failed to delete preset: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse raw scutil --dns output into distinct IP addresses.
 */
export function parseActiveDNS(output: string): string[] {
  const nameservers = new Set<string>();
  const lines = output.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/nameserver\[\d+\]\s*:\s*([^\s]+)/);
    if (match && net.isIP(match[1])) {
      nameservers.add(match[1]);
    }
  }
  return Array.from(nameservers);
}

/**
 * Parse raw networksetup -getdnsservers output into distinct IP addresses.
 */
export function parseManualDNS(output: string): string[] {
  if (
    !output ||
    output.includes("aren't any DNS Servers set") ||
    output.toLowerCase().includes("there aren't any") ||
    output.trim() === ""
  ) {
    return [];
  }

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => Boolean(line) && !line.startsWith("*") && net.isIP(line) !== 0);
}

/**
 * Asynchronously get manually configured DNS servers (empty if using DHCP, null if query failed).
 */
export async function getManualDNS(
  service: string,
  exec: typeof execFileAsync = execFileAsync,
): Promise<string[] | null> {
  try {
    const { stdout } = await exec("/usr/sbin/networksetup", ["-getdnsservers", service], {
      encoding: "utf-8",
      timeout: COMMAND_TIMEOUT_MS,
    });
    return parseManualDNS(stdout);
  } catch (error) {
    console.error("Unable to get manual DNS servers:", error);
    return null;
  }
}

/**
 * Asynchronously get active DNS servers (including DHCP-assigned).
 */
export async function getActiveDNS(exec: typeof execFileAsync = execFileAsync): Promise<string[]> {
  try {
    const { stdout } = await exec("/usr/sbin/scutil", ["--dns"], {
      encoding: "utf-8",
      timeout: COMMAND_TIMEOUT_MS,
    });
    return parseActiveDNS(stdout);
  } catch (error) {
    console.error("Unable to get active DNS:", error);
    return [];
  }
}

/**
 * Asynchronously get network interface details (IP, subnet, gateway, MAC).
 */
export async function getNetworkInterfaceDetails(
  service: string,
  device?: string,
  exec: typeof execFileAsync = execFileAsync,
): Promise<{ [key: string]: string }> {
  const details: { [key: string]: string } = {};

  try {
    const ipinfoPromise = exec("/usr/sbin/networksetup", ["-getinfo", service], {
      encoding: "utf-8",
      timeout: COMMAND_TIMEOUT_MS,
    }).catch((err) => {
      console.error("networksetup -getinfo failed:", err);
      return null;
    });

    const targetDevice = device ?? (await getNetworkInterfaceForService(service, exec)) ?? DEFAULT_NETWORK_INTERFACE;
    const ifconfigPromise = exec("/sbin/ifconfig", [targetDevice], {
      encoding: "utf-8",
      timeout: COMMAND_TIMEOUT_MS,
    }).catch((err) => {
      console.error("ifconfig failed:", err);
      return null;
    });

    const [ipinfoRes, ifconfigRes] = await Promise.all([ipinfoPromise, ifconfigPromise]);

    if (ipinfoRes?.stdout) {
      ipinfoRes.stdout.split(/\r?\n/).forEach((line) => {
        const match = line.match(/^([^:]+):\s*(.*)$/);
        if (match) {
          const [, key, value] = match;
          if (value.trim()) {
            details[key.trim()] = value.trim();
          }
        }
      });
    }

    if (ifconfigRes?.stdout) {
      const mac = ifconfigRes.stdout.match(/\bether\s+([\da-f:]+)/i)?.[1];
      if (mac) {
        details["MAC Address"] = mac;
      }
    }
  } catch (error) {
    console.error("Error retrieving network interface details:", error);
  }

  return details;
}

/**
 * Asynchronously get complete network information.
 */
export async function getNetworkInfo(
  service: string,
  exec: typeof execFileAsync = execFileAsync,
): Promise<NetworkInfo> {
  const [manualDNS, activeDNS] = await Promise.all([getManualDNS(service, exec), getActiveDNS(exec)]);
  const isUnknown = manualDNS === null;
  const isDHCP = manualDNS !== null && manualDNS.length === 0;

  return {
    service,
    manualDNS: manualDNS ?? [],
    activeDNS,
    isDHCP,
    isUnknown,
  };
}

/**
 * Run a command with admin privileges via the native macOS auth dialog asynchronously.
 * This uses AppleScript's `do shell script ... with administrator privileges` which
 * triggers the system authorization UI. On modern macOS versions and settings this
 * will present Touch ID or password. Running asynchronously prevents freezing the Raycast UI.
 */
export async function runWithAdmin(command: string, exec: typeof execFileAsync = execFileAsync): Promise<void> {
  const b64 = Buffer.from(command, "utf8").toString("base64");
  const script = `do shell script "echo '${b64}' | base64 -D | sh" with administrator privileges`;
  try {
    await exec("/usr/bin/osascript", ["-e", script], {
      encoding: "utf-8",
      timeout: 60000,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("(-128)") || message.includes("User canceled")) {
      throw new Error("DNS change canceled by user");
    }
    throw error;
  }
}

/**
 * Set DNS to specific servers (supports IPv4 and IPv6).
 */
export async function setDNS(
  servers: string[],
  service = DEFAULT_NETWORK_SERVICE,
  exec: typeof execFileAsync = execFileAsync,
): Promise<void> {
  if (!validateNetworkServiceName(service)) {
    throw new Error(`Invalid network service name: "${service}". Service name may have been tampered with.`);
  }

  for (const ip of servers) {
    if (!net.isIP(ip)) {
      throw new Error(`Invalid IP address: "${ip}". Preset file may have been tampered with.`);
    }
  }

  const networksetup = "/usr/sbin/networksetup";
  const flushCmd = "(/usr/bin/dscacheutil -flushcache; /usr/bin/killall -HUP mDNSResponder 2>/dev/null || true)";

  if (servers.length === 0) {
    // Reset to DHCP and flush cache - if networksetup fails, do not mask exit code
    await runWithAdmin(`${networksetup} -setdnsservers '${service}' empty && ${flushCmd}`, exec);
  } else {
    const dnsArgs = servers.map((s) => `'${s}'`).join(" ");
    await runWithAdmin(`${networksetup} -setdnsservers '${service}' ${dnsArgs} && ${flushCmd}`, exec);
  }
}

/**
 * Set DNS from a preset.
 */
export async function setDNSFromPreset(
  presetName: string,
  service = DEFAULT_NETWORK_SERVICE,
  exec: typeof execFileAsync = execFileAsync,
): Promise<void> {
  const servers = getPreset(presetName);
  if (!servers) {
    throw new Error(`Preset "${presetName}" not found`);
  }

  const serverArray = servers.split(",").map((s) => s.trim());
  await setDNS(serverArray, service, exec);
}

/**
 * Reset DNS to DHCP.
 */
export async function resetDNS(
  service = DEFAULT_NETWORK_SERVICE,
  exec: typeof execFileAsync = execFileAsync,
): Promise<void> {
  await setDNS([], service, exec);
}
