import {
  ActionPanel,
  List,
  Action,
  Icon,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Form,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { execSync, execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";

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

// Module-level placeholder; will be updated in useEffect to avoid blocking UI
let NETWORK_SERVICE = "Wi-Fi";

/**
 * Validate network service name against a safe pattern.
 * Prevents shell injection via service names with special characters.
 * Allows word characters, hyphens, spaces, and forward slashes (valid in macOS service names).
 * Blocks shell-sensitive characters: ', ", `, $, \
 */
function validateNetworkServiceName(serviceName: string): boolean {
  return /^[\w\- /]+$/.test(serviceName);
}

/**
 * Get the active network service (e.g., "Wi-Fi", "Ethernet").
 * Detects the default interface via route and maps it to the macOS hardware port name.
 * Falls back to "Wi-Fi" if detection fails.
 */
function getActiveNetworkService(): string {
  try {
    const iface = execSync("route get default 2>/dev/null | awk '/interface: /{print $2}'", {
      encoding: "utf-8",
    }).trim();
    if (!iface) return "Wi-Fi";

    const hwports = execSync("networksetup -listallhardwareports", {
      encoding: "utf-8",
    });

    const lines = hwports.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("Device:")) {
        const dev = line.split("Device:")[1].trim();
        if (dev === iface) {
          const prev = (lines[i - 1] || "").trim();
          if (prev.startsWith("Hardware Port:")) {
            const serviceName = prev.split("Hardware Port:")[1].trim();
            // Validate before returning to prevent injection
            if (validateNetworkServiceName(serviceName)) {
              return serviceName;
            }
          }
        }
      }
    }
  } catch {
    // Silently fall back
  }
  return "Wi-Fi";
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
 * Parse a preset line: name=servers:description
 */
function parsePresetLine(line: string): DNSPreset | null {
  line = line.trim();
  if (!line || line.startsWith("#")) return null;

  const eqIndex = line.indexOf("=");
  if (eqIndex === -1) return null;

  const name = line.substring(0, eqIndex);
  const rest = line.substring(eqIndex + 1);

  // Validate preset name (no spaces or equals signs allowed)
  if (!/^[^\s=]+$/.test(name)) {
    return null; // Skip invalid preset names
  }

  const colonIndex = rest.indexOf(":");
  let servers: string;
  let description: string | undefined;

  if (colonIndex === -1) {
    servers = rest;
  } else {
    servers = rest.substring(0, colonIndex);
    description = rest.substring(colonIndex + 1).trim();
  }

  if (!name || !servers) return null;
  return { name, servers, description: description || undefined };
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
 * Get manually configured DNS servers (empty if using DHCP)
 */
function getManualDNS(): string[] {
  try {
    const output = execSync(`networksetup -getdnsservers "${NETWORK_SERVICE}"`, {
      encoding: "utf-8",
    });

    if (output.includes("aren't any DNS Servers set") || output.trim() === "") {
      return [];
    }

    return output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("*"));
  } catch {
    return [];
  }
}

/**
 * Get active DNS servers (what the system is actually using, including DHCP-assigned)
 */
function getActiveDNS(): string[] {
  try {
    const output = execSync("scutil --dns", { encoding: "utf-8" });
    const nameservers = new Set<string>();

    // Extract nameserver IPs from scutil output
    const lines = output.split("\n");
    lines.forEach((line) => {
      const match = line.match(/nameserver\[\d+\]\s*:\s*([\d.]+)/);
      if (match) {
        nameservers.add(match[1]);
      }
    });

    return Array.from(nameservers);
  } catch {
    return [];
  }
}

/**
 * Get network interface details (IP, subnet, gateway, etc.)
 */
function getNetworkInterfaceDetails(): { [key: string]: string } {
  try {
    const details: { [key: string]: string } = {};

    // Get IPv4 address and subnet
    const ipinfo = execSync(`networksetup -getinfo "${NETWORK_SERVICE}" 2>/dev/null || echo ""`, { encoding: "utf-8" });
    ipinfo.split("\n").forEach((line) => {
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        if (value.trim()) {
          details[key.trim()] = value.trim();
        }
      }
    });

    // Get hardware (MAC) address
    try {
      const mac = execSync(
        `ifconfig $(networksetup -listnetworkserviceorder | grep "${NETWORK_SERVICE}" | grep -oE "en[0-9]+") | grep ether | awk '{print $2}'`,
        { encoding: "utf-8" },
      ).trim();
      if (mac) details["MAC Address"] = mac;
    } catch {
      // Silently ignore if we can't get MAC
    }

    return details;
  } catch {
    return {};
  }
}

