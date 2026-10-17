import { Color } from "@raycast/api";
import { OsqueryTable } from "./types";

export type TableCategory =
  | "all"
  | "system"
  | "process"
  | "network"
  | "user"
  | "security"
  | "hardware"
  | "file"
  | "app"
  | "other";

export const CATEGORY_INFO: Record<
  TableCategory,
  { label: string; color: Color; keywords: string[] }
> = {
  all: { label: "All", color: Color.PrimaryText, keywords: [] },
  system: {
    label: "System",
    color: Color.Blue,
    keywords: [
      "system",
      "os",
      "kernel",
      "boot",
      "uptime",
      "version",
      "info",
      "time",
      "hostname",
      "platform",
    ],
  },
  process: {
    label: "Processes",
    color: Color.Orange,
    keywords: [
      "process",
      "pid",
      "thread",
      "memory",
      "cpu",
      "socket",
      "port",
      "listen",
      "open_file",
      "handle",
    ],
  },
  network: {
    label: "Network",
    color: Color.Green,
    keywords: [
      "network",
      "interface",
      "route",
      "arp",
      "dns",
      "ip",
      "socket",
      "connection",
      "firewall",
      "iptables",
      "curl",
    ],
  },
  user: {
    label: "Users",
    color: Color.Yellow,
    keywords: [
      "user",
      "account",
      "group",
      "login",
      "session",
      "sudoer",
      "shadow",
      "passwd",
      "uid",
      "gid",
    ],
  },
  security: {
    label: "Security",
    color: Color.Red,
    keywords: [
      "security",
      "certificate",
      "keychain",
      "auth",
      "password",
      "encryption",
      "sip",
      "gatekeeper",
      "xprotect",
      "tcc",
      "privacy",
      "signature",
      "hash",
      "yara",
    ],
  },
  hardware: {
    label: "Hardware",
    color: Color.Purple,
    keywords: [
      "hardware",
      "cpu",
      "memory",
      "disk",
      "usb",
      "pci",
      "battery",
      "power",
      "fan",
      "temperature",
      "acpi",
      "smbios",
      "block_device",
    ],
  },
  file: {
    label: "Files",
    color: Color.Magenta,
    keywords: [
      "file",
      "directory",
      "path",
      "filesystem",
      "mount",
      "extended_attribute",
      "hash",
      "magic",
      "mtime",
      "atime",
    ],
  },
  app: {
    label: "Apps",
    color: Color.SecondaryText,
    keywords: [
      "app",
      "application",
      "package",
      "brew",
      "install",
      "bundle",
      "launchd",
      "plist",
      "browser",
      "chrome",
      "firefox",
      "safari",
      "extension",
    ],
  },
  other: {
    label: "Other",
    color: Color.SecondaryText,
    keywords: [],
  },
};

export function categorizeTable(table: OsqueryTable): TableCategory {
  const searchText = `${table.name} ${table.description}`.toLowerCase();

  // Check each category's keywords
  for (const [category, info] of Object.entries(CATEGORY_INFO)) {
    if (category === "all" || category === "other") continue;

    for (const keyword of info.keywords) {
      if (searchText.includes(keyword)) {
        return category as TableCategory;
      }
    }
  }

  return "other";
}

export function getTableCategory(table: OsqueryTable): TableCategory {
  return categorizeTable(table);
}

export function filterByCategory(
  tables: OsqueryTable[],
  category: TableCategory,
): OsqueryTable[] {
  if (category === "all") {
    return tables;
  }
  return tables.filter((table) => categorizeTable(table) === category);
}
