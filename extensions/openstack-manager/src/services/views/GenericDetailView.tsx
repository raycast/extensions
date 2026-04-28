import { Action, ActionPanel, Clipboard, Detail, Icon, LocalStorage, open, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { execFile as execFileCb } from "child_process";
import { promisify } from "util";
import { buildHorizonLink, HorizonResourceType } from "../../utils/horizonUrl";

const execFile = promisify(execFileCb);

export interface GenericDetailViewProps {
  resourceId: string;
  resourceName: string;
  cliArgs: string[];
  cacheKeyPrefix: string;
  horizonUrl?: string;
  horizonResourceType?: HorizonResourceType;
  binaryPath: string;
  configName: string;
  /** Optional per-resource summary keys for the main markdown output. Falls back to server defaults. */
  summaryKeys?: { key: string; label: string; format?: string }[];
}

/**
 * Formats a value for display in metadata labels.
 * Objects and arrays are flattened to readable strings instead of raw JSON.
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value || "—";
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    // Array of strings: join with comma
    if (value.every((v) => typeof v === "string")) return value.join(", ");
    // Array of objects with "name" field (e.g., security_groups): extract names
    if (value.every((v) => typeof v === "object" && v !== null && "name" in v)) {
      return value.map((v) => (v as { name: string }).name).join(", ");
    }
    // Array of other objects: one per line
    return value.map((v) => flattenObject(v)).join("\n");
  }

  if (typeof value === "object") {
    return flattenObject(value);
  }

  return String(value);
}

/**
 * Flattens an object to a readable string.
 * { "original_name": "m1.small", "vcpus": 2 } → "original_name: m1.small, vcpus: 2"
 */
function flattenObject(obj: unknown): string {
  if (obj === null || obj === undefined) return "—";
  if (typeof obj !== "object") return String(obj);

  const entries = Object.entries(obj as Record<string, unknown>);
  if (entries.length === 0) return "—";

  // If it has just one key, show just the value
  if (entries.length === 1) {
    const [, v] = entries[0];
    return typeof v === "object" ? flattenObject(v) : String(v ?? "—");
  }

  // Multiple keys: "key: value, key: value"
  return entries
    .map(([k, v]) => {
      const val = typeof v === "object" && v !== null ? flattenObject(v) : String(v ?? "—");
      return `${k}: ${val}`;
    })
    .join(", ");
}

/**
 * Cleans up a CLI key for display.
 * Strips OpenStack prefixes like "OS-EXT-SRV-ATTR:", "OS-DCF:", "OS-EXT-STS:", etc.
 */
function formatKey(key: string): string {
  return (
    key
      // Strip all "OS-*:" prefixes (OS-EXT-SRV-ATTR:, OS-DCF:, OS-EXT-STS:, OS-EXT-AZ:, etc.)
      .replace(/^OS-[A-Z-]+:/i, "")
      // Replace underscores with spaces
      .replace(/_/g, " ")
      // Title case each word
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim()
  );
}

/**
 * Extracts all IP addresses from the "addresses" field.
 * The addresses field can be:
 * - A string like "private=10.0.0.5, 203.0.113.10; public=192.168.1.1"
 * - An object like { "network-name": ["10.0.0.5", "203.0.113.10"] }
 * - An object like { "network-name": [{ "addr": "10.0.0.5", "version": 4 }] }
 */
function extractAddresses(data: Record<string, unknown>): { network: string; ips: string[] }[] {
  const addresses = data["addresses"] ?? data["Addresses"];
  if (!addresses) return [];

  // String format: "net1=ip1, ip2; net2=ip3"
  if (typeof addresses === "string") {
    const result: { network: string; ips: string[] }[] = [];
    const parts = addresses
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const part of parts) {
      const eqIdx = part.indexOf("=");
      if (eqIdx > 0) {
        const network = part.substring(0, eqIdx).trim();
        const ips = part
          .substring(eqIdx + 1)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        result.push({ network, ips });
      } else {
        result.push({ network: "default", ips: [part] });
      }
    }
    return result;
  }

  // Object format: { "network-name": [...] }
  if (typeof addresses === "object" && !Array.isArray(addresses)) {
    const result: { network: string; ips: string[] }[] = [];
    for (const [network, value] of Object.entries(addresses as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        const ips = value.map((v) => {
          if (typeof v === "string") return v;
          if (typeof v === "object" && v !== null && "addr" in v) return String((v as { addr: string }).addr);
          return String(v);
        });
        result.push({ network, ips });
      }
    }
    return result;
  }

  return [];
}

/**
 * Gets all IPs as a flat string for copying.
 */
function getAllIPs(addressGroups: { network: string; ips: string[] }[]): string {
  return addressGroups.flatMap((g) => g.ips).join(", ");
}

