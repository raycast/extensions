const DOCKER_LIBRARY_PREFIX = "docker.io/library/";
const DOCKER_PREFIX = "docker.io/";
const SHA256_PREFIX = "sha256:";

/** Formats a byte count using binary units (1024). */
export function humanBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const k = 1024;
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const value = bytes / Math.pow(k, exponent);
  return `${value.toFixed(exponent === 0 ? 0 : decimals)} ${units[exponent]}`;
}

/** Removes the CIDR suffix from an address, e.g. "192.168.64.4/24" -> "192.168.64.4". */
export function stripCidr(address?: string): string | undefined {
  if (!address) {
    return undefined;
  }
  const slash = address.indexOf("/");
  return slash === -1 ? address : address.slice(0, slash);
}

/** Drops the redundant Docker Hub prefix from an image reference for display. */
export function shortenImageRef(reference: string): string {
  if (reference.startsWith(DOCKER_LIBRARY_PREFIX)) {
    return reference.slice(DOCKER_LIBRARY_PREFIX.length);
  }
  if (reference.startsWith(DOCKER_PREFIX)) {
    return reference.slice(DOCKER_PREFIX.length);
  }
  return reference;
}

/** Returns a short hex prefix of a digest (handles both "sha256:..." and bare hex). */
export function trimDigest(digest: string, length = 12): string {
  const hex = digest.startsWith(SHA256_PREFIX) ? digest.slice(SHA256_PREFIX.length) : digest;
  return hex.slice(0, length);
}

/** Human-friendly relative time, e.g. "3m ago". */
export function relativeDate(date?: Date): string {
  if (!date) {
    return "—";
  }
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 0) {
    return "just now";
  }
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Absolute timestamp with a fixed `en-US` locale so the rendered date does not
 * depend on the runtime locale (e.g. "Jun 25, 2026, 01:39 PM").
 */
export function formatTimestamp(iso?: string): string {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
