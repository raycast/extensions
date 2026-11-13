/**
 * The host and port a URL authority can carry. A connection URL is assembled from parts an archive
 * recorded or a form supplied, and a part breaking these rules is read as a different piece of the
 * authority than it was meant to be: a host holding `@` moves the real host after it, and a port
 * outside the range addresses nothing.
 */

/**
 * A host on its own, carrying no user, port, or path. An IPv6 literal is the one form holding
 * colons, and it is the only form holding brackets: a bracket anywhere else leaves an authority
 * that reads as a literal up to the wrong point.
 */
export function isAuthorityHost(host: string): boolean {
  const trimmed = host.trim();
  if (!trimmed || /[@/?#\s]/.test(trimmed)) return false;

  if (trimmed.startsWith("[") || trimmed.endsWith("]")) {
    const literal = /^\[([^[\]]+)\]$/.exec(trimmed)?.[1];
    return literal !== undefined && isIpv6(literal);
  }

  return !/[[\]]/.test(trimmed) && (!trimmed.includes(":") || isIpv6(trimmed));
}

function isIpv6(literal: string): boolean {
  return /^[0-9a-f:]+$/i.test(literal);
}

export function isAuthorityPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * The host and port an authority names, or undefined when it names something unreachable.
 * `authority` is what sits between the scheme and the path, with any userinfo already removed.
 * The host comes back unbracketed, which is the form the rest of the extension stores and compares.
 */
export function parseAuthority(authority: string): { host: string; port?: string } | undefined {
  const bracketed = /^\[([^\]]+)\](?::(\d+))?$/.exec(authority);
  if (bracketed) {
    const [, literal, port] = bracketed;
    if (port !== undefined && !isAuthorityPort(Number(port))) return undefined;
    return isAuthorityHost(`[${literal}]`) ? { host: literal, port } : undefined;
  }

  const parts = authority.split(":");
  const port = parts.length === 2 && /^\d+$/.test(parts[1]) ? parts[1] : undefined;
  if (port !== undefined && !isAuthorityPort(Number(port))) return undefined;

  const host = port === undefined ? authority : parts[0];
  return isAuthorityHost(host) ? { host, port } : undefined;
}
