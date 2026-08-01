import { describe, expect, test } from "bun:test";
import { reconnectTunnels } from "../src/lib/reconnect";
import type { Tunnel } from "../src/lib/store";

const tunnels: Tunnel[] = [
  {
    id: "manual-stopped",
    name: "Manual Stopped",
    localPort: 15431,
    remoteHost: "localhost",
    remotePort: 5432,
    sshTarget: "manual.example.com",
  },
  {
    id: "auto-running",
    name: "Auto Running",
    localPort: 15432,
    remoteHost: "localhost",
    remotePort: 5432,
    sshTarget: "running.example.com",
    autoReconnect: true,
  },
  {
    id: "auto-stopped",
    name: "Auto Stopped",
    localPort: 15433,
    remoteHost: "localhost",
    remotePort: 5432,
    sshTarget: "stopped.example.com",
    autoReconnect: true,
  },
];

describe("reconnectTunnels", () => {
  test("starts only auto-reconnect tunnels that are currently stopped", async () => {
    const started: string[] = [];

    const result = await reconnectTunnels(tunnels, {
      getStatus: (tunnel) =>
        tunnel.id === "auto-running" ? "running" : "stopped",
      startTunnel: async (tunnel) => {
        started.push(tunnel.id);
      },
    });

    expect(started).toEqual(["auto-stopped"]);
    expect(result.started).toEqual(["auto-stopped"]);
    expect(result.skipped).toEqual(["auto-running"]);
    expect(result.failed).toEqual([]);
  });

  test("captures start failures without stopping other reconnect attempts", async () => {
    const secondTunnel = {
      ...tunnels[2],
      id: "auto-stopped-2",
      name: "Auto Stopped 2",
    };
    const started: string[] = [];

    const result = await reconnectTunnels([...tunnels, secondTunnel], {
      getStatus: (tunnel) =>
        tunnel.id === "auto-running" ? "running" : "stopped",
      startTunnel: async (tunnel) => {
        if (tunnel.id === "auto-stopped") throw new Error("auth failed");
        started.push(tunnel.id);
      },
    });

    expect(started).toEqual(["auto-stopped-2"]);
    expect(result.started).toEqual(["auto-stopped-2"]);
    expect(result.failed).toEqual([
      { id: "auto-stopped", name: "Auto Stopped", error: "auth failed" },
    ]);
  });
});
