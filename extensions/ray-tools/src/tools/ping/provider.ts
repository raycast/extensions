import { execFile } from "node:child_process";
import { isIP } from "node:net";
import { promisify } from "node:util";

import type { PingProbeResult, PingProbeSet, PingProvider } from "./types";

export const INTERNET_ENDPOINT =
  "https://connectivitycheck.gstatic.com/generate_204";
export const DEFAULT_REMOTE_ENDPOINT = "https://example.com/";

const ROUTE_COMMAND = "/sbin/route";
const PING_COMMAND = "/sbin/ping";
const SCUTIL_COMMAND = "/usr/sbin/scutil";
const NETWORKSETUP_COMMAND = "/usr/sbin/networksetup";
const IPCONFIG_COMMAND = "/usr/sbin/ipconfig";
const NETWORK_QUALITY_COMMAND = "/usr/bin/networkQuality";
const ROUTE_TIMEOUT_MS = 2_000;
const PING_TIMEOUT_MS = 6_500;
const HTTP_TIMEOUT_MS = 5_000;
const NETWORK_QUALITY_TIMEOUT_MS = 12_000;
const MAX_COMMAND_OUTPUT_BYTES = 32 * 1024;
const ROUTER_SLOW_LATENCY_MS = 50;

export interface DefaultRoute {
  gateway: string;
  interface?: string;
}

export interface CommandResult {
  stdout: string;
  stderr?: string;
}

export type CommandExecutor = (
  command: string,
  args: readonly string[],
  options: { timeout: number },
) => Promise<CommandResult>;

export interface PingProviderOptions {
  executor?: CommandExecutor;
  fetcher?: typeof fetch;
  now?: () => number;
  internetEndpoint?: string;
  remoteEndpoint?: string;
}

const execFileAsync = promisify(execFile);

const defaultExecutor: CommandExecutor = async (command, args, options) => {
  const result = await execFileAsync(command, [...args], {
    encoding: "utf8",
    maxBuffer: MAX_COMMAND_OUTPUT_BYTES,
    timeout: options.timeout,
  });

  return {
    stdout: String(result.stdout),
    stderr: String(result.stderr),
  };
};

function asValidGateway(value: string | undefined): string | undefined {
  if (
    !value ||
    value.startsWith("link#") ||
    value === "-" ||
    value === "none"
  ) {
    return undefined;
  }

  const withoutScope = value.replace(/%[^%]+$/u, "");
  return isIP(withoutScope) > 0 ? value : undefined;
}

function asInterface(value: string | undefined): string | undefined {
  return value && /^[A-Za-z0-9._-]+$/u.test(value) ? value : undefined;
}

export function parseDefaultRoute(output: string): DefaultRoute | undefined {
  const gateway = asValidGateway(output.match(/^\s*gateway:\s*(\S+)/imu)?.[1]);

  if (!gateway) {
    return undefined;
  }

  const networkInterface = asInterface(
    output.match(/^\s*interface:\s*(\S+)/imu)?.[1],
  );

  return networkInterface
    ? { gateway, interface: networkInterface }
    : { gateway };
}

export function parseHardwarePortDevices(output: string): string[] {
  return Array.from(
    new Set(
      Array.from(
        output.matchAll(/^\s*Device:\s*(en\d+)\s*$/gimu),
        (match) => match[1],
      ),
    ),
  );
}

export function parseDhcpRouter(output: string): string | undefined {
  const value = output.match(
    /^\s*router\s+\([^)]*\):\s*(?:\{\s*)?([^\s,}]+)/imu,
  )?.[1];
  return asValidGateway(value);
}

export function parsePingLatency(output: string): number | undefined {
  const value = output.match(/\btime=([0-9]+(?:\.[0-9]+)?)\s*ms\b/iu)?.[1];
  if (!value) {
    return undefined;
  }

  const latency = Number(value);
  return Number.isFinite(latency) && latency >= 0 ? latency : undefined;
}

export interface PingStatistics {
  packetsSent?: number;
  packetsReceived?: number;
  packetLossPercent?: number;
  latencyMs?: number;
}

