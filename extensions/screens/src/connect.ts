import { Screen } from './archive';

export interface ConnectOptions {
  observe?: boolean;
  guest?: boolean;
}

export interface ConnectTarget {
  url: string;
  /**
   * True when the URL asks Screens to open a screen from the library, which carries its stored
   * settings and credentials. False when the URL addresses the host directly instead.
   */
  viaSavedScreen: boolean;
  /** True when the identifier in the URL matches more than one saved screen and Screens picks. */
  ambiguous: boolean;
}

const DEFAULT_VNC_PORT = 5900;

/**
 * Builds the URL that connects to `screen`.
 *
 * `screens://` takes a name or hostname, never an id, so a screen whose name and hostname are both
 * shared with another screen cannot be addressed unambiguously. `all` is the rest of the library,
 * used to detect that case and fall back to the host's address.
 */
export function connectUrl(screen: Screen, all: Screen[], options: ConnectOptions = {}): ConnectTarget {
  const query = buildQuery(options);

  // A url-type screen stores the exact target it was created from. Nothing to guess.
  if (screen.sourceURL) {
    return { url: appendQuery(screen.sourceURL, query), viaSavedScreen: false, ambiguous: false };
  }

  const hostname = normalizeHostname(screen.hostname);
  if (hostname && isUniqueIdentifier(hostname, screen, all)) {
    return { url: `screens://${encodeURIComponent(hostname)}${query}`, viaSavedScreen: true, ambiguous: false };
  }

  const name = screen.name.trim();
  if (name && isUniqueIdentifier(name, screen, all)) {
    return { url: `screens://${encodeURIComponent(name)}${query}`, viaSavedScreen: true, ambiguous: false };
  }

  const direct = directUrl(screen, query);
  if (direct) {
    return { url: direct, viaSavedScreen: false, ambiguous: false };
  }

  // An RDP screen has no ad-hoc URL scheme, so an ambiguous name is the only remaining handle.
  return { url: `screens://${encodeURIComponent(name || hostname)}${query}`, viaSavedScreen: true, ambiguous: true };
}

/** The address of the host itself, bypassing the library. Only VNC has an ad-hoc URL scheme. */
export function directUrl(screen: Screen, query = ''): string | undefined {
  if (screen.clientProtocol !== 'vnc') return undefined;

  const host = screen.publicIpAddress ?? normalizeHostname(screen.hostname);
  if (!host) return undefined;

  const port = screen.publicIpAddress ? (screen.publicPort ?? screen.port) : screen.port;
  const credentials = screen.username ? `${encodeURIComponent(screen.username)}@` : '';
  const suffix = port && port !== DEFAULT_VNC_PORT ? `:${port}` : '';

  return `vnc://${credentials}${host}${suffix}${query}`;
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
