import { describe, expect, it } from "vitest";
import type { NetworkOverview, ProtectOverview } from "../src/api/types";
import { findUniFiProblems, summarizeUniFiHealth } from "../src/lib/health";

describe("UniFi health summary", () => {
  it("counts actionable Network and Protect issues without counting open sensors as faults", () => {
    const network = {
      clients: [{ id: "client-1" }],
      devices: [
        { id: "gateway", name: "Gateway", state: "ONLINE", firmwareUpdatable: true },
        { id: "switch", name: "Switch", state: "OFFLINE", firmwareUpdatable: false },
      ],
      firewallPolicies: [{ id: "policy-1" }],
      networks: [{ id: "network-1" }],
      site: { id: "site-1", internalReference: "default", name: "Home" },
      wans: [{ id: "wan-1" }],
      wifiBroadcasts: [
        { id: "wifi-1", enabled: true },
        { id: "wifi-2", enabled: false },
      ],
    } as NetworkOverview;
    const protect = {
      collections: {
        "protect-cameras": [
          { id: "camera-1", state: "CONNECTED" },
          { id: "camera-2", state: "DISCONNECTED" },
        ],
        "protect-sensors": [{ id: "sensor-1", state: "CONNECTED", isOpened: true, batteryStatus: { percentage: 19 } }],
      },
      nvr: { id: "nvr-1", armMode: { status: "ARMED" } },
      unavailable: [],
    } as unknown as ProtectOverview;

    expect(summarizeUniFiHealth(network, protect)).toEqual({
      issueCount: 4,
      network: {
        clients: 1,
        devices: 2,
        devicesOffline: 1,
        firewallPolicies: 1,
        firmwareUpdates: 1,
        networks: 1,
        wans: 1,
        wifi: 2,
        wifiDisabled: 1,
      },
      protect: {
        alarmStatus: "ARMED",
        cameras: 2,
        camerasOffline: 1,
        devicesOffline: 1,
        sensorBatteriesLow: 1,
        sensors: 1,
        sensorsOpen: 1,
      },
    });
    expect(findUniFiProblems(network, protect)).toEqual([
      {
        entityId: "gateway",
        kind: "firmware-update",
        message: "Firmware update available.",
        name: "Gateway",
        resource: "network-devices",
        service: "network",
        state: "ONLINE",
      },
      {
        entityId: "switch",
        kind: "not-connected",
        message: "Network device is offline.",
        name: "Switch",
        resource: "network-devices",
        service: "network",
        state: "OFFLINE",
      },
      {
        entityId: "camera-2",
        kind: "not-connected",
        message: "Protect camera is disconnected.",
        name: "camera-2",
        resource: "protect-cameras",
        service: "protect",
        state: "DISCONNECTED",
      },
      {
        entityId: "sensor-1",
        kind: "low-battery",
        message: "Sensor battery is low.",
        name: "sensor-1",
        resource: "protect-sensors",
        service: "protect",
        state: "CONNECTED",
      },
    ]);
  });

  it("returns an empty, unknown summary when both services are unavailable", () => {
    expect(summarizeUniFiHealth(undefined, undefined)).toMatchObject({
      issueCount: 0,
      network: { clients: 0, devices: 0 },
      protect: { alarmStatus: "Unknown", cameras: 0, sensors: 0 },
    });
  });

  it("does not report disconnected Protect bridge inventory as camera or system health failures", () => {
    const protect = {
      collections: {
        "protect-cameras": [
          { id: "camera-1", name: "Camera 1", state: "CONNECTED" },
          { id: "camera-2", name: "Camera 2", state: "CONNECTED" },
        ],
        "protect-bridges": [
          { id: "bridge-1", name: "Bridge 1", state: "DISCONNECTED" },
          { id: "bridge-2", name: "Bridge 2", state: "CONNECTING" },
        ],
      },
      nvr: { id: "nvr-1" },
      unavailable: [],
    } as unknown as ProtectOverview;

    expect(summarizeUniFiHealth(undefined, protect)).toMatchObject({
      issueCount: 0,
      protect: {
        cameras: 2,
        camerasOffline: 0,
        devicesOffline: 0,
      },
    });
    expect(findUniFiProblems(undefined, protect)).toEqual([]);
  });

  it("does not promote a transient Protect connecting state to a hard failure", () => {
    const protect = {
      collections: {
        "protect-sensors": [{ id: "sensor-1", name: "Sensor 1", state: "CONNECTING" }],
      },
      nvr: { id: "nvr-1" },
      unavailable: [],
    } as unknown as ProtectOverview;

    expect(summarizeUniFiHealth(undefined, protect).protect.devicesOffline).toBe(0);
    expect(findUniFiProblems(undefined, protect)).toEqual([]);
  });
});
