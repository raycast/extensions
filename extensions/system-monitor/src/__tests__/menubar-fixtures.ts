import { MenuBarCollectors, MenuBarSnapshot, MENU_BAR_SNAPSHOT_SCHEMA_VERSION } from "../menubar/types";

export const fixtureCollectors = (): MenuBarCollectors => ({
  cpu: async () => "42",
  backgroundStorage: async () => [
    { diskName: "Macintosh HD", totalSize: "500", totalAvailableStorage: "200", usedStorage: "300" },
  ],
  osInfo: async () => ({ release: "26.0", build: "25A1", display: "macOS 26.0 (25A1)" }),
  storage: async () => [
    { diskName: "Macintosh HD", totalSize: "500", totalAvailableStorage: "200", usedStorage: "300" },
  ],
  memory: async () => ({ totalMem: "16", freeMemPercentage: "25", freeMem: "4" }),
  network: async () => ({ upload: 10, download: 20 }),
  battery: async () => ({
    condition: "Normal",
    cycleCount: "100",
    batteryLevel: "80",
    fullyCharged: false,
    isCharging: true,
    isOnAcPower: true,
    maximumCapacity: "95%",
    temperature: "30.0 °C",
    timeRemaining: 120,
  }),
  temperature: async () => ({
    cpuAverage: 45,
    cpuMax: 50,
    gpuAverage: 40,
    sensors: [],
    isAppleSilicon: true,
    sensorAvailable: true,
    chipModel: "Apple M1",
    coreCount: 8,
    dieSensorCount: 2,
  }),
});

export const fixtureSnapshot = (collectedAt = 1_000): MenuBarSnapshot => ({
  schemaVersion: MENU_BAR_SNAPSHOT_SCHEMA_VERSION,
  collectedAt,
  collectionDurationMs: 25,
  values: {
    osInfo: {
      status: "fresh",
      value: { release: "26.0", build: "25A1", display: "macOS 26.0 (25A1)" },
      collectedAt,
    },
    storage: {
      status: "fresh",
      value: [{ diskName: "Macintosh HD", totalSize: "500", totalAvailableStorage: "200", usedStorage: "300" }],
      collectedAt,
    },
    cpuUsage: { status: "fresh", value: "42", collectedAt },
    memory: {
      status: "fresh",
      value: { totalMem: "16", freeMemPercentage: "25", freeMem: "4" },
      collectedAt,
    },
    networkUsage: { status: "fresh", value: { upload: 10, download: 20 }, collectedAt },
    batteryData: {
      status: "fresh",
      value: {
        condition: "Normal",
        cycleCount: "100",
        batteryLevel: "80",
        fullyCharged: false,
        isCharging: true,
        isOnAcPower: true,
        maximumCapacity: "95%",
        temperature: "30.0 °C",
        timeRemaining: 120,
      },
      collectedAt,
    },
    isOnAC: { status: "fresh", value: true, collectedAt },
    temperatureData: {
      status: "fresh",
      value: {
        cpuAverage: 45,
        cpuMax: 50,
        gpuAverage: 40,
        sensors: [],
        isAppleSilicon: true,
        sensorAvailable: true,
        chipModel: "Apple M1",
        coreCount: 8,
        dieSensorCount: 2,
      },
      collectedAt,
    },
  },
});
