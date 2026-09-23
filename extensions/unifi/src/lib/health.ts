import type { JsonObject, NetworkOverview, ProtectEntity, ProtectOverview } from "../api/types";

// Protect also exposes inventory-like resources (bridges, fobs, and link stations)
// whose connection state is not a reliable top-level health signal. Keep the
// health roll-up to devices with an independently actionable connection state.
const PROTECT_HEALTH_RESOURCES = [
  "protect-cameras",
  "protect-sensors",
  "protect-lights",
  "protect-sirens",
  "protect-chimes",
  "protect-relays",
  "protect-speakers",
  "protect-alarm-hubs",
] as const;

function isProtectOffline(item: ProtectEntity): boolean {
  return item.state === "DISCONNECTED";
}

function hasLowBattery(item: ProtectEntity): boolean {
  const battery = item.batteryStatus as JsonObject | undefined;
  return battery?.isLow === true || (typeof battery?.percentage === "number" && battery.percentage <= 20);
}

function protectArmStatus(nvr: JsonObject | undefined): string {
  const armMode = nvr?.armMode;
  if (typeof armMode === "string") return armMode;
  if (armMode && typeof armMode === "object" && !Array.isArray(armMode)) {
    const status = armMode.status;
    if (typeof status === "string") return status;
  }
  return "Unknown";
}

export interface UniFiHealthSummary {
  issueCount: number;
  network: {
    clients: number;
    devices: number;
    devicesOffline: number;
    firewallPolicies: number;
    firmwareUpdates: number;
    networks: number;
    wans: number;
    wifi: number;
    wifiDisabled: number;
  };
  protect: {
    alarmStatus: string;
    cameras: number;
    camerasOffline: number;
    devicesOffline: number;
    sensorBatteriesLow: number;
    sensors: number;
    sensorsOpen: number;
  };
}

export interface UniFiProblem {
  entityId: string;
  kind: "firmware-update" | "low-battery" | "not-connected";
  message: string;
  name: string;
  resource: string;
  service: "network" | "protect";
  state?: string;
}

function entityName(item: ProtectEntity): string {
  return item.name || item.modelKey || item.id;
}

function protectResourceName(resource: (typeof PROTECT_HEALTH_RESOURCES)[number]): string {
  return resource
    .replace(/^protect-/, "")
    .replace(/s$/, "")
    .replaceAll("-", " ");
}

export function findUniFiProblems(
  network: NetworkOverview | undefined,
  protect: ProtectOverview | undefined,
): UniFiProblem[] {
  const networkProblems: UniFiProblem[] = (network?.devices ?? []).flatMap((device) => [
    ...(device.state !== "ONLINE"
      ? [
          {
            entityId: device.id,
            kind: "not-connected" as const,
            message: `Network device is ${device.state.toLowerCase().replaceAll("_", " ")}.`,
            name: device.name,
            resource: "network-devices",
            service: "network" as const,
            state: device.state,
          },
        ]
      : []),
    ...(device.firmwareUpdatable
      ? [
          {
            entityId: device.id,
            kind: "firmware-update" as const,
            message: "Firmware update available.",
            name: device.name,
            resource: "network-devices",
            service: "network" as const,
            state: device.state,
          },
        ]
      : []),
  ]);

  const protectProblems = PROTECT_HEALTH_RESOURCES.flatMap((resource) =>
    (protect?.collections[resource] ?? []).flatMap((item) => [
      ...(isProtectOffline(item)
        ? [
            {
              entityId: item.id,
              kind: "not-connected" as const,
              message: `Protect ${protectResourceName(resource)} is ${String(item.state).toLowerCase().replaceAll("_", " ")}.`,
              name: entityName(item),
              resource,
              service: "protect" as const,
              state: item.state,
            },
          ]
        : []),
      ...(resource === "protect-sensors" && hasLowBattery(item)
        ? [
            {
              entityId: item.id,
              kind: "low-battery" as const,
              message: "Sensor battery is low.",
              name: entityName(item),
              resource,
              service: "protect" as const,
              state: item.state,
            },
          ]
        : []),
    ]),
  );

  return [...networkProblems, ...protectProblems].sort(
    (left, right) => left.service.localeCompare(right.service) || left.name.localeCompare(right.name),
  );
}

export function summarizeUniFiHealth(
  network: NetworkOverview | undefined,
  protect: ProtectOverview | undefined,
): UniFiHealthSummary {
  const devices = network?.devices ?? [];
  const wifi = network?.wifiBroadcasts ?? [];
  const cameras = protect?.collections["protect-cameras"] ?? [];
  const sensors = protect?.collections["protect-sensors"] ?? [];
  const protectHardware = PROTECT_HEALTH_RESOURCES.flatMap((resource) => protect?.collections[resource] ?? []);

  const networkDevicesOffline = devices.filter((device) => device.state !== "ONLINE").length;
  const firmwareUpdates = devices.filter((device) => device.firmwareUpdatable).length;
  const protectDevicesOffline = protectHardware.filter(isProtectOffline).length;
  const sensorBatteriesLow = sensors.filter(hasLowBattery).length;

  return {
    issueCount: networkDevicesOffline + firmwareUpdates + protectDevicesOffline + sensorBatteriesLow,
    network: {
      clients: network?.clients.length ?? 0,
      devices: devices.length,
      devicesOffline: networkDevicesOffline,
      firewallPolicies: network?.firewallPolicies.length ?? 0,
      firmwareUpdates,
      networks: network?.networks.length ?? 0,
      wans: network?.wans.length ?? 0,
      wifi: wifi.length,
      wifiDisabled: wifi.filter((broadcast) => !broadcast.enabled).length,
    },
    protect: {
      alarmStatus: protectArmStatus(protect?.nvr),
      cameras: cameras.length,
      camerasOffline: cameras.filter(isProtectOffline).length,
      devicesOffline: protectDevicesOffline,
      sensorBatteriesLow,
      sensors: sensors.length,
      sensorsOpen: sensors.filter((sensor) => sensor.isOpened === true).length,
    },
  };
}
