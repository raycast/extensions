import { describe, expect, it, vi } from "vitest";

import {
  MacNetworkPingProvider,
  getRouterHealthDetail,
  normalizeRemoteEndpoint,
  parseDefaultRoute,
  parseDhcpRouter,
  parseHardwarePortDevices,
  parseNetworkQuality,
  parsePingLatency,
  parsePingStatistics,
  parseVpnActivity,
} from "./provider";

describe("macOS network output parsers", () => {
  it("parses a default gateway and interface defensively", () => {
    expect(
      parseDefaultRoute(`
        route to: default
        gateway: 192.168.1.1
        interface: en0
      `),
    ).toEqual({ gateway: "192.168.1.1", interface: "en0" });

    expect(
      parseDefaultRoute("gateway: link#12\ninterface: en0"),
    ).toBeUndefined();

    expect(
      parseHardwarePortDevices(
        "Hardware Port: Wi-Fi\nDevice: en0\n\nHardware Port: Ethernet\nDevice: en1\n",
      ),
    ).toEqual(["en0", "en1"]);
    expect(
      parseDhcpRouter(
        "router (ip_mult): {192.168.1.1}\nsubnet_mask (ip): 255.255.255.0",
      ),
    ).toBe("192.168.1.1");
  });

  it("parses macOS ping latency and connected VPN services", () => {
    expect(
      parsePingLatency(
        "64 bytes from 192.168.1.1: icmp_seq=0 ttl=64 time=1.234 ms",
      ),
    ).toBe(1.234);
    expect(parsePingLatency("request timeout")).toBeUndefined();

    expect(
      parseVpnActivity(
        "Available network connection services in current set:\n* (Connected) Work VPN",
      ),
    ).toEqual({ active: true, serviceName: "Work VPN" });
    expect(
      parseVpnActivity('* (Connected) 123 VPN (provider) "Sota Connect"'),
    ).toEqual({ active: true, serviceName: "Sota Connect" });
    expect(parseVpnActivity("* (Disconnected) Work VPN")).toEqual({
      active: false,
    });
  });

  it("parses packet loss and average latency from macOS ping summaries", () => {
    expect(
      parsePingStatistics(`
        5 packets transmitted, 4 packets received, 20.0% packet loss
        round-trip min/avg/max/stddev = 11.200/15.625/21.400/3.100 ms
      `),
    ).toEqual({
      packetsSent: 5,
      packetsReceived: 4,
      packetLossPercent: 20,
      latencyMs: 15.625,
    });
    expect(
      getRouterHealthDetail({ packetLossPercent: 0, latencyMs: 12.5 }),
    ).toBe("Роутер отвечает нормально.");
    expect(getRouterHealthDetail({ packetLossPercent: 0, latencyMs: 80 })).toBe(
      "Роутер отвечает медленно (задержка 80 мс).",
    );
    expect(getRouterHealthDetail({ packetLossPercent: 20 })).toBe(
      "Роутер теряет пакеты (20%).",
    );
  });

  it("parses download speed and measured interface from networkQuality JSON", () => {
    expect(
      parseNetworkQuality(
        JSON.stringify({ dl_throughput: 190_092_752, interface_name: "utun6" }),
      ),
    ).toEqual({ downloadMbps: 190.1, interfaceName: "utun6" });
    expect(parseNetworkQuality("not JSON")).toBeUndefined();
  });

  it("uses the safe default for malformed or credential-bearing endpoints", () => {
    expect(normalizeRemoteEndpoint("not a URL")).toBe("https://example.com/");
    expect(normalizeRemoteEndpoint("http://example.com")).toBe(
      "https://example.com/",
    );
    expect(normalizeRemoteEndpoint("https://user:pass@example.com")).toBe(
      "https://example.com/",
    );
    expect(normalizeRemoteEndpoint("https://status.example.test/health")).toBe(
      "https://status.example.test/health",
    );
  });
});