export function parsePingStatistics(output: string): PingStatistics {
  const packetSummary = output.match(
    /(\d+)\s+packets transmitted,\s*(\d+)\s+packets received,\s*([0-9]+(?:\.[0-9]+)?)%\s+packet loss/iu,
  );
  const roundTripSummary = output.match(
    /round-trip min\/avg\/max\/stddev\s*=\s*[0-9.]+\/([0-9.]+)\/[0-9.]+\/[0-9.]+\s*ms/iu,
  );

  return {
    packetsSent: packetSummary ? Number(packetSummary[1]) : undefined,
    packetsReceived: packetSummary ? Number(packetSummary[2]) : undefined,
    packetLossPercent: packetSummary ? Number(packetSummary[3]) : undefined,
    latencyMs: roundTripSummary ? Number(roundTripSummary[1]) : undefined,
  };
}

export function getRouterHealthDetail(statistics: PingStatistics): string {
  if ((statistics.packetLossPercent ?? 0) > 0) {
    return `Роутер теряет пакеты (${statistics.packetLossPercent}%).`;
  }

  if (
    statistics.latencyMs !== undefined &&
    statistics.latencyMs > ROUTER_SLOW_LATENCY_MS
  ) {
    return `Роутер отвечает медленно (задержка ${statistics.latencyMs.toLocaleString("ru-RU", { maximumFractionDigits: 3 })} мс).`;
  }

  return "Роутер отвечает нормально.";
}

export interface NetworkQualityResult {
  downloadMbps: number;
  interfaceName?: string;
}

export function parseNetworkQuality(
  output: string,
): NetworkQualityResult | undefined {
  try {
    const value = JSON.parse(output) as {
      dl_throughput?: unknown;
      interface_name?: unknown;
    };
    if (
      typeof value.dl_throughput !== "number" ||
      !Number.isFinite(value.dl_throughput) ||
      value.dl_throughput < 0
    ) {
      return undefined;
    }

    return {
      downloadMbps: Math.round((value.dl_throughput / 1_000_000) * 10) / 10,
      interfaceName:
        typeof value.interface_name === "string"
          ? asInterface(value.interface_name)
          : undefined,
    };
  } catch {
    return undefined;
  }
}

export interface VpnActivity {
  active: boolean;
  serviceName?: string;
}

export function parseVpnActivity(output: string): VpnActivity {
  const connectedLine = output
    .split(/\r?\n/u)
    .find((line) => /\(\s*connected\s*\)/iu.test(line));

  if (!connectedLine) {
    return { active: false };
  }

  const quotedServiceName = connectedLine.match(/"([^"]+)"/u)?.[1]?.trim();
  const serviceName =
    quotedServiceName ??
    connectedLine.replace(/^\s*\*?\s*\(\s*connected\s*\)\s*/iu, "").trim();

  return serviceName ? { active: true, serviceName } : { active: true };
}

export function normalizeRemoteEndpoint(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return DEFAULT_REMOTE_ENDPOINT;
  }

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password) {
      return DEFAULT_REMOTE_ENDPOINT;
    }

    return url.toString();
  } catch {
    return DEFAULT_REMOTE_ENDPOINT;
  }
}

function endpointName(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return endpoint;
  }
}

function makeProbe(
  id: PingProbeResult["id"],
  label: string,
  state: PingProbeResult["state"],
  detail: string,
  options: Pick<
    PingProbeResult,
    | "latencyMs"
    | "target"
    | "packetLossPercent"
    | "packetsSent"
    | "packetsReceived"
    | "downloadMbps"
  > = {},
): PingProbeResult {
  return { id, label, state, detail, ...options };
}

function errorLooksLikeTimeout(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    killed?: unknown;
    signal?: unknown;
  };
  return (
    candidate.code === "ETIMEDOUT" ||
    candidate.killed === true ||
    candidate.signal === "SIGTERM"
  );
}

export class MacNetworkPingProvider implements PingProvider {
  private readonly executor: CommandExecutor;
  private readonly fetcher: typeof fetch;
  private readonly now: () => number;
  private readonly internetEndpoint: string;
  private readonly remoteEndpoint: string;

