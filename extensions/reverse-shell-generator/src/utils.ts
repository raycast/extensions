// ============================================================================
// Utility Functions for Reverse Shell Generator
// ============================================================================

/**
 * Get file extension based on shell type
 */
export function getFileExtension(type: string): string {
  if (type.startsWith("powershell")) return ".ps1";
  if (type.startsWith("python")) return ".py";
  if (type.startsWith("php")) return ".php";
  if (type.startsWith("perl")) return ".pl";
  if (type.startsWith("ruby")) return ".rb";
  if (type.startsWith("nodejs")) return ".js";
  if (type.startsWith("lua")) return ".lua";
  if (type.startsWith("golang")) return ".go";
  if (type.startsWith("rust")) return ".rs";
  if (type.startsWith("java")) return ".java";
  if (type.startsWith("csharp")) return ".cs";
  if (type.startsWith("msfvenom")) return "";
  return ".sh";
}

/**
 * Validate IPv4 address
 */
export function isValidIPv4(ip: string): boolean {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) return false;
  const parts = ip.split(".");
  return parts.every((part) => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * Check if string looks like an IPv4 address (for hostname validation)
 */
function looksLikeIPv4(str: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(str);
}

/**
 * Validate IPv6 address (comprehensive)
 */
export function isValidIPv6(ip: string): boolean {
  // Full IPv6: 8 groups of 4 hex digits
  const fullIPv6 = /^[0-9a-fA-F]{1,4}(:[0-9a-fA-F]{1,4}){7}$/;

  // With :: compression (various positions)
  const compressedIPv6 = /^(([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4})?::(([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4})?$/;

  // :: alone
  const emptyIPv6 = /^::$/;

  return fullIPv6.test(ip) || compressedIPv6.test(ip) || emptyIPv6.test(ip);
}

/**
 * Validate hostname
 */
export function isValidHostname(hostname: string): boolean {
  if (!hostname || hostname.length > 253) return false;

  // Reject strings that look like IPv4 addresses but are invalid
  if (looksLikeIPv4(hostname)) return false;

  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return hostnameRegex.test(hostname);
}

/**
 * Validate IP address (IPv4, IPv6, or hostname)
 */
export function isValidIP(ip: string): boolean {
  return isValidIPv4(ip) || isValidIPv6(ip) || isValidHostname(ip);
}

/**
 * Validate port number
 */
export function isValidPort(port: string): boolean {
  // Reject empty, non-numeric, or decimal strings
  if (!port || !/^\d+$/.test(port)) return false;

  const portNum = parseInt(port, 10);
  return portNum >= 1 && portNum <= 65535;
}

/**
 * URL encode a string
 */
export function urlEncode(str: string): string {
  return encodeURIComponent(str);
}

/**
 * Base64 encode a string
 */
export function base64Encode(str: string): string {
  return Buffer.from(str).toString("base64");
}

/**
 * Base64 decode a string
 */
export function base64Decode(str: string): string {
  return Buffer.from(str, "base64").toString("utf-8");
}

/**
 * Replace IP and PORT placeholders in a string
 */
export function replacePlaceholders(str: string, ip: string, port: string): string {
  return str.replace(/{IP}/g, ip).replace(/{PORT}/g, port);
}

/**
 * Shell template interface
 */
export interface ShellTemplate {
  type: string;
  name: string;
  icon: string; // devicon URL or emoji
  command: string;
  description: string;
  category: "reverse" | "bind" | "msfvenom";
  subcategory: string;
  os: ("linux" | "windows" | "mac")[];
  listener?: string;
}

/**
 * Get devicon URL for a shell type
 */
export function getDeviconUrl(type: string): string {
  const baseUrl = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons";

  const iconMap: Record<string, string> = {
    // Shell Tools
    "bash-tcp": "bash/bash-original.svg",
    "bash-exec": "bash/bash-original.svg",
    "bash-196": "bash/bash-original.svg",
    "bash-udp": "bash/bash-original.svg",
    "bash-read-line": "bash/bash-original.svg",
    "bash-5": "bash/bash-original.svg",
    zsh: "bash/bash-original.svg",
    "nc-busybox": "linux/linux-original.svg",
    "nc-exe": "windows8/windows8-original.svg",
    "ncat-exe": "windows8/windows8-original.svg",
    "ncat-udp": "linux/linux-original.svg",
    "nc-standard": "linux/linux-original.svg",
    "nc-fifo": "linux/linux-original.svg",
    "nc-openbsd": "linux/linux-original.svg",
    ncat: "linux/linux-original.svg",
    socat: "linux/linux-original.svg",
    "sqlite3-nc": "sqlite/sqlite-original.svg",
    "socat-tty": "linux/linux-original.svg",
    haskell: "haskell/haskell-original.svg",
    telnet: "linux/linux-original.svg",

    // Scripting Languages
    python2: "python/python-original.svg",
    python3: "python/python-original.svg",
    "python-shortest": "python/python-original.svg",
    "python-windows": "python/python-original.svg",
    "python-2-var": "python/python-original.svg",
    "php-exec": "php/php-original.svg",
    "php-system": "php/php-original.svg",
    "php-passthru": "php/php-original.svg",
    "php-shell_exec": "php/php-original.svg",
    "php-ivan": "php/php-original.svg",
    "php-pentestmonkey": "php/php-original.svg",
    "perl-no-sh": "perl/perl-original.svg",
    "perl-pm": "perl/perl-original.svg",
    perl: "perl/perl-original.svg",
    "ruby-no-sh": "ruby/ruby-original.svg",
    ruby: "ruby/ruby-original.svg",
    nodejs: "nodejs/nodejs-original.svg",
    "nodejs-2": "nodejs/nodejs-original.svg",
    "lua-2": "lua/lua-original.svg",

    // Compiled Languages
    golang: "go/go-original.svg",
    rust: "rust/rust-original.svg",
    crystal: "crystal/crystal-original.svg",
    dart: "dart/dart-original.svg",
    java: "java/java-original.svg",
    "java-2": "java/java-original.svg",
    "java-3": "java/java-original.svg",

    // Windows
    "powershell-1": "powershell/powershell-original.svg",
    "powershell-2": "powershell/powershell-original.svg",
    "powershell-3": "powershell/powershell-original.svg",
    "powershell-4": "powershell/powershell-original.svg",
    "powershell-5": "powershell/powershell-original.svg",
    cmd: "windows8/windows8-original.svg",

    // Other
    csharp: "csharp/csharp-original.svg",
    swift: "swift/swift-original.svg",
    kotlin: "kotlin/kotlin-original.svg",
    typescript: "typescript/typescript-original.svg",
  };

  const iconPath = iconMap[type] || "linux/linux-original.svg";
  return `${baseUrl}/${iconPath}`;
}

/**
 * Generate command with replaced placeholders
 * Handles special case for powershell-base64: decode, replace, then re-encode
 */
export function generateCommand(template: ShellTemplate, ip: string, port: string): ShellTemplate {
  // Special handling for powershell-base64: decode, replace, then re-encode
  if (template.type === "powershell-base64") {
    const decoded = base64Decode(template.command);
    const replaced = replacePlaceholders(decoded, ip, port);
    const encoded = base64Encode(replaced);
    return {
      ...template,
      command: encoded,
      listener: template.listener ? replacePlaceholders(template.listener, ip, port) : undefined,
    };
  }

  return {
    ...template,
    command: replacePlaceholders(template.command, ip, port),
    listener: template.listener ? replacePlaceholders(template.listener, ip, port) : undefined,
  };
}

/**
 * Group templates by subcategory
 */
export function groupBySubcategory(templates: ShellTemplate[]): Record<string, ShellTemplate[]> {
  const groups: Record<string, ShellTemplate[]> = {};
  for (const template of templates) {
    const subcategory = template.subcategory;
    if (!groups[subcategory]) {
      groups[subcategory] = [];
    }
    groups[subcategory].push(template);
  }
  return groups;
}

/**
 * Get OS tag color for display
 */
export function getOSTagColor(os: string): string {
  switch (os) {
    case "linux":
      return "#FCC624";
    case "windows":
      return "#0078D4";
    case "mac":
      return "#A2AAAD";
    default:
      return "#888888";
  }
}