export default function GenericDetailView({
  resourceId,
  resourceName,
  cliArgs,
  cacheKeyPrefix,
  horizonUrl,
  horizonResourceType,
  binaryPath,
  configName,
  summaryKeys,
}: GenericDetailViewProps) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const cacheKey = `detail:${cacheKeyPrefix}:${resourceId}`;

  const fetchData = useCallback(async () => {
    try {
      const { stdout } = await execFile(binaryPath, ["--os-cloud", configName, ...cliArgs, resourceId, "-f", "json"], {
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024,
      });
      const parsed = JSON.parse(stdout) as Record<string, unknown>;
      setData(parsed);
      await LocalStorage.setItem(cacheKey, JSON.stringify(parsed));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await showToast({ style: Toast.Style.Failure, title: "Failed to load details", message });
    } finally {
      setIsLoading(false);
    }
  }, [binaryPath, configName, cliArgs, resourceId, cacheKey]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const cached = await LocalStorage.getItem<string>(cacheKey);
        if (cached && !cancelled) {
          setData(JSON.parse(cached) as Record<string, unknown>);
        }
      } catch {
        // Ignore
      }

      if (!cancelled) {
        await fetchData();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, fetchData]);

  const horizonLink =
    horizonResourceType && horizonUrl ? buildHorizonLink(horizonUrl, horizonResourceType, resourceId) : null;

  if (!data) {
    const markdown = isLoading
      ? `# ${resourceName}\n\nLoading details...`
      : `# ${resourceName}\n\nFailed to load details.`;
    return <Detail isLoading={isLoading} navigationTitle={resourceName} markdown={markdown} />;
  }

  const entries = Object.entries(data);
  const name = (data["name"] as string) ?? (data["Name"] as string) ?? resourceName;

  // Filter out noisy/useless fields
  const HIDDEN_KEYS = new Set([
    "kernel_id",
    "Kernel Id",
    "launch_index",
    "Launch Index",
    "ramdisk_id",
    "Ramdisk Id",
    "reservation_id",
    "Reservation Id",
    "user_id",
    "User Id",
    "progress",
    "Progress",
    "disk_config",
    "Disk Config",
    "OS-DCF:diskConfig",
    "OS-EXT-SRV-ATTR:reservation_id",
    "OS-EXT-SRV-ATTR:launch_index",
    "OS-EXT-SRV-ATTR:kernel_id",
    "OS-EXT-SRV-ATTR:ramdisk_id",
    "OS-EXT-SRV-ATTR:user_data",
    "OS-SRV-USG:launched_at",
    "OS-SRV-USG:terminated_at",
    "config_drive",
    "Config Drive",
    "accessIPv4",
    "accessIPv6",
    "access_ipv4",
    "access_ipv6",
    "hostId",
    "host_id",
  ]);

  const visibleEntries = entries.filter(([key, value]) => {
    if (HIDDEN_KEYS.has(key)) return false;
    // Skip empty strings and null
    if (value === "" || value === null) return false;
    return true;
  });

  // Extract addresses for servers
  const addressGroups = extractAddresses(data);
  const allIPs = getAllIPs(addressGroups);

  // Build markdown summary — use custom summaryKeys if provided, else server defaults
  const DEFAULT_SERVER_KEYS: { key: string; label: string; format?: string }[] = [
    { key: "OS-EXT-AZ:availability_zone", label: "Availability Zone" },
    { key: "availability_zone", label: "Availability Zone" },
    { key: "OS-EXT-SRV-ATTR:host", label: "Host" },
    { key: "OS-EXT-SRV-ATTR:hostname", label: "Hostname" },
    { key: "OS-EXT-SRV-ATTR:hypervisor_hostname", label: "Hypervisor Hostname" },
    { key: "OS-EXT-SRV-ATTR:instance_name", label: "Instance Name" },
    { key: "status", label: "Status" },
    { key: "Status", label: "Status" },
  ];

  const keysToShow = summaryKeys ?? DEFAULT_SERVER_KEYS;

  const summaryLines: string[] = [];
  const seenLabels = new Set<string>();
  for (const { key, label, format } of keysToShow) {
    if (seenLabels.has(label)) continue;
    if (key in data && data[key] !== null && data[key] !== "") {
      const val = data[key];
      let display: string;

      if (format === "size_gib" && typeof val === "number") {
        display = `${(val / 1024 / 1024 / 1024).toFixed(2)} GiB`;
      } else if (format === "subnet_list" && Array.isArray(val)) {
        display = `${val.length} subnet${val.length !== 1 ? "s" : ""}\n${val.map((s) => `  - ${s}`).join("\n")}`;
      } else {
        display = typeof val === "object" ? flattenObject(val) : String(val);
      }

      summaryLines.push(`**${label}:** ${display}`);
      seenLabels.add(label);
    }
  }

  // Add IP addresses
  if (allIPs) {
    summaryLines.push(`**IP Addresses:** ${allIPs}`);
  }

  // Add addresses section if present
  let addressesMarkdown = "";
  if (addressGroups.length > 0) {
    addressesMarkdown = "\n\n## Addresses\n\n";
    for (const group of addressGroups) {
      addressesMarkdown += `**${group.network}:** ${group.ips.join(", ")}\n\n`;
    }
  }

  const markdown = `# ${name}\n\n${summaryLines.join("\n\n")}${addressesMarkdown}`;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={resourceName}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {visibleEntries.map(([key, value]) => (
            <Detail.Metadata.Label key={key} title={formatKey(key)} text={formatValue(value)} />
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Copy Id"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={() => {
              Clipboard.copy(resourceId);
              showToast({ style: Toast.Style.Success, title: "Copied ID", message: resourceId });
            }}
          />
          {allIPs && (
            <Action
              title="Copy All Ips"
              icon={Icon.Network}
              shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
              onAction={() => {
                Clipboard.copy(allIPs);
                showToast({ style: Toast.Style.Success, title: "Copied IPs", message: allIPs });
              }}
            />
          )}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={async () => {
              setIsLoading(true);
              await fetchData();
            }}
          />
          {horizonLink && (
            <Action
              title="Open in Browser"
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={() => open(horizonLink)}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
