import { Screen } from './archive';

export interface ConnectOptions {
  observe?: boolean;
  guest?: boolean;
}

/**
 * How to reach a screen. `saved` opens the screen from Screens' own library, which carries its
 * stored settings and credentials. `direct` addresses the host itself and carries none of that.
 */
export type ConnectTarget = { kind: 'saved'; identifier: string; ambiguous: boolean } | { kind: 'direct'; url: string };

const DEFAULT_VNC_PORT = 5900;

/**
 * Decides how to reach `screen`.
 *
 * `screens://` takes a name or hostname and never an id, so an identifier that matches more than
 * one entry is ambiguous. `all` must be every screen in the archive, not the subset the user
 * imported: Screens still holds the whole library, so a name dropped at import time can still
 * collide.
 */
export function resolveTarget(screen: Screen, all: Screen[]): ConnectTarget {
  // A url-type screen stores the exact target it was created from. Nothing to guess.
  if (screen.sourceURL) {
    return { kind: 'direct', url: screen.sourceURL };
  }

  const hostname = normalizeHostname(screen.hostname);
  if (hostname && isUniqueIdentifier(hostname, screen, all)) {
    return { kind: 'saved', identifier: hostname, ambiguous: false };
  }

  const name = screen.name.trim();
  if (name && isUniqueIdentifier(name, screen, all)) {
    return { kind: 'saved', identifier: name, ambiguous: false };
  }

  const direct = directUrl(screen);
  if (direct) {
    return { kind: 'direct', url: direct };
  }

  // An RDP screen has no ad-hoc URL scheme, so an ambiguous name is the only remaining handle.
  return { kind: 'saved', identifier: name || hostname, ambiguous: true };
}

export function targetUrl(target: ConnectTarget, options: ConnectOptions = {}): string {
  const query = buildQuery(options);
  if (target.kind === 'direct') {
    return appendQuery(target.url, query);
  }
  return `screens://${encodeURIComponent(target.identifier)}${query}`;
}

/** What the target actually addresses, for display and for copying. */
export function describeTarget(target: ConnectTarget): string {
  return target.kind === 'direct' ? target.url : target.identifier;
}

/** The address of the host itself, bypassing the library. Only VNC has an ad-hoc URL scheme. */
export function directUrl(screen: Screen): string | undefined {
  if (screen.clientProtocol !== 'vnc') return undefined;

  const address = directAddress(screen);
  if (!address) return undefined;

  const credentials = screen.username ? `${encodeURIComponent(screen.username)}@` : '';
  const suffix = address.port && address.port !== DEFAULT_VNC_PORT ? `:${address.port}` : '';

  return `vnc://${credentials}${address.host}${suffix}`;
}

/**
 * Where the host answers. A local screen is reached by its Bonjour name: Screens also records the
 * network's public address on those, but that routes out to the WAN, and every machine behind one
 * router shares it. Tailscale and remote screens are reached at the recorded address, which for
 * Tailscale is the stable 100.x address and is more dependable than its hostname.
 */
function directAddress(screen: Screen): { host: string; port: number } | undefined {
  const hostname = normalizeHostname(screen.hostname);
  const byHostname = hostname ? { host: hostname, port: screen.port } : undefined;

  if (screen.type === 'local') return byHostname;
  if (screen.publicIpAddress) {
    return { host: screen.publicIpAddress, port: screen.publicPort ?? screen.port };
  }
  return byHostname;
}

export function adHocUrl(
  host: string,
  protocol: 'vnc' | 'ssh',
  options: ConnectOptions & { port?: string; username?: string } = {},
): string {
  const credentials = options.username ? `${encodeURIComponent(options.username.trim())}@` : '';
  const port = options.port?.trim() ? `:${options.port.trim()}` : '';
  return `${protocol}://${credentials}${host.trim()}${port}${buildQuery(options)}`;
}

/**
 * Screens stores Bonjour hostnames fully qualified, e.g. `Mac-Studio.local.`. The trailing dot is
 * dropped so the stored form and the form a user would type compare and address the same.
 */
export function normalizeHostname(hostname: string): string {
  return hostname.trim().replace(/\.+$/, '');
}

/**
 * Whether `identifier` addresses only `screen`. Screens matches a `screens://` host against both
 * names and hostnames, so a collision with either field on any other screen is ambiguous.
 * The comparison is case-insensitive because the matching rule is undocumented.
 */
function isUniqueIdentifier(identifier: string, screen: Screen, all: Screen[]): boolean {
  const target = identifier.toLowerCase();
  return all.every(
    (other) =>
      other.id === screen.id ||
      (normalizeHostname(other.hostname).toLowerCase() !== target && other.name.trim().toLowerCase() !== target),
  );
}

function appendQuery(url: string, query: string): string {
  if (!query) return url;
  return url.includes('?') ? `${url}&${query.slice(1)}` : url + query;
}

function buildQuery(options: ConnectOptions): string {
  const params = new URLSearchParams();
  if (options.observe) params.set('observe', 'true');
  if (options.guest) params.set('guest', 'true');
  const query = params.toString();
  return query ? `?${query}` : '';
}
