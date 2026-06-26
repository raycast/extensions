import { execSync } from "child_process";

const WARP_CLI = `"C:\\Program Files\\Cloudflare\\Cloudflare WARP\\warp-cli.exe"`;

export type WarpMode =
  | "warp"
  | "doh"
  | "warp+doh"
  | "dot"
  | "warp+dot"
  | "proxy"
  | "tunnel_only";

export interface WarpStatus {
  connected: boolean;
  mode: string;
  raw: string;
}

export function runCli(args: string): string {
  try {
    return execSync(`${WARP_CLI} ${args}`, {
      encoding: "utf8",
      timeout: 8000,
    }).trim();
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    throw new Error(err.stderr?.trim() || err.message || "warp-cli failed");
  }
}

export function getStatus(): WarpStatus {
  const rawStatus = runCli("status");
  const connected =
    /Connected/i.test(rawStatus) && !/Disconnected/i.test(rawStatus);

  let mode = "–";
  try {
    const rawSettings = runCli("settings");
    const modeMatch = rawSettings.match(/Mode:\s*([^\n]+)/i);
    if (modeMatch) {
      const rawMode = modeMatch[1].trim().toLowerCase();
      if (rawMode.startsWith("dnsoverhttps")) mode = "doh";
      else if (rawMode.startsWith("dnsovertls")) mode = "dot";
      else if (rawMode.startsWith("warpwithdnsoverhttps")) mode = "warp+doh";
      else if (rawMode.startsWith("warpwithdnsovertls")) mode = "warp+dot";
      else if (rawMode.startsWith("warpproxy")) mode = "proxy";
      else if (rawMode.startsWith("tunnelonly")) mode = "tunnel_only";
      else if (rawMode.startsWith("warp")) mode = "warp";
      else mode = modeMatch[1].trim();
    }
  } catch (e) {
    // Ignore error and leave mode as "–"
  }

  return { connected, mode, raw: rawStatus };
}

export function connect(): string {
  return runCli("connect");
}

export function disconnect(): string {
  return runCli("disconnect");
}

export function setMode(mode: WarpMode): string {
  return runCli(`mode ${mode}`);
}

export const MODES: { value: WarpMode; label: string }[] = [
  { value: "doh", label: "DNS only (HTTPS)" },
  { value: "dot", label: "DNS only (TLS)" },
  { value: "warp", label: "Traffic and DNS (UDP)" },
  { value: "warp+doh", label: "Traffic and DNS (HTTPS)" },
  { value: "warp+dot", label: "Traffic and DNS (TLS)" },
  { value: "proxy", label: "Local proxy" },
  { value: "tunnel_only", label: "Traffic only" },
];
