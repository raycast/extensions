import type { PortProcess } from "./types";

export function localEndpoint(endpoint: string): string {
  return endpoint.split("->")[0]?.trim() ?? endpoint;
}

export function portDetailSubtitle(entry: PortProcess): string {
  const endpoint = localEndpoint(entry.endpoint);
  return `:${entry.port} · PID ${entry.pid} · ${endpoint}`;
}

// Use http:// because virtually every local dev server speaks HTTP on its
// listener port. Users running HTTPS locally can adjust the scheme in the
// browser's address bar after the page opens.
export function localhostUrl(port: number): string {
  return `http://localhost:${port}`;
}

export function statusSummary(portCount: number, processCount: number, isLoading: boolean): string {
  if (isLoading && portCount === 0) {
    return "Scanning…";
  }
  if (portCount === 0) {
    return "No listeners";
  }
  const processWord = processCount === 1 ? "process" : "processes";
  return `${portCount} ${portCount === 1 ? "port" : "ports"} · ${processCount} ${processWord}`;
}
