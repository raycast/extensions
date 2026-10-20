import { ClientProtocol, Connection } from "./archive";
import { isAuthorityHost, isAuthorityPort, parseAuthority } from "./authority";

export interface ConnectOptions {
  observe?: boolean;
  guest?: boolean;
}

/**
 * How to reach a connection. `saved` opens the connection from Screens' own library, which carries its
 * stored settings and credentials. `direct` addresses the host itself and carries none of that.
 */
export type ConnectTarget = { kind: "saved"; identifier: string; ambiguous: boolean } | { kind: "direct"; url: string };

export type AdHocProtocol = "vnc" | "ssh";

export const DEFAULT_PORTS: Record<AdHocProtocol, number> = { vnc: 5900, ssh: 22 };

/** A typed port a URL authority can carry. Anything else addresses a different machine than intended. */
export function isValidPort(port: string): boolean {
  const trimmed = port.trim();
  return /^\d+$/.test(trimmed) && isAuthorityPort(Number(trimmed));
}

/** A connection target as someone would type it. */
export interface HostSpec {
  host: string;
  protocol?: AdHocProtocol;
  port?: string;
  username?: string;
}

/**
 * Reads a typed target such as `admin@desk-imac.local:5901`, `ssh://192.0.2.10`, or `[2001:db8::1]`.
 * Returns undefined for anything that isn't a target this extension can open, so a caller can fall
 * back to asking for the pieces separately.
 *
 * An IPv6 literal has to be bracketed, exactly as in a URL: unbracketed, its colons are
 * indistinguishable from a port separator.
 */
