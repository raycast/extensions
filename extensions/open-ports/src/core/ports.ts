import { Listener } from "./types";

/**
 * A hint about the port itself, independent of whichever process happens to hold it.
 * Extend this table rather than adding special cases elsewhere.
 */
const WELL_KNOWN_PORTS: ReadonlyMap<number, string> = new Map([
  [22, "SSH"],
  [25, "SMTP"],
  [53, "DNS"],
  [80, "HTTP"],
  [110, "POP3"],
  [143, "IMAP"],
  [443, "HTTPS"],
  [445, "SMB"],
  [548, "AFP"],
  [631, "IPP / CUPS"],
  [1025, "SMTP (alt)"],
  [1080, "SOCKS Proxy"],
  [1433, "SQL Server"],
  [1521, "Oracle DB"],
  [2375, "Docker"],
  [2376, "Docker (TLS)"],
  [3000, "Dev Server"],
  [3001, "Dev Server"],
  [3128, "Squid Proxy"],
  [3306, "MySQL / MariaDB"],
  [4000, "Dev Server"],
  [4200, "Angular Dev Server"],
  [5000, "Dev Server / AirPlay"],
  [5173, "Vite Dev Server"],
  [5432, "PostgreSQL"],
  [5900, "VNC / Screen Sharing"],
  [6379, "Redis"],
  [7000, "AirPlay Receiver"],
  [8000, "Dev Server"],
  [8080, "HTTP (alt)"],
  [8443, "HTTPS (alt)"],
  [8888, "Jupyter / HTTP (alt)"],
  [9000, "Dev Server / PHP-FPM"],
  [9200, "Elasticsearch"],
  [11211, "Memcached"],
  [11434, "Ollama"],
  [27017, "MongoDB"],
  [50000, "Dev Server"],
]);

export function wellKnownPort(port: number): string | undefined {
  return WELL_KNOWN_PORTS.get(port);
}

const HTTPS_PORTS = new Set([443, 8443]);

/**
 * Best-effort URL for opening a listener in a browser. Only http and https are ever
 * produced, and IPv6 literals are bracketed so the result is a well-formed URL.
 */
export function browserUrl(listener: Listener): string {
  const scheme = HTTPS_PORTS.has(listener.port) ? "https" : "http";
  const host = reachableHost(listener);
  return `${scheme}://${host}:${listener.port}`;
}

function reachableHost(listener: Listener): string {
  if (listener.exposure === "specific") {
    const binding = listener.bindings[0];
    return binding.ipVersion === "IPv6" ? `[${encodeURIComponent(binding.host)}]` : binding.host;
  }
  // A wildcard or loopback binding is always reachable over the loopback interface,
  // via IPv4 when the process bound it and via IPv6 otherwise.
  return listener.ipVersions.includes("IPv4") ? "localhost" : "[::1]";
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