/**
 * Get network information
 */
function getNetworkInfo(): NetworkInfo {
  const manualDNS = getManualDNS();
  const activeDNS = getActiveDNS();
  const isDHCP = manualDNS.length === 0;

  return {
    service: NETWORK_SERVICE,
    manualDNS,
    activeDNS,
    isDHCP,
  };
}

/**
 * Run a command with admin privileges via the native macOS auth dialog.
 * This uses AppleScript's `do shell script ... with administrator privileges` which
 * triggers the system authorization UI. On some macOS versions and settings this
 * will present Touch ID as an option; behavior depends on system configuration.
 */
function runWithAdmin(command: string): void {
  // Encode the command to base64 to avoid shell quoting/escaping issues.
  const b64 = Buffer.from(command, "utf8").toString("base64");
  const script = `do shell script "echo '${b64}' | base64 -D | sh" with administrator privileges`;
  execFileSync("/usr/bin/osascript", ["-e", script]);
}

/**
 * Set DNS to specific servers
 */
function setDNS(servers: string[]): void {
  // Validate network service name (prevents shell injection via preferences)
  if (!validateNetworkServiceName(NETWORK_SERVICE)) {
    throw new Error(`Invalid network service name: "${NETWORK_SERVICE}". Service name may have been tampered with.`);
  }

  // Validate all IPs before execution (defense in depth - prevents shell injection)
  const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  for (const ip of servers) {
    if (!ipRegex.test(ip)) {
      throw new Error(`Invalid IP address: "${ip}". Preset file may have been tampered with.`);
    }
    const parts = ip.split(".").map(Number);
    if (parts.some((p) => p < 0 || p > 255)) {
      throw new Error(`Invalid IP address: "${ip}". Preset file may have been tampered with.`);
    }
  }

  // Use the absolute path to networksetup since `do shell script` has a minimal PATH
  const networksetup = "/usr/sbin/networksetup";
  if (servers.length === 0) {
    // Reset to DHCP
    runWithAdmin(`${networksetup} -setdnsservers '${NETWORK_SERVICE}' empty`);
  } else {
    const dnsArgs = servers.map((s) => `'${s}'`).join(" ");
    runWithAdmin(`${networksetup} -setdnsservers '${NETWORK_SERVICE}' ${dnsArgs}`);
  }
}

/**
 * Set DNS from a preset
 */
function setDNSFromPreset(presetName: string): void {
  const servers = getPreset(presetName);
  if (!servers) {
    throw new Error(`Preset "${presetName}" not found`);
  }

  const serverArray = servers.split(",").map((s) => s.trim());
  setDNS(serverArray);
}

/**
 * Reset DNS to DHCP
 */
function resetDNS(): void {
  setDNS([]);
}

/**
 * List view showing all network interface info — press Enter on any row to copy.
 */
