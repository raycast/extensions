// Adding a protocol is a table entry here plus a port/fstype entry in
// lib/mount.ts. Share discovery stays SMB-only. AFP is absent: macOS 27
// dropped client support. "webdav-http" is explicit because it sends
// credentials in the clear; a self-signed cert works over plain "webdav".
export type Protocol = "smb" | "webdav" | "webdav-http";

export const PROTOCOLS: Protocol[] = ["smb", "webdav", "webdav-http"];

export const PROTOCOL_LABELS: Record<Protocol, string> = {
  smb: "SMB",
  webdav: "WebDAV",
  "webdav-http": "WebDAV (insecure, no TLS)",
};

const PROTOCOL_SCHEMES: Record<Protocol, string> = {
  smb: "smb",
  webdav: "https",
  "webdav-http": "http",
};

// SMB uses "user@" to select a Keychain entry. WebDAV never does: it makes
// mount_webdav fail with EINVAL, and it matches by server address anyway.
export const USER_IN_URL_PROTOCOLS = new Set<Protocol>(["smb"]);

export type ServerEntry = {
  id: string;
  host: string;
  // Absent for a browse-only entry with no share chosen yet.
  path?: string;
  alias?: string;
  user?: string;
  // Opt-in only, so a deliberately unmounted drive stays unmounted.
  autoMount?: boolean;
  // Absent on older entries; treated as "smb".
  protocol?: Protocol;
};

export type Share = {
  id: string;
  label: string;
  host: string;
  url: string;
  protocol: Protocol;
};

// eslint-disable-next-line no-control-regex -- rejects control characters and Windows-reserved path characters
const INVALID_PATH_SEGMENT = /[\x00-\x1f<>:"\\|?*]/;

// Each dot-separated label starts and ends alphanumeric, with hyphens allowed
// inside. That rejects a half-typed address — "10.0.0.", "nas..local", "-nas"
// — which the old pattern accepted and only failed much later, at mount time.
// An optional ":port" is allowed, mainly for self-hosted WebDAV.
const HOST_LABEL = "[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?";
export const HOST_PATTERN = new RegExp(`^${HOST_LABEL}(?:\\.${HOST_LABEL})*(?::\\d{1,5})?$`);

// Four numeric labels can only be an IPv4 address, so hold them to one:
// "10.0.0.999" passes the pattern above as a hostname but can never resolve.
export function isValidHost(host: string): boolean {
  if (!HOST_PATTERN.test(host)) return false;

  const octets = host.split(":")[0].split(".");
  if (octets.length === 4 && octets.every((octet) => /^\d+$/.test(octet))) {
    return octets.every((octet) => Number(octet) <= 255);
  }

  return true;
}

function pathSegments(path: string): string[] {
  return path
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

// What makes two saved entries the same drive: the same share on the same
// server over the same protocol. Alias and username are a label and a
// credential, not part of what gets mounted.
export function serverIdentity(entry: Pick<ServerEntry, "host" | "path" | "protocol">): string {
  const protocol = entry.protocol ?? "smb";
  const host = entry.host.trim().toLowerCase();
  // SMB share names are case-insensitive; WebDAV URL paths usually are not.
  const segments = pathSegments(entry.path ?? "");
  const path = (protocol === "smb" ? segments.map((segment) => segment.toLowerCase()) : segments).join("/");

  return `${protocol}://${host}/${path}`;
}

export function buildShare(entry: ServerEntry): Share {
  const protocol = entry.protocol ?? "smb";
  const host = entry.host.trim();
  const path = (entry.path ?? "").trim();
  const alias = entry.alias?.trim();
  const user = entry.user?.trim();

  if (!isValidHost(host)) {
    throw new Error(`Invalid IP address or hostname: "${entry.host}"`);
  }

  const segments = pathSegments(path);

  if (!segments.length || segments.some((segment) => INVALID_PATH_SEGMENT.test(segment))) {
    throw new Error(`Invalid share name or directory path: "${entry.path}"`);
  }

  const encodedPath = segments.map(encodeURIComponent).join("/");
  const authority = user && USER_IN_URL_PROTOCOLS.has(protocol) ? `${encodeURIComponent(user)}@${host}` : host;
  const scheme = PROTOCOL_SCHEMES[protocol];

  return {
    id: entry.id,
    label: alias || segments[segments.length - 1],
    host,
    url: `${scheme}://${authority}/${encodedPath}`,
    protocol,
  };
}