  constructor(options: PingProviderOptions = {}) {
    this.executor = options.executor ?? defaultExecutor;
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? Date.now;
    this.internetEndpoint = options.internetEndpoint ?? INTERNET_ENDPOINT;
    this.remoteEndpoint = normalizeRemoteEndpoint(options.remoteEndpoint);
  }

  async check(): Promise<PingProbeSet> {
    const routeResult = await this.readDefaultRoute();
    const gatewayRoute = routeResult.route ?? (await this.readPhysicalRoute());
    const gateway = await this.probeGateway(gatewayRoute, routeResult.reason);

    const [internetHttp, internetPing, server, vpn] = await Promise.all([
      this.probeHttp(
        "internet",
        "Проверка интернета",
        this.internetEndpoint,
        204,
      ),
      this.probePing(endpointName(this.internetEndpoint)),
      this.probeHttp(
        "server",
        `Удалённый сервер (${endpointName(this.remoteEndpoint)})`,
        this.remoteEndpoint,
      ),
      this.probeVpn(routeResult.route),
    ]);

    const internet = { ...internetHttp, ...internetPing };

    return {
      gateway,
      internet,
      server,
      vpn,
      speed: makeProbe(
        "speed",
        "Скорость скачивания",
        "not-detected",
        "Нажмите «Измерить скорость скачивания», чтобы узнать результат.",
      ),
    };
  }

  private async readDefaultRoute(): Promise<{
    route?: DefaultRoute;
    reason: "command-failed" | "not-found";
  }> {
    try {
      const result = await this.executor(
        ROUTE_COMMAND,
        ["-n", "get", "default"],
        { timeout: ROUTE_TIMEOUT_MS },
      );
      const route = parseDefaultRoute(result.stdout);
      return route ? { route, reason: "not-found" } : { reason: "not-found" };
    } catch {
      return { reason: "command-failed" };
    }
  }

  private async readPhysicalRoute(): Promise<DefaultRoute | undefined> {
    let hardwarePorts: string;
    try {
      const result = await this.executor(
        NETWORKSETUP_COMMAND,
        ["-listallhardwareports"],
        { timeout: ROUTE_TIMEOUT_MS },
      );
      hardwarePorts = result.stdout;
    } catch {
      return undefined;
    }

    const devices = parseHardwarePortDevices(hardwarePorts);
    const routes = await Promise.all(
      devices.map(async (networkInterface) => {
        try {
          const result = await this.executor(
            IPCONFIG_COMMAND,
            ["getpacket", networkInterface],
            { timeout: ROUTE_TIMEOUT_MS },
          );
          const gateway = parseDhcpRouter(result.stdout);
          return gateway ? { gateway, interface: networkInterface } : undefined;
        } catch {
          return undefined;
        }
      }),
    );

    return routes.find((route) => route !== undefined);
  }

  private async probeGateway(
    route: DefaultRoute | undefined,
    reason: "command-failed" | "not-found",
  ): Promise<PingProbeResult> {
    if (!route) {
      return makeProbe(
        "gateway",
        "Роутер",
        "unknown",
        reason === "command-failed"
          ? "Не удалось определить роутер. Проверьте подключение или VPN."
          : "Роутер не найден. В VPN-режиме это может быть нормально.",
      );
    }

    const routeDescription = route.interface
      ? `Роутер (${route.interface})`
      : "Роутер";

    try {
      const result = await this.executor(
        PING_COMMAND,
        [
          "-n",
          ...(route.interface ? ["-b", route.interface] : []),
          "-c",
          "5",
          "-W",
          "1000",
          route.gateway,
        ],
        { timeout: PING_TIMEOUT_MS + 500 },
      );
      const statistics = parsePingStatistics(result.stdout);

      return makeProbe(
        "gateway",
        "Роутер",
        "pass",
        getRouterHealthDetail(statistics),
        {
          ...statistics,
          latencyMs: statistics.latencyMs ?? parsePingLatency(result.stdout),
          target: route.gateway,
        },
      );
    } catch (error) {
      return makeProbe(
        "gateway",
        "Роутер",
        "fail",
        `${routeDescription} не отвечает${errorLooksLikeTimeout(error) ? " до истечения тайм-аута" : ""}`,
        { target: route.gateway },
      );
    }
  }

