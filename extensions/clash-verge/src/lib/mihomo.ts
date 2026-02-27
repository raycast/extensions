import { getPreferenceValues } from "@raycast/api";
import { CommandExecutionError, execCommand } from "./exec";
import { MihomoConfig, Mode } from "./types";

const DEFAULT_SOCKET_PATH = "/tmp/verge/verge-mihomo.sock";
const DEFAULT_PROXY_HOST = "127.0.0.1";
const DEFAULT_MIXED_PORT = 7897;
const CURL_BIN = "/usr/bin/curl";

interface Preferences {
  socketPath?: string;
  proxyHost?: string;
}

interface RawMihomoConfig {
  mode?: unknown;
  tun?: {
    enable?: unknown;
  };
  "mixed-port"?: unknown;
}

export async function getMihomoConfig(): Promise<MihomoConfig> {
  const raw = await requestMihomoConfig("GET");

  const mode = normalizeMode(raw.mode);
  const tunEnabled = Boolean(raw.tun?.enable);
  const mixedPort = typeof raw["mixed-port"] === "number" ? raw["mixed-port"] : DEFAULT_MIXED_PORT;

  return {
    mode,
    tunEnabled,
    mixedPort,
  };
}

export async function setProxyMode(mode: Mode): Promise<void> {
  await requestMihomoConfig("PATCH", { mode });
}

export async function setTunEnabled(enabled: boolean): Promise<void> {
  await requestMihomoConfig("PATCH", {
    tun: {
      enable: enabled,
    },
  });
}

export function getProxyHost(): string {
  const preferences = getPreferenceValues<Preferences>();
  const value = preferences.proxyHost?.trim();
  return value || DEFAULT_PROXY_HOST;
}

export function getSocketPath(): string {
  const preferences = getPreferenceValues<Preferences>();
  const value = preferences.socketPath?.trim();
  return value || DEFAULT_SOCKET_PATH;
}

async function requestMihomoConfig(method: "GET" | "PATCH", body?: Record<string, unknown>): Promise<RawMihomoConfig> {
  const socketPath = getSocketPath();
  const args = [
    "--silent",
    "--show-error",
    "--fail",
    "--unix-socket",
    socketPath,
    "-X",
    method,
    "http://localhost/configs",
  ];

  if (body) {
    args.push("-H", "Content-Type: application/json", "-d", JSON.stringify(body));
  }

  try {
    const { stdout } = await execCommand(CURL_BIN, args, { timeoutMs: 6000 });
    return stdout ? (JSON.parse(stdout) as RawMihomoConfig) : {};
  } catch (error) {
    throw new Error(formatMihomoError(error, socketPath));
  }
}

function normalizeMode(value: unknown): Mode {
  if (value === "rule" || value === "global" || value === "direct") {
    return value;
  }

  return "rule";
}

function formatMihomoError(error: unknown, socketPath: string): string {
  if (!(error instanceof CommandExecutionError)) {
    return error instanceof Error ? error.message : "Unknown Mihomo request error";
  }

  const detail = error.stderr || error.stdout || error.message;

  if (detail.includes("No such file or directory")) {
    return `Unable to access Mihomo socket at ${socketPath}. Make sure Clash Verge is running.`;
  }

  if (detail.includes("Failed to connect") || detail.includes("Could not connect")) {
    return `Unable to connect to Mihomo API via ${socketPath}. Confirm Clash Verge is running and socket path is correct.`;
  }

  return `Mihomo API request failed: ${detail}`;
}