describe("MacNetworkPingProvider", () => {
  it("finds and checks the physical router when the VPN owns the default route", async () => {
    const commands: Array<{ command: string; args: readonly string[] }> = [];
    const executor = async (command: string, args: readonly string[]) => {
      commands.push({ command, args });
      if (command === "/sbin/route") {
        return { stdout: "route to: default\ninterface: utun6\n" };
      }
      if (command === "/usr/sbin/networksetup") {
        return { stdout: "Hardware Port: Wi-Fi\nDevice: en0\n" };
      }
      if (command === "/usr/sbin/ipconfig") {
        return { stdout: "router (ip_mult): {192.168.1.1}\n" };
      }
      if (command === "/sbin/ping") {
        return {
          stdout:
            "5 packets transmitted, 5 packets received, 0.0% packet loss\n" +
            "round-trip min/avg/max/stddev = 1.0/2.5/4.0/1.0 ms\n",
        };
      }
      return { stdout: "* (Disconnected) Work VPN\n" };
    };
    const fetcher: typeof fetch = async (input, init) =>
      new Response(null, {
        status: String(input).includes("generate_204") ? 204 : 200,
        headers: init?.headers,
      });

    const result = await new MacNetworkPingProvider({
      executor,
      fetcher,
      remoteEndpoint: "https://status.example.test/health",
      internetEndpoint: "https://connectivity.test/generate_204",
    }).check();

    expect(result.gateway).toMatchObject({
      state: "pass",
      target: "192.168.1.1",
      detail: "Роутер отвечает нормально.",
    });
    expect(commands).toEqual(
      expect.arrayContaining([
        { command: "/usr/sbin/networksetup", args: ["-listallhardwareports"] },
        { command: "/usr/sbin/ipconfig", args: ["getpacket", "en0"] },
      ]),
    );
  });

  it("runs the local, internet, remote, and VPN layers without live network access", async () => {
    const commands: Array<{ command: string; args: readonly string[] }> = [];
    const requests: Array<{ url: string; signal?: AbortSignal }> = [];
    const executor = async (command: string, args: readonly string[]) => {
      commands.push({ command, args });
      if (command === "/sbin/route") {
        return {
          stdout: "gateway: 192.168.1.1\ninterface: en0\n",
        };
      }
      if (command === "/sbin/ping") {
        return {
          stdout:
            "5 packets transmitted, 5 packets received, 0.0% packet loss\n" +
            "round-trip min/avg/max/stddev = 1.0/2.5/4.0/1.0 ms\n",
        };
      }
      if (command === "/usr/bin/networkQuality") {
        return {
          stdout: JSON.stringify({
            dl_throughput: 84_300_000,
            interface_name: "en0",
          }),
        };
      }
      return { stdout: "* (Disconnected) Work VPN\n" };
    };
    const fetcher: typeof fetch = async (input, init) => {
      requests.push({ url: String(input), signal: init?.signal ?? undefined });
      return new Response(null, {
        status: String(input).includes("generate_204") ? 204 : 200,
      });
    };

    const result = await new MacNetworkPingProvider({
      executor,
      fetcher,
      now: () => 1_000,
      remoteEndpoint: "https://status.example.test/health",
      internetEndpoint: "https://connectivity.test/generate_204",
    }).check();

    expect(result.gateway).toMatchObject({
      state: "pass",
      latencyMs: 2.5,
      target: "192.168.1.1",
    });
    expect(result.internet).toMatchObject({
      state: "pass",
      target: "connectivity.test",
      packetLossPercent: 0,
    });
    expect(result.server).toMatchObject({
      state: "pass",
      target: "status.example.test",
    });
    expect(result.vpn.state).toBe("not-detected");
    expect(result.speed).toMatchObject({ state: "not-detected" });
    expect(commands.map(({ command }) => command)).toEqual(
      expect.arrayContaining(["/sbin/route", "/sbin/ping", "/usr/sbin/scutil"]),
    );
    expect(
      commands.some(({ command }) => command === "/usr/bin/networkQuality"),
    ).toBe(false);
    expect(requests.map(({ url }) => url)).toEqual(
      expect.arrayContaining([
        "https://connectivity.test/generate_204",
        "https://status.example.test/health",
      ]),
    );
    expect(requests.every(({ signal }) => signal)).toBe(true);
  });

  it("runs the traffic-heavy download test only when explicitly requested", async () => {
    const executor = async (command: string) => {
      expect(command).toBe("/usr/bin/networkQuality");
      return {
        stdout: JSON.stringify({
          dl_throughput: 84_300_000,
          interface_name: "en0",
        }),
      };
    };

    const result = await new MacNetworkPingProvider({
      executor,
    }).measureSpeed();

    expect(result).toMatchObject({
      state: "pass",
      downloadMbps: 84.3,
      target: "en0",
    });
  });

  it("marks HTTP failures and bounded timeouts instead of throwing", async () => {
    vi.useFakeTimers();

    try {
      const executor = async (command: string) => {
        if (command === "/sbin/route") {
          return { stdout: "gateway: 192.168.1.1\ninterface: en0\n" };
        }
        if (command === "/sbin/ping") {
          return { stdout: "time=1 ms" };
        }
        return { stdout: "" };
      };
      const fetcher: typeof fetch = async (_input, init) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new Error("aborted")),
            { once: true },
          );
        });

      const promise = new MacNetworkPingProvider({ executor, fetcher }).check();
      await vi.advanceTimersByTimeAsync(5_000);
      const result = await promise;

      expect(result.internet).toMatchObject({
        state: "fail",
        detail: "Время ожидания запроса истекло",
      });
      expect(result.server).toMatchObject({
        state: "fail",
        detail: "Время ожидания запроса истекло",
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
