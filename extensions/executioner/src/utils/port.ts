import { execSync } from "child_process";
import type { PortProcess } from "../types";

export function findProcessesByPort(port: number): PortProcess[] {
  try {
    const output = execSync(`/usr/sbin/lsof -iTCP:${port} -sTCP:LISTEN -P -n`, {
      maxBuffer: 5 * 1024 * 1024,
      shell: "/bin/zsh",
      stdio: ["pipe", "pipe", "pipe"],
    }).toString();

    const lines = output.split("\n").slice(1); // skip header
    const results: PortProcess[] = [];
    const seen = new Set<number>();

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 9) continue;

      const command = parts[0];
      const pid = parseInt(parts[1]);
      if (isNaN(pid) || seen.has(pid)) continue;
      seen.add(pid);

      results.push({ pid, port, protocol: "TCP", command });
    }

    return results;
  } catch {
    return [];
  }
}

export function findAllListeningPorts(): PortProcess[] {
  try {
    const output = execSync("/usr/sbin/lsof -iTCP -sTCP:LISTEN -P -n", {
      maxBuffer: 10 * 1024 * 1024,
      shell: "/bin/zsh",
      stdio: ["pipe", "pipe", "pipe"],
    }).toString();

    const lines = output.split("\n").slice(1);
    const results: PortProcess[] = [];
    const seen = new Set<string>();

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 9) continue;

      const command = parts[0];
      const pid = parseInt(parts[1]);
      const nameField = parts[8]; // e.g., *:3000 or 127.0.0.1:8080
      const portMatch = nameField.match(/:(\d+)$/);
      if (!portMatch) continue;

      const port = parseInt(portMatch[1]);
      const key = `${pid}:${port}`;
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({ pid, port, protocol: "TCP", command });
    }

    return results;
  } catch {
    return [];
  }
}

export function getProcessPorts(pid: number): number[] {
  try {
    const output = execSync(`/usr/sbin/lsof -p ${pid} -iTCP -P -n`, {
      maxBuffer: 5 * 1024 * 1024,
      shell: "/bin/zsh",
      stdio: ["pipe", "pipe", "pipe"],
    }).toString();

    const ports = new Set<number>();
    const lines = output.split("\n").slice(1);

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 9) continue;
      const nameField = parts[8];
      const portMatch = nameField.match(/:(\d+)$/);
      if (portMatch) ports.add(parseInt(portMatch[1]));
    }

    return [...ports].sort((a, b) => a - b);
  } catch {
    return [];
  }
}
