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
  icon: string;
  command: string;
  description: string;
  category: "reverse" | "bind" | "msfvenom";
  subcategory: string;
  os: ("linux" | "windows" | "mac")[];
  listener?: string;
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
