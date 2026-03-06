import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export const CONTAINER_BIN = "/usr/local/bin/container";

// Seconds between Unix epoch (1970-01-01) and Apple CFAbsoluteTime epoch (2001-01-01)
export const APPLE_EPOCH_OFFSET = 978307200;

export interface Container {
  name: string;
  image: string;
  imageDigest: string;
  status: "running" | "stopped" | "created";
  startedAt?: string;

  ports: PortMapping[];

  cpus: number;
  memoryInBytes: number;

  networkName: string;
  hostname: string;
  ipv4Address: string;
  ipv6Address: string;
  macAddress: string;
  ipv4Gateway: string;

  mounts: Mount[];

  environment: string[];
  executable: string;
  arguments: string[];
  workingDirectory: string;

  platform: string;
  labels: Record<string, string>;

  rosetta: boolean;
  readOnly: boolean;
  useInit: boolean;
  ssh: boolean;
}

export interface Mount {
  type: string;
  source: string;
  destination: string;
  options: string[];
}

export interface Image {
  reference: string;
  digest: string;
  fullSize: string;
  createdAt: string;
}

export interface PortMapping {
  hostPort: number;
  containerPort: number;
  protocol: "tcp" | "udp";
  hostAddress: string;
}

export interface Network {
  id: string;
  state: string;
  mode: string;
  isBuiltin: boolean;
}

export async function containerExec(args: string[], options?: { timeout?: number }): Promise<string> {
  const { stdout } = await execFileAsync(CONTAINER_BIN, args, {
    timeout: options?.timeout ?? 30000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout.trim();
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export function parseNetworkList(stdout: string): Network[] {
  if (!stdout) return [];
  try {
    const data = JSON.parse(stdout);
    const items = Array.isArray(data) ? data : [];
    return items.map((n: any) => ({
      id: n.id || n.config?.id || "",
      state: n.state || "",
      mode: n.config?.mode || "",
      isBuiltin: "com.apple.container.resource.role" in (n.config?.labels || {}),
    }));
  } catch {
    return [];
  }
}

export function parseContainerList(stdout: string): Container[] {
  if (!stdout) return [];
  try {
    const data = JSON.parse(stdout);
    const items = Array.isArray(data) ? data : [];
    return items.map((c: any) => {
      const config = c.configuration || {};
      const resources = config.resources || {};
      const initProcess = config.initProcess || {};
      const configNetworks: any[] = config.networks || [];
      const runtimeNetworks: any[] = c.networks || [];
      const runtime = runtimeNetworks[0] || {};
      const publishedPorts: any[] = config.publishedPorts || [];
      const rawMounts: any[] = config.mounts || [];
      const platform = config.platform || {};

      return {
        name: config.id || "",
        image: config.image?.reference || "",
        imageDigest: config.image?.descriptor?.digest || "",
        status: normalizeStatus(c.status || "stopped"),
        startedAt: c.startedDate ? new Date((c.startedDate + APPLE_EPOCH_OFFSET) * 1000).toISOString() : undefined,

        ports: publishedPorts.map((p: any) => ({
          hostPort: Number(p.hostPort || 0),
          containerPort: Number(p.containerPort || 0),
          protocol: (p.proto || "tcp") as "tcp" | "udp",
          hostAddress: p.hostAddress || "0.0.0.0",
        })),

        cpus: Number(resources.cpus || 0),
        memoryInBytes: Number(resources.memoryInBytes || 0),

        networkName: configNetworks[0]?.network || "default",
        hostname: configNetworks[0]?.options?.hostname || runtime.hostname || "",
        ipv4Address: runtime.ipv4Address || "",
        ipv6Address: runtime.ipv6Address || "",
        macAddress: runtime.macAddress || "",
        ipv4Gateway: runtime.ipv4Gateway || "",

        mounts: rawMounts.map((m: any) => ({
          type: parseMountType(m.type),
          source: m.source || "",
          destination: m.destination || "",
          options: m.options || [],
        })),

        environment: initProcess.environment || [],
        executable: initProcess.executable || "",
        arguments: initProcess.arguments || [],
        workingDirectory: initProcess.workingDirectory || "/",

        platform: [platform.os, platform.architecture, platform.variant].filter(Boolean).join("/"),
        labels: config.labels || {},

        rosetta: config.rosetta === true,
        readOnly: config.readOnly === true,
        useInit: config.useInit === true,
        ssh: config.ssh === true,
      };
    });
  } catch {
    return [];
  }
}

export function parseImageList(stdout: string): Image[] {
  if (!stdout) return [];
  try {
    const data = JSON.parse(stdout);
    const items = Array.isArray(data) ? data : [];
    return items.map((i: any) => ({
      reference: i.reference || "",
      digest: i.descriptor?.digest || "",
      fullSize: i.fullSize || "",
      createdAt: i.descriptor?.annotations?.["org.opencontainers.image.created"] || "",
    }));
  } catch {
    return [];
  }
}

export function isSystemContainer(c: Container): boolean {
  return "com.apple.container.resource.role" in c.labels;
}

function normalizeStatus(s: string): Container["status"] {
  const lower = s.toLowerCase();
  if (lower.includes("running") || lower.includes("up")) return "running";
  if (lower.includes("created")) return "created";
  return "stopped";
}

function parseMountType(type: any): string {
  if (!type || typeof type !== "object") return "unknown";
  const keys = Object.keys(type);
  return keys[0] || "unknown";
}
