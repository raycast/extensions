import {
  ActionPanel,
  List,
  Action,
  Icon,
  Color,
  Keyboard,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Form,
  getPreferenceValues,
  openExtensionPreferences,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as net from "net";

const execFileAsync = promisify(execFile);

// Preferences type is auto-generated in raycast-env.d.ts — no manual interface needed.

interface DNSPreset {
  name: string;
  servers: string;
  description?: string;
}

interface NetworkInfo {
  service: string;
  manualDNS: string[];
  activeDNS: string[];
  isDHCP: boolean;
}

const PRESETS_FILE = `${os.homedir()}/.dns_presets`;

// Module-level placeholders; populated during startup network detection.
let NETWORK_SERVICE = "Wi-Fi";
let NETWORK_INTERFACE = "en0";

const COMMAND_TIMEOUT_MS = 8000;

/**
 * Validate network service name against a safe pattern.
 * Prevents shell injection via service names with special characters.
 * Allows alphanumeric, hyphens, spaces, forward slashes, dots, and parentheses (valid in macOS service names).
 * Blocks shell-sensitive characters: ', ", `, $, \, ;, &, |, <, >
 */
export function validateNetworkServiceName(serviceName: string): boolean {
  return /^[\w\- /().]+$/.test(serviceName);
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
      // Clear dangling service state on empty lines or disabled service blocks
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

  // If active devices are known from connectivity checks, pick the matching physical service
  if (activeDevices && activeDevices.length > 0) {
    const activeMatch = services.find((entry) => activeDevices.includes(entry.device));
    if (activeMatch) {
      return activeMatch;
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

  return { service: "Wi-Fi", device: "en0" };
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
        if (/status:\s*active/i.test(ifconfigOut) || /\binet\s+\d/.test(ifconfigOut)) {
          activeDevices.push(service.device);
          break;
        }
      } catch {
        // Continue checking other candidates
      }
    }
  }

  const chosen = selectActiveNetworkService(services, iface, activeDevices);
  NETWORK_INTERFACE = chosen.device;
  NETWORK_SERVICE = chosen.service;
  return chosen;
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
const DEFAULT_DESCRIPTIONS: { [key: string]: string } = {
  cloudflare: "Cloudflare - Fast & Privacy",
  quad9: "Quad9 - Blocks malware & phishing",
  opendns: "OpenDNS - Filtering & protection",
};

// No Touch ID / passwordless sudo code kept — keep extension safe for sharing

/**
 * Initialize presets file with default presets if it doesn't exist
 */
function initPresetsFile(): void {
  if (!fs.existsSync(PRESETS_FILE)) {
    const defaultPresets = `# DNS Presets
# Format: name=servers:description
# Example: cloudflare=1.1.1.1,1.0.0.1:Fast DNS with privacy
cloudflare=1.1.1.1,1.0.0.1:Cloudflare - Fast & Privacy
quad9=9.9.9.9,149.112.112.112:Quad9 - Blocks malware & phishing
opendns=208.67.222.222,208.67.220.220:OpenDNS - Filtering & protection
`;
    fs.writeFileSync(PRESETS_FILE, defaultPresets, { mode: 0o600 });
  }
}

/**
 * Parse a preset line: name=servers[:description]
 * Correctly distinguishes IPv6 colons from the optional trailing description delimiter.
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
    return null; // Skip invalid preset names
  }

  // If all comma-separated parts in rest are already valid IPs, there is no description
  const rawParts = rest
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (rawParts.length > 0 && rawParts.every((ip) => Boolean(net.isIP(ip)))) {
    return { name, servers: rawParts.join(","), description: undefined };
  }

  // Otherwise, the last part contains `<last-ip>:<description>`.
  const commaIndex = rest.lastIndexOf(",");
  const prefix = commaIndex !== -1 ? rest.substring(0, commaIndex).trim() : "";
  const lastPart = commaIndex !== -1 ? rest.substring(commaIndex + 1).trim() : rest;

  if (prefix) {
    const prefixIps = prefix
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!prefixIps.every((ip) => Boolean(net.isIP(ip)))) {
      return null;
    }
  }

  let foundServers: string | null = null;
  let foundDescription: string | undefined = undefined;

  // Search for the colon separating the last valid IP from description from right to left
  for (let i = lastPart.length - 1; i >= 0; i--) {
    if (lastPart[i] === ":") {
      const candidateIp = lastPart.substring(0, i).trim();
      const candidateDesc = lastPart.substring(i + 1).trim();
      if (net.isIP(candidateIp)) {
        foundServers = prefix ? `${prefix},${candidateIp}` : candidateIp;
        foundDescription = candidateDesc || undefined;
        break;
      }
    }
  }

  if (!foundServers) {
    return null;
  }

  return { name, servers: foundServers, description: foundDescription };
}

/**
 * Migrate old presets file to add descriptions if missing
 */
function migratePresetsFile(): void {
  if (!fs.existsSync(PRESETS_FILE)) return;

  const content = fs.readFileSync(PRESETS_FILE, "utf-8");
  const lines = content.split("\n");
  let needsUpdate = false;

  const updatedLines = lines.map((line) => {
    const preset = parsePresetLine(line);
    if (!preset) return line; // Keep comments and blank lines as-is

    // If preset has no description and we have a default, add it
    if (!preset.description && DEFAULT_DESCRIPTIONS[preset.name]) {
      needsUpdate = true;
      return `${preset.name}=${preset.servers}:${DEFAULT_DESCRIPTIONS[preset.name]}`;
    }
    return line;
  });

  if (needsUpdate) {
    fs.writeFileSync(PRESETS_FILE, updatedLines.join("\n"), { mode: 0o600 });
  }
}

/**
 * Get all DNS presets
 */
function getPresets(): DNSPreset[] {
  initPresetsFile();
  migratePresetsFile();

  const content = fs.readFileSync(PRESETS_FILE, "utf-8");
  const presets: DNSPreset[] = [];

  content.split("\n").forEach((line) => {
    const preset = parsePresetLine(line);
    if (preset) presets.push(preset);
  });

  return presets;
}

/**
 * Get a specific preset by name
 */
function getPreset(name: string): string | null {
  const presets = getPresets();
  const preset = presets.find((p) => p.name === name);
  return preset ? preset.servers : null;
}

/**
 * Add or update a preset
 */
function addPreset(name: string, servers: string, description?: string): void {
  initPresetsFile();

  const content = fs.readFileSync(PRESETS_FILE, "utf-8");
  const lines = content.split("\n");

  // Format the preset line
  const presetLine = description ? `${name}=${servers}:${description}` : `${name}=${servers}`;

  // Find and replace if exists
  let found = false;
  const updatedLines = lines.map((line) => {
    const preset = parsePresetLine(line);
    if (preset && preset.name === name) {
      found = true;
      return presetLine;
    }
    return line;
  });

  if (!found) {
    updatedLines.push(presetLine);
  }

  fs.writeFileSync(PRESETS_FILE, updatedLines.join("\n"), { mode: 0o600 });
}

/**
 * Delete a preset
 */
function deletePreset(name: string): void {
  initPresetsFile();

  const content = fs.readFileSync(PRESETS_FILE, "utf-8");
  const lines = content.split("\n");

  const filtered = lines.filter((line) => {
    const preset = parsePresetLine(line);
    if (!preset) return true; // Keep comments and blank lines
    return preset.name !== name;
  });

  fs.writeFileSync(PRESETS_FILE, filtered.join("\n"), { mode: 0o600 });
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
 * Asynchronously get manually configured DNS servers (empty if using DHCP).
 */
export async function getManualDNS(service: string, exec: typeof execFileAsync = execFileAsync): Promise<string[]> {
  try {
    const { stdout } = await exec("/usr/sbin/networksetup", ["-getdnsservers", service], {
      encoding: "utf-8",
      timeout: COMMAND_TIMEOUT_MS,
    });
    return parseManualDNS(stdout);
  } catch (error) {
    console.error("Unable to get manual DNS servers:", error);
    return [];
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

    const targetDevice = device ?? (await getNetworkInterfaceForService(service, exec)) ?? "en0";
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
  const isDHCP = manualDNS.length === 0;

  return {
    service,
    manualDNS,
    activeDNS,
    isDHCP,
  };
}

/**
 * Run a command with admin privileges via the native macOS auth dialog asynchronously.
 * This uses AppleScript's `do shell script ... with administrator privileges` which
 * triggers the system authorization UI. On modern macOS versions and settings this
 * will present Touch ID or password. Running asynchronously prevents freezing the Raycast UI.
 */
export async function runWithAdmin(command: string, exec: typeof execFileAsync = execFileAsync): Promise<void> {
  // Encode the command to base64 to avoid shell quoting/escaping issues.
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
 * Set DNS to specific servers (supports IPv4 and IPv6)
 */
export async function setDNS(
  servers: string[],
  service = NETWORK_SERVICE,
  exec: typeof execFileAsync = execFileAsync,
): Promise<void> {
  // Validate network service name (prevents shell injection via preferences)
  if (!validateNetworkServiceName(service)) {
    throw new Error(`Invalid network service name: "${service}". Service name may have been tampered with.`);
  }

  // Validate all IPs before execution (defense in depth - prevents shell injection)
  for (const ip of servers) {
    if (!net.isIP(ip)) {
      throw new Error(`Invalid IP address: "${ip}". Preset file may have been tampered with.`);
    }
  }

  // Use absolute paths since `do shell script` has a minimal PATH
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
 * Set DNS from a preset
 */
async function setDNSFromPreset(presetName: string, service = NETWORK_SERVICE): Promise<void> {
  const servers = getPreset(presetName);
  if (!servers) {
    throw new Error(`Preset "${presetName}" not found`);
  }

  const serverArray = servers.split(",").map((s) => s.trim());
  await setDNS(serverArray, service);
}

/**
 * Reset DNS to DHCP
 */
async function resetDNS(service = NETWORK_SERVICE): Promise<void> {
  await setDNS([], service);
}

/**
 * List view showing all network interface info — press Enter on any row to copy.
 */
function NetworkDetailsView({ service, device }: { service: string; device: string }) {
  const [details, setDetails] = useState<{ [key: string]: string }>({});
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const [fetchedDetails, fetchedNetworkInfo] = await Promise.all([
          getNetworkInterfaceDetails(service, device),
          getNetworkInfo(service),
        ]);
        if (!isCancelled) {
          setDetails(fetchedDetails);
          setNetworkInfo(fetchedNetworkInfo);
        }
      } catch (error) {
        console.error("Failed to fetch network details:", error);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, [service, device]);

  // Helper to safely pull a value from the networksetup -getinfo output
  const get = (key: string): string | undefined => {
    const v = details[key];
    if (!v || v.toLowerCase() === "none") return undefined;
    return v;
  };

  // Helper to render a row with primary "Copy" action on Enter
  function InfoItem({
    icon,
    title,
    value,
    extraActions,
  }: {
    icon: Icon;
    title: string;
    value: string;
    extraActions?: React.ReactNode;
  }) {
    return (
      <List.Item
        icon={icon}
        title={title}
        accessories={[{ text: value }]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.CopyToClipboard title={`Copy ${title}`} content={value} />
              {extraActions}
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  const activeDNS = networkInfo?.activeDNS.join(", ") || "";

  if (isLoading) {
    return <List navigationTitle={`${service} Details`} isLoading={true} />;
  }

  return (
    <List navigationTitle={`${service} Details`} searchBarPlaceholder="Search network info...">
      {/* DNS Section */}
      <List.Section title="DNS">
        <List.Item
          icon={{
            source: networkInfo?.isDHCP ? Icon.Globe : Icon.Lock,
            tintColor: networkInfo?.isDHCP ? Color.Blue : Color.Orange,
          }}
          title="DNS Source"
          accessories={[
            {
              tag: {
                value: networkInfo?.isDHCP ? "DHCP" : "Manual",
                color: networkInfo?.isDHCP ? Color.Blue : Color.Orange,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy DNS Source" content={networkInfo?.isDHCP ? "DHCP" : "Manual"} />
            </ActionPanel>
          }
        />
        {activeDNS && <InfoItem icon={Icon.Network} title="Active DNS Servers" value={activeDNS} />}
      </List.Section>

      {/* IPv4 Section */}
      <List.Section title="IPv4">
        {get("IP address") && <InfoItem icon={Icon.Pin} title="IP Address" value={get("IP address")!} />}
        {get("Subnet mask") && <InfoItem icon={Icon.Filter} title="Subnet Mask" value={get("Subnet mask")!} />}
        {get("Router") && (
          <InfoItem
            icon={Icon.House}
            title="Router"
            value={get("Router")!}
            extraActions={
              net.isIP(get("Router")!) ? (
                <Action.OpenInBrowser title="Open Router in Browser" url={`http://${get("Router")}`} />
              ) : undefined
            }
          />
        )}
      </List.Section>

      {/* Hardware Section */}
      <List.Section title="Hardware">
        {get("Wi-Fi ID") && <InfoItem icon={Icon.Wifi} title="Wi-Fi ID" value={get("Wi-Fi ID")!} />}
        {get("MAC Address") && <InfoItem icon={Icon.Link} title="MAC Address" value={get("MAC Address")!} />}
        {get("Ethernet Address") && (
          <InfoItem icon={Icon.Link} title="Ethernet Address" value={get("Ethernet Address")!} />
        )}
      </List.Section>

      {/* IPv6 Section */}
      {(get("IPv6") || get("IPv6 IP address") || get("IPv6 Router")) && (
        <List.Section title="IPv6">
          {get("IPv6") && <InfoItem icon={Icon.Globe} title="IPv6" value={get("IPv6")!} />}
          {get("IPv6 IP address") && <InfoItem icon={Icon.Pin} title="IPv6 Address" value={get("IPv6 IP address")!} />}
          {get("IPv6 Router") && <InfoItem icon={Icon.House} title="IPv6 Router" value={get("IPv6 Router")!} />}
        </List.Section>
      )}
    </List>
  );
}

/**
 * Form to add or edit a DNS preset
 */
function AddEditPresetForm({ existing, onSaved }: { existing?: DNSPreset; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [serversError, setServersError] = useState<string | undefined>();
  const isEditing = !!existing;

  function validateName(value: string | undefined): string | undefined {
    if (!value || value.trim().length === 0) return "Name is required";
    if (/[=\s]/.test(value)) return "Name cannot contain spaces or '='";
    const trimmed = value.trim();
    // Disallow existing name unless editing and keeping the same name
    if ((!isEditing || trimmed !== existing?.name) && getPreset(trimmed)) {
      return `Preset "${trimmed}" already exists`;
    }
    return undefined;
  }

  function validateServers(value: string | undefined): string | undefined {
    if (!value || value.trim().length === 0) return "At least one DNS server is required";
    const servers = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const ip of servers) {
      if (!net.isIP(ip)) {
        return `Invalid IP: "${ip}"`;
      }
    }
    return undefined;
  }

  async function handleSubmit(values: { name: string; servers: string; description?: string }) {
    const trimmedName = values.name.trim();
    const trimmedServers = values.servers
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(",");
    const trimmedDescription = values.description?.trim();

    const nameErr = validateName(trimmedName);
    const serverErr = validateServers(trimmedServers);

    if (nameErr || serverErr) {
      setNameError(nameErr);
      setServersError(serverErr);
      return;
    }

    try {
      // If editing and the name changed, delete the old preset first
      if (isEditing && existing && existing.name !== trimmedName) {
        deletePreset(existing.name);
      }
      addPreset(trimmedName, trimmedServers, trimmedDescription);
      await showToast({
        style: Toast.Style.Success,
        title: isEditing ? `Updated "${trimmedName}"` : `Added "${trimmedName}"`,
        message: trimmedServers,
      });
      onSaved();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save preset",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle={isEditing ? `Edit "${existing!.name}"` : "Add DNS Preset"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Save Changes" : "Add Preset"}
            icon={isEditing ? Icon.Check : Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Preset Name"
        placeholder="e.g. cloudflare, home, work"
        autoFocus
        defaultValue={existing?.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
        onBlur={(e) => setNameError(validateName(e.target.value))}
      />
      <Form.TextField
        id="servers"
        title="DNS Servers"
        placeholder="1.1.1.1, 1.0.0.1 or 2606:4700:4700::1111"
        info="Comma-separated list of IPv4 or IPv6 addresses"
        defaultValue={existing?.servers}
        error={serversError}
        onChange={() => setServersError(undefined)}
        onBlur={(e) => setServersError(validateServers(e.target.value))}
      />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="e.g. Filters ads & malware, Family-friendly"
        info="Optional. A short note about what this preset does."
        defaultValue={existing?.description}
      />
    </Form>
  );
}

export default function Command() {
  const [presets, setPresets] = useState<DNSPreset[]>([]);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [networkService, setNetworkService] = useState<string>(NETWORK_SERVICE);
  const [networkInterface, setNetworkInterface] = useState<string>(NETWORK_INTERFACE);
  const [isLoading, setIsLoading] = useState(true);

  async function resolveService(): Promise<{ service: string; device: string }> {
    try {
      const prefs = getPreferenceValues<Preferences>();
      if (prefs.networkService && prefs.networkService.trim() !== "") {
        const trimmedService = prefs.networkService.trim();
        // Validate service name before using it
        if (validateNetworkServiceName(trimmedService)) {
          const device = (await getNetworkInterfaceForService(trimmedService)) ?? "en0";
          NETWORK_SERVICE = trimmedService;
          NETWORK_INTERFACE = device;
          return { service: trimmedService, device };
        } else {
          throw new Error(
            `Invalid network service name in preferences: "${trimmedService}". Falling back to auto-detect.`,
          );
        }
      }
    } catch (error) {
      console.error("Network service preference error:", error);
    }

    const detected = await getActiveNetworkService();
    NETWORK_SERVICE = detected.service;
    NETWORK_INTERFACE = detected.device;
    return detected;
  }

  async function refresh(targetService?: string) {
    setIsLoading(true);
    try {
      const serviceToUse = targetService ?? networkService;
      const [loadedPresets, loadedInfo] = await Promise.all([
        Promise.resolve(getPresets()),
        getNetworkInfo(serviceToUse),
      ]);
      setPresets(loadedPresets);
      setNetworkInfo(loadedInfo);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load DNS info",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isCancelled = false;

    async function init() {
      setIsLoading(true);
      try {
        const { service, device } = await resolveService();
        if (!isCancelled) {
          setNetworkService(service);
          setNetworkInterface(device);
        }

        const [loadedPresets, loadedInfo] = await Promise.all([Promise.resolve(getPresets()), getNetworkInfo(service)]);

        if (!isCancelled) {
          setPresets(loadedPresets);
          setNetworkInfo(loadedInfo);
        }
      } catch (error) {
        if (!isCancelled) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to load DNS info",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      isCancelled = true;
    };
  }, []);

  async function handleSetPreset(preset: DNSPreset) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Setting DNS to ${preset.name}...`,
      });
      await setDNSFromPreset(preset.name, networkService);
      await showToast({
        style: Toast.Style.Success,
        title: `DNS set to ${preset.name}`,
        message: preset.servers,
      });
      await refresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to set DNS",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleReset() {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Resetting DNS to DHCP...",
      });
      await resetDNS(networkService);
      await showToast({
        style: Toast.Style.Success,
        title: "DNS reset to DHCP",
      });
      await refresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to reset DNS",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleDelete(preset: DNSPreset) {
    const confirmed = await confirmAlert({
      title: `Delete preset "${preset.name}"?`,
      message: `This will remove ${preset.servers} from your presets.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (confirmed) {
      try {
        deletePreset(preset.name);
        await showToast({
          style: Toast.Style.Success,
          title: `Deleted "${preset.name}"`,
        });
        await refresh();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete preset",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const activeDNSText = networkInfo?.activeDNS.length ? networkInfo.activeDNS.join(", ") : "None detected";
  const dnsSourceTag = networkInfo?.isDHCP ? "DHCP" : "Manual";

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search presets or IP addresses...">
      <List.EmptyView
        icon={Icon.Network}
        title="No Presets Found"
        description="Add a DNS preset to quickly toggle nameservers or reset to DHCP."
        actions={
          <ActionPanel>
            <Action.Push
              title="Add DNS Preset"
              icon={Icon.Plus}
              target={<AddEditPresetForm onSaved={() => refresh()} />}
            />
            <Action title="Reset to DHCP" icon={Icon.XMarkCircle} onAction={handleReset} />
          </ActionPanel>
        }
      />

      {/* Network Interface — click for full details */}
      <List.Section title="Current Connection">
        <List.Item
          icon={{
            source: networkInfo?.isDHCP ? Icon.Globe : Icon.Lock,
            tintColor: networkInfo?.isDHCP ? Color.Blue : Color.Orange,
          }}
          title="Active Network Service"
          subtitle={networkInfo?.service ?? "Detecting..."}
          accessories={[
            { text: activeDNSText },
            {
              tag: {
                value: dnsSourceTag,
                color: networkInfo?.isDHCP ? Color.Blue : Color.Orange,
              },
            },
            ...(networkInterface ? [{ tag: networkInterface }] : []),
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Network Details">
                <Action.Push
                  title="Show Network Details"
                  icon={Icon.Info}
                  target={<NetworkDetailsView service={networkService} device={networkInterface} />}
                />
                <Action.CopyToClipboard
                  title="Copy Active DNS"
                  content={activeDNSText}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Network Controls">
                <Action
                  title="Reset to DHCP"
                  icon={Icon.XMarkCircle}
                  onAction={handleReset}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action
                  title="Refresh Network Info"
                  icon={Icon.ArrowClockwise}
                  onAction={() => refresh()}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                />
                <Action title="Configure Extension" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      </List.Section>

      {/* Quick Actions */}
      <List.Section title="Quick Actions">
        <List.Item
          icon={{ source: Icon.Plus, tintColor: Color.Blue }}
          title="Add DNS Preset"
          subtitle="Create a new preset to quickly switch to"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Preset"
                icon={Icon.Plus}
                target={<AddEditPresetForm onSaved={() => refresh()} />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Orange }}
          title="Reset to DHCP"
          subtitle="Remove manual DNS and use automatic settings"
          actions={
            <ActionPanel>
              <Action title="Reset to DHCP" icon={Icon.XMarkCircle} onAction={handleReset} />
            </ActionPanel>
          }
        />
      </List.Section>

      {/* Presets Section */}
      <List.Section title="DNS Presets">
        {presets.map((preset) => {
          const serverArray = preset.servers.split(",").map((s) => s.trim());
          const isActive =
            !networkInfo?.isDHCP &&
            serverArray.length === networkInfo?.manualDNS.length &&
            serverArray.every((ip) => networkInfo?.manualDNS.includes(ip));

          const accessories: List.Item.Accessory[] = [];
          if (preset.description) {
            accessories.push({ text: preset.servers });
          }
          if (isActive) {
            accessories.push({ tag: { value: "Active", color: Color.Green } });
          }

          return (
            <List.Item
              key={preset.name}
              icon={{
                source: isActive ? Icon.CheckCircle : Icon.Circle,
                tintColor: isActive ? Color.Green : Color.SecondaryText,
              }}
              title={preset.name}
              subtitle={preset.description || preset.servers}
              keywords={[...serverArray, ...(preset.description ? preset.description.split(" ") : [])]}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Apply">
                    <Action
                      title={`Set DNS to ${preset.name}`}
                      icon={Icon.Network}
                      onAction={() => handleSetPreset(preset)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard
                      title="Copy DNS Servers"
                      content={preset.servers}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Preset Name"
                      content={preset.name}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Manage Presets">
                    <Action.Push
                      title="Edit Preset"
                      icon={Icon.Pencil}
                      target={<AddEditPresetForm existing={preset} onSaved={() => refresh()} />}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                    />
                    <Action.Push
                      title="Add New Preset"
                      icon={Icon.Plus}
                      target={<AddEditPresetForm onSaved={() => refresh()} />}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                    />
                    <Action
                      title="Delete Preset"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleDelete(preset)}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Network">
                    <Action.Push
                      title="Show Network Details"
                      icon={Icon.Info}
                      target={<NetworkDetailsView service={networkService} device={networkInterface} />}
                      shortcut={{ modifiers: ["cmd"], key: "i" }}
                    />
                    <Action
                      title="Reset to DHCP"
                      icon={Icon.XMarkCircle}
                      onAction={handleReset}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={() => refresh()}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