function NetworkDetailsView() {
  const [details, setDetails] = useState<{ [key: string]: string }>({});
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    try {
      const fetchedDetails = getNetworkInterfaceDetails();
      const fetchedNetworkInfo = getNetworkInfo();
      setDetails(fetchedDetails);
      setNetworkInfo(fetchedNetworkInfo);
    } catch (error) {
      // Silently handle errors
      console.error("Failed to fetch network details:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
            <Action.CopyToClipboard title={`Copy ${title}`} content={value} />
            {extraActions}
          </ActionPanel>
        }
      />
    );
  }

  const activeDNS = networkInfo?.activeDNS.join(", ") || "";

  if (isLoading) {
    return <List navigationTitle={`${NETWORK_SERVICE} Details`} isLoading={true} />;
  }

  return (
    <List navigationTitle={`${NETWORK_SERVICE} Details`} searchBarPlaceholder="Search network info...">
      {/* DNS Section */}
      <List.Section title="DNS">
        <List.Item
          icon={networkInfo?.isDHCP ? Icon.Globe : Icon.Lock}
          title="DNS Source"
          accessories={[
            {
              tag: {
                value: networkInfo?.isDHCP ? "DHCP" : "Manual",
                color: networkInfo?.isDHCP ? "#3b82f6" : "#f59e0b",
              },
            },
          ]}
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
              /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(get("Router")!) ? (
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
  const [nameError, setNameError] = useState<string | undefined>();
  const [serversError, setServersError] = useState<string | undefined>();
  const isEditing = !!existing;

  function validateName(value: string | undefined): string | undefined {
    if (!value || value.trim().length === 0) return "Name is required";
    if (/[=\s]/.test(value)) return "Name cannot contain spaces or '='";
    // If creating new (not editing) and name already exists
    if (!isEditing && getPreset(value.trim())) {
      return `Preset "${value.trim()}" already exists`;
    }
    return undefined;
  }

  function validateServers(value: string | undefined): string | undefined {
    if (!value || value.trim().length === 0) return "At least one DNS server is required";
    const servers = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    for (const ip of servers) {
      if (!ipRegex.test(ip)) {
        return `Invalid IP: "${ip}"`;
      }
      const parts = ip.split(".").map(Number);
      if (parts.some((p) => p < 0 || p > 255)) {
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
        defaultValue={existing?.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
        onBlur={(e) => setNameError(validateName(e.target.value))}
      />
      <Form.TextField
        id="servers"
        title="DNS Servers"
        placeholder="1.1.1.1, 1.0.0.1"
        info="Comma-separated list of IPv4 addresses"
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
  const [isLoading, setIsLoading] = useState(true);

  function refresh() {
    // Defer I/O operations to next event loop tick to allow React to render loading state first
    setTimeout(() => {
      setIsLoading(true);
      try {
        setPresets(getPresets());
        setNetworkInfo(getNetworkInfo());
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load DNS info",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }, 0);
  }

  useEffect(() => {
    // Update network service asynchronously (avoiding blocking startup)
    try {
      const prefs = getPreferenceValues<Preferences>();
      if (prefs.networkService && prefs.networkService.trim() !== "") {
        const trimmedService = prefs.networkService.trim();
        // Validate service name before using it
        if (validateNetworkServiceName(trimmedService)) {
          NETWORK_SERVICE = trimmedService;
        } else {
          throw new Error(`Invalid network service name in preferences: "${trimmedService}". Falling back to Wi-Fi.`);
        }
      } else {
        NETWORK_SERVICE = getActiveNetworkService();
      }
    } catch (error) {
      // Keep the default "Wi-Fi" if detection or validation fails
      console.error("Network service detection error:", error);
      NETWORK_SERVICE = "Wi-Fi";
    }

    refresh();
  }, []);

  async function handleSetPreset(preset: DNSPreset) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Setting DNS to ${preset.name}...`,
      });
      setDNSFromPreset(preset.name);
      await showToast({
        style: Toast.Style.Success,
        title: `DNS set to ${preset.name}`,
        message: preset.servers,
      });
      refresh();
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
      resetDNS();
      await showToast({
        style: Toast.Style.Success,
        title: "DNS reset to DHCP",
      });
      refresh();
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
        refresh();
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
    <List isLoading={isLoading} searchBarPlaceholder="Search presets...">
      {/* Network Interface — click for full details */}
      <List.Section title="Network">
        <List.Item
          icon={networkInfo?.isDHCP ? Icon.Globe : Icon.Lock}
          title="Network Interface in Use"
          subtitle={networkInfo?.service ?? ""}
          accessories={[{ text: activeDNSText }, { tag: dnsSourceTag }]}
          actions={
            <ActionPanel>
              <Action.Push title="Show Network Details" icon={Icon.Info} target={<NetworkDetailsView />} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
              <Action
                title="Reset to DHCP"
                icon={Icon.XMarkCircle}
                onAction={handleReset}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {/* Quick Actions */}
      <List.Section title="Quick Actions">
        <List.Item
          icon={Icon.Plus}
          title="Add DNS Preset"
          subtitle="Create a new preset to quickly switch to"
          actions={
            <ActionPanel>
              <Action.Push title="Add Preset" icon={Icon.Plus} target={<AddEditPresetForm onSaved={refresh} />} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.XMarkCircle}
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
            // Show the IP servers as a secondary accessory when there's a description
            accessories.push({ text: preset.servers });
          }
          if (isActive) {
            accessories.push({ tag: "Active" });
          }

          return (
            <List.Item
              key={preset.name}
              icon={isActive ? Icon.CheckCircle : Icon.Circle}
              title={preset.name}
              subtitle={preset.description || preset.servers}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action
                    title={`Set DNS to ${preset.name}`}
                    icon={Icon.Network}
                    onAction={() => handleSetPreset(preset)}
                  />
                  <Action.Push
                    title="Edit Preset"
                    icon={Icon.Pencil}
                    target={<AddEditPresetForm existing={preset} onSaved={refresh} />}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                  />
                  <Action.Push
                    title="Add New Preset"
                    icon={Icon.Plus}
                    target={<AddEditPresetForm onSaved={refresh} />}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <Action
                    title="Reset to DHCP"
                    icon={Icon.XMarkCircle}
                    onAction={handleReset}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action
                    title="Delete Preset"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(preset)}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