  private async probePing(
    target: string,
  ): Promise<
    Pick<
      PingProbeResult,
      "latencyMs" | "packetLossPercent" | "packetsSent" | "packetsReceived"
    >
  > {
    try {
      const result = await this.executor(
        PING_COMMAND,
        ["-n", "-c", "5", "-W", "1000", target],
        { timeout: PING_TIMEOUT_MS + 500 },
      );
      return parsePingStatistics(result.stdout);
    } catch {
      return {};
    }
  }

  async measureSpeed(): Promise<PingProbeResult> {
    try {
      const result = await this.executor(
        NETWORK_QUALITY_COMMAND,
        ["-c", "-u", "-M", "8"],
        { timeout: NETWORK_QUALITY_TIMEOUT_MS },
      );
      const quality = parseNetworkQuality(result.stdout);
      if (!quality) {
        return makeProbe(
          "speed",
          "Скорость скачивания",
          "unknown",
          "Не удалось получить результат измерения скорости.",
        );
      }

      return makeProbe(
        "speed",
        "Скорость скачивания",
        "pass",
        "Скорость измерена",
        {
          downloadMbps: quality.downloadMbps,
          target: quality.interfaceName,
        },
      );
    } catch {
      return makeProbe(
        "speed",
        "Скорость скачивания",
        "unknown",
        "Не удалось измерить скорость скачивания.",
      );
    }
  }

  private async probeHttp(
    id: "internet" | "server",
    label: string,
    endpoint: string,
    expectedStatus?: number,
  ): Promise<PingProbeResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
    const startedAt = this.now();
    const target = endpointName(endpoint);

    try {
      let response: Response;
      try {
        response = await this.fetcher(endpoint, {
          headers: { Accept: "*/*" },
          method: "GET",
          signal: controller.signal,
        });
      } catch {
        return makeProbe(
          id,
          label,
          "fail",
          controller.signal.aborted
            ? "Время ожидания запроса истекло"
            : "Запрос не дал HTTP-ответа",
          { target },
        );
      }

      const latencyMs = Math.max(0, this.now() - startedAt);
      const statusIsExpected =
        expectedStatus === undefined
          ? response.ok
          : response.status === expectedStatus;

      if (!statusIsExpected) {
        if (response.body) {
          await response.body.cancel().catch(() => undefined);
        }

        const expected =
          expectedStatus === undefined
            ? "успешный HTTP-статус"
            : `HTTP ${expectedStatus}`;
        return makeProbe(
          id,
          label,
          "fail",
          `Ожидался ${expected}, получен HTTP ${response.status}`,
          { latencyMs, target },
        );
      }

      if (response.body) {
        await response.body.cancel().catch(() => undefined);
      }

      return makeProbe(
        id,
        label,
        "pass",
        `HTTP ${response.status}, ${target}`,
        { latencyMs, target },
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private async probeVpn(
    route: DefaultRoute | undefined,
  ): Promise<PingProbeResult> {
    if (route?.interface && /^utun\d+$/iu.test(route.interface)) {
      return makeProbe(
        "vpn",
        "Активность VPN",
        "pass",
        `VPN подключён (${route.interface})`,
        { target: route.interface },
      );
    }

    let output: string;
    try {
      const result = await this.executor(SCUTIL_COMMAND, ["--nc", "list"], {
        timeout: ROUTE_TIMEOUT_MS,
      });
      output = result.stdout;
    } catch {
      return makeProbe(
        "vpn",
        "Активность VPN",
        "unknown",
        "Не удалось проверить состояние VPN в macOS.",
      );
    }

    const activity = parseVpnActivity(output);
    if (activity.active) {
      return makeProbe(
        "vpn",
        "Активность VPN",
        "pass",
        activity.serviceName
          ? `VPN подключён: ${activity.serviceName}`
          : "Обнаружено активное VPN-подключение",
        { target: activity.serviceName },
      );
    }

    return makeProbe(
      "vpn",
      "Активность VPN",
      "not-detected",
      "Активное VPN-подключение не обнаружено (проверка приблизительная).",
    );
  }
}