export function parseHostSpec(spec: string): HostSpec | undefined {
  let rest = spec.trim();
  if (!rest) return undefined;

  let protocol: AdHocProtocol | undefined;
  const scheme = /^([a-z][a-z0-9+.-]*):\/\//i.exec(rest);
  if (scheme) {
    const named = scheme[1].toLowerCase();
    if (named !== "vnc" && named !== "ssh") return undefined;
    protocol = named;
    rest = rest.slice(scheme[0].length).replace(/[/?#].*$/, "");
  }

  const separator = rest.lastIndexOf("@");
  const username = separator === -1 ? undefined : rest.slice(0, separator);
  const authority = rest.slice(separator + 1);

  const parsed = parseAuthority(authority);
  if (!parsed) return undefined;

  return { ...parsed, protocol, username };
}

/**
 * Decides how to reach `connection`.
 *
 * `screens://` takes a name or hostname and never an id, so an identifier that matches more than
 * one entry is ambiguous. `all` must be every connection in the archive: Screens still holds the
 * whole library, so a name dropped at import time can still collide.
 */
export function resolveTarget(connection: Connection, all: Connection[]): ConnectTarget {
  if (connection.sourceURL) {
    return { kind: "direct", url: connection.sourceURL };
  }

  const hostname = normalizeHostname(connection.hostname);
  if (hostname && isUniqueIdentifier(hostname, connection, all)) {
    return { kind: "saved", identifier: hostname, ambiguous: false };
  }

  const name = connection.name.trim();
  if (name && isUniqueIdentifier(name, connection, all)) {
    return { kind: "saved", identifier: name, ambiguous: false };
  }

  const direct = directUrl(connection);
  if (direct) {
    return { kind: "direct", url: direct };
  }

  // An RDP connection has no ad-hoc URL scheme, so an ambiguous name is the only remaining handle.
  return { kind: "saved", identifier: name || hostname, ambiguous: true };
}

export function targetUrl(target: ConnectTarget, options: ConnectOptions = {}): string {
  const query = buildQuery(options);
  if (target.kind === "direct") {
    return appendQuery(target.url, query);
  }
  return `screens://${encodeURIComponent(target.identifier)}${query}`;
}

/**
 * Whether Observe Mode and Guest apply. Both are Apple screen-sharing options, so they reach only a
 * VNC connection: SSH has no screen to share, and RDP authenticates against Windows, which has
 * neither an observe mode nor a guest account to offer.
 */
export function supportsScreenSharing(target: ConnectTarget, clientProtocol: ClientProtocol): boolean {
  if (clientProtocol !== "vnc") return false;
  return !(target.kind === "direct" && target.url.toLowerCase().startsWith("ssh://"));
}

export function describeTarget(target: ConnectTarget): string {
  return target.kind === "direct" ? target.url : target.identifier;
}

/** Only VNC has an ad-hoc URL scheme. */
function directUrl(connection: Connection): string | undefined {
  if (connection.clientProtocol !== "vnc") return undefined;

  const address = directAddress(connection);
  if (!address) return undefined;

  const credentials = connection.username ? `${encodeURIComponent(connection.username)}@` : "";
  const suffix = address.port && address.port !== DEFAULT_PORTS.vnc ? `:${address.port}` : "";

  return `vnc://${credentials}${formatHost(address.host)}${suffix}`;
}

/**
 * Where the host answers. A local connection is reached by its Bonjour name: Screens also records
 * the network's public address on those, but that routes out to the WAN, and every machine behind
 * one router shares it. Tailscale and remote connections are reached at the recorded address,
 * because their hostname is a display name, e.g. `Front Desk iMac`.
 *
 * Both fields arrive from a file the user picked, so each is held to what a URL authority can
 * carry. A display label fails that test, as does an address that would splice itself into the URL.
 */
function directAddress(connection: Connection): { host: string; port?: number } | undefined {
  const hostname = normalizeHostname(connection.hostname);
  const byHostname = isAuthorityHost(hostname) ? { host: hostname, port: connection.port } : undefined;

  if (connection.type === "local") return byHostname;
  if (connection.publicIpAddress && isAuthorityHost(connection.publicIpAddress)) {
    return { host: connection.publicIpAddress, port: connection.publicPort ?? connection.port };
  }
  return byHostname;
}

export function adHocUrl(
  host: string,
  protocol: AdHocProtocol,
  options: ConnectOptions & { port?: string; username?: string } = {},
): string {
  const credentials = options.username ? `${encodeURIComponent(options.username.trim())}@` : "";
  const port = options.port?.trim() ? `:${options.port.trim()}` : "";
  return `${protocol}://${credentials}${formatHost(host.trim())}${port}${buildQuery(options)}`;
}

/**
 * An IPv6 literal has to be bracketed to sit in a URL authority, e.g. `vnc://[2001:db8::1]:5900`.
 * Screens records one in `publicIpAddress` wherever the host answers on IPv6.
 */
function formatHost(host: string): string {
  return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
}

/**
 * Screens stores Bonjour hostnames fully qualified, e.g. `office-imac.local.`. The trailing dot is
 * dropped so the stored form and the form a user would type compare and address the same.
 */
export function normalizeHostname(hostname: string): string {
  return hostname.trim().replace(/\.+$/, "");
}

/**
 * Whether `identifier` addresses only `connection`. Screens matches a `screens://` host against both
 * names and hostnames, so a collision with either field on any other connection is ambiguous.
 * The comparison is case-insensitive because the matching rule is undocumented.
 */
function isUniqueIdentifier(identifier: string, connection: Connection, all: Connection[]): boolean {
  const target = identifier.toLowerCase();
  return all.every(
    (other) =>
      other.id === connection.id ||
      (normalizeHostname(other.hostname).toLowerCase() !== target && other.name.trim().toLowerCase() !== target),
  );
}

function appendQuery(url: string, query: string): string {
  if (!query) return url;
  return url.includes("?") ? `${url}&${query.slice(1)}` : url + query;
}

function buildQuery(options: ConnectOptions): string {
  const params = new URLSearchParams();
  if (options.observe) params.set("observe", "true");
  if (options.guest) params.set("guest", "true");
  const query = params.toString();
  return query ? `?${query}` : "";
}
