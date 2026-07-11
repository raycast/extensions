export interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  query: string;
  platforms: string[];
  tags: string[];
}

export type TemplateCategory =
  | "system"
  | "process"
  | "network"
  | "user"
  | "security"
  | "app";

export const TEMPLATE_CATEGORIES: Record<
  TemplateCategory,
  { label: string; icon: string }
> = {
  system: { label: "System", icon: "💻" },
  process: { label: "Processes", icon: "⚙️" },
  network: { label: "Network", icon: "🌐" },
  user: { label: "Users", icon: "👤" },
  security: { label: "Security", icon: "🔒" },
  app: { label: "Apps", icon: "📦" },
};

export const QUERY_TEMPLATES: QueryTemplate[] = [
  // SYSTEM
  {
    id: "system-info",
    name: "System Information",
    description:
      "Get basic system information including hostname, OS version, and hardware",
    category: "system",
    query: `SELECT
  hostname,
  computer_name,
  cpu_brand,
  cpu_type,
  physical_memory,
  hardware_vendor,
  hardware_model
FROM system_info;`,
    platforms: ["darwin", "linux", "windows"],
    tags: ["overview", "hardware"],
  },
  {
    id: "os-version",
    name: "OS Version Details",
    description: "Get detailed operating system version information",
    category: "system",
    query: `SELECT * FROM os_version;`,
    platforms: ["darwin", "linux", "windows"],
    tags: ["version", "os"],
  },
  {
    id: "uptime",
    name: "System Uptime",
    description: "Check how long the system has been running",
    category: "system",
    query: `SELECT
  days,
  hours,
  minutes,
  total_seconds
FROM uptime;`,
    platforms: ["darwin", "linux", "windows"],
    tags: ["uptime", "status"],
  },
  {
    id: "disk-usage",
    name: "Disk Usage",
    description: "Show disk space usage for all mounted filesystems",
    category: "system",
    query: `SELECT
  device,
  path,
  type,
  ROUND((blocks_size * blocks_available) / 1073741824.0, 2) AS free_gb,
  ROUND((blocks_size * blocks) / 1073741824.0, 2) AS total_gb,
  ROUND(100.0 * (blocks - blocks_available) / blocks, 1) AS percent_used
FROM mounts
WHERE blocks > 0;`,
    platforms: ["darwin", "linux"],
    tags: ["disk", "storage"],
  },

  // PROCESSES
  {
    id: "running-processes",
    name: "Running Processes",
    description: "List all running processes with resource usage",
    category: "process",
    query: `SELECT
  pid,
  name,
  path,
  cmdline,
  uid,
  ROUND(resident_size / 1048576.0, 2) AS memory_mb,
  state
FROM processes
ORDER BY resident_size DESC
LIMIT 50;`,
    platforms: ["darwin", "linux", "windows"],
    tags: ["processes", "memory"],
  },
  {
    id: "listening-ports",
    name: "Listening Ports",
    description: "Show all processes listening on network ports",
    category: "process",
    query: `SELECT
  lp.pid,
  p.name,
  lp.port,
  lp.protocol,
  lp.address,
  p.path
FROM listening_ports lp
JOIN processes p ON lp.pid = p.pid
WHERE lp.port != 0
ORDER BY lp.port;`,
    platforms: ["darwin", "linux", "windows"],
    tags: ["network", "ports", "listening"],
  },
  {
    id: "open-sockets",
    name: "Open Network Connections",
    description: "Show established network connections",
    category: "process",
    query: `SELECT
  pid,
  local_address,
  local_port,
  remote_address,
  remote_port,
  protocol,
  state
FROM process_open_sockets
WHERE remote_port != 0
  AND state = 'ESTABLISHED'
ORDER BY pid;`,
    platforms: ["darwin", "linux", "windows"],
    tags: ["network", "connections"],
  },

  // NETWORK
  {
    id: "network-interfaces",
    name: "Network Interfaces",
    description: "List all network interfaces with IP addresses",
    category: "network",
    query: `SELECT
  ia.interface,
  ia.address,
  ia.mask,
  id.mac,
  id.mtu,
  id.type
FROM interface_addresses ia
JOIN interface_details id ON ia.interface = id.interface
WHERE ia.address NOT LIKE 'fe80%'
  AND ia.address NOT LIKE '::1'
  AND ia.address != '127.0.0.1';`,
    platforms: ["darwin", "linux", "windows"],
    tags: ["network", "ip", "interfaces"],
  },
  {
    id: "dns-resolvers",
    name: "DNS Resolvers",
    description: "Show configured DNS servers",
    category: "network",
    query: `SELECT * FROM dns_resolvers;`,
    platforms: ["darwin", "linux", "windows"],
    tags: ["dns", "network"],
  },
  {
    id: "arp-cache",
    name: "ARP Cache",
    description: "Show the ARP cache (IP to MAC mappings)",
    category: "network",
    query: `SELECT
  address,
  mac,
  interface
FROM arp_cache
WHERE mac != '00:00:00:00:00:00';`,
    platforms: ["darwin", "linux", "windows"],
    tags: ["arp", "network"],
  },
  {
    id: "routes",
    name: "Routing Table",
    description: "Show the system routing table",
    category: "network",
    query: `SELECT
  destination,
  gateway,
  netmask,
  interface,
  type
FROM routes
WHERE destination != '::1';`,
    platforms: ["darwin", "linux", "windows"],
    tags: ["routes", "network"],
  },

  // USERS
  {
    id: "user-accounts",
    name: "User Accounts",
    description: "List all local user accounts",
    category: "user",
    query: `SELECT
  uid,
  gid,
  username,
  description,
  directory,
  shell
FROM users
ORDER BY uid;`,
    platforms: ["darwin", "linux", "windows"],
    tags: ["users", "accounts"],
  },
  {
    id: "logged-in-users",
    name: "Currently Logged In Users",
    description: "Show users currently logged into the system",
    category: "user",
    query: `SELECT
  user,
  type,
  tty,
  host,
  time
FROM logged_in_users;`,
    platforms: ["darwin", "linux", "windows"],
    tags: ["users", "login", "session"],
  },
  {
    id: "groups",
    name: "User Groups",
    description: "List all user groups on the system",
    category: "user",
    query: `SELECT
  gid,
  groupname
FROM groups
ORDER BY gid;`,
    platforms: ["darwin", "linux", "windows"],
    tags: ["groups", "users"],
  },

  // SECURITY
  {
    id: "sip-status",
    name: "SIP Status (macOS)",
    description: "Check System Integrity Protection status",
    category: "security",
    query: `SELECT * FROM sip_config;`,
    platforms: ["darwin"],
    tags: ["sip", "security", "macos"],
  },
  {
    id: "gatekeeper",
    name: "Gatekeeper Status (macOS)",
    description: "Check Gatekeeper configuration",
    category: "security",
    query: `SELECT * FROM gatekeeper;`,
    platforms: ["darwin"],
    tags: ["gatekeeper", "security", "macos"],
  },
  {
    id: "firewall-status",
    name: "Firewall Status (macOS)",
    description: "Check Application Layer Firewall status",
    category: "security",
    query: `SELECT * FROM alf;`,
    platforms: ["darwin"],
    tags: ["firewall", "alf", "security"],
  },
  {
    id: "certificates",
    name: "Installed Certificates",
    description: "List certificates in the system keychain",
    category: "security",
    query: `SELECT
  common_name,
  issuer,
  not_valid_after,
  signing_algorithm,
  path
FROM certificates
WHERE path LIKE '/System/%'
   OR path LIKE '/Library/%'
LIMIT 50;`,
    platforms: ["darwin", "windows"],
    tags: ["certificates", "security"],
  },
  {
    id: "tcc-access",
    name: "TCC Privacy Database (macOS)",
    description: "Show apps with privacy/permission access",
    category: "security",
    query: `SELECT
  service,
  client,
  auth_value,
  last_modified
FROM tcc_access
ORDER BY service, client;`,
    platforms: ["darwin"],
    tags: ["tcc", "privacy", "permissions"],
  },

  // APPS
  {
    id: "installed-apps-macos",
    name: "Installed Applications (macOS)",
    description: "List all installed applications on macOS",
    category: "app",
    query: `SELECT
  name,
  bundle_identifier,
  bundle_short_version,
  path,
  last_opened_time
FROM apps
ORDER BY name;`,
    platforms: ["darwin"],
    tags: ["apps", "installed"],
  },
  {
    id: "homebrew-packages",
    name: "Homebrew Packages",
    description: "List installed Homebrew packages",
    category: "app",
    query: `SELECT
  name,
  version,
  path
FROM homebrew_packages
ORDER BY name;`,
    platforms: ["darwin"],
    tags: ["homebrew", "brew", "packages"],
  },
  {
    id: "launch-agents",
    name: "Launch Agents & Daemons",
    description: "List all launchd agents and daemons",
    category: "app",
    query: `SELECT
  name,
  label,
  program,
  run_at_load,
  path
FROM launchd
WHERE run_at_load = 1
ORDER BY path;`,
    platforms: ["darwin"],
    tags: ["launchd", "agents", "daemons", "persistence"],
  },
  {
    id: "browser-extensions",
    name: "Browser Extensions (Chrome)",
    description: "List installed Chrome extensions",
    category: "app",
    query: `SELECT
  name,
  identifier,
  version,
  author,
  path
FROM chrome_extensions
ORDER BY name;`,
    platforms: ["darwin", "linux", "windows"],
    tags: ["chrome", "browser", "extensions"],
  },
];
