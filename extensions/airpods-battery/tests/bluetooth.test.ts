import { describe, expect, it } from "vitest";
import { parseAirPodsBatteryReport } from "../src/bluetooth";

describe("parseAirPodsBatteryReport", () => {
  it("reads left and right battery values from connected AirPods", () => {
    const result = parseAirPodsBatteryReport(
      JSON.stringify({
        SPBluetoothDataType: [
          {
            device_connected: [
              {
                "Rana’s AirPods Pro": {
                  device_batteryLevelLeft: "8%",
                  device_batteryLevelRight: "70%",
                },
              },
            ],
          },
        ],
      }),
    );

    expect(result.status).toBe("connected");
    expect(result).toMatchObject({
      battery: {
        name: "Rana’s AirPods Pro",
        left: "8%",
        right: "70%",
      },
      warnings: [],
    });
  });

  it("handles connected AirPods without a case battery value", () => {
    const result = parseAirPodsBatteryReport(
      JSON.stringify({
        SPBluetoothDataType: [
          {
            device_connected: [
              {
                "Rana’s AirPods Pro": {
                  device_batteryLevelLeft: "8%",
                  device_batteryLevelRight: "70%",
                },
              },
            ],
          },
        ],
      }),
    );

    expect(result.status).toBe("connected");

    if (result.status === "connected") {
      expect(result.battery.case).toBeUndefined();
    }
  });

  it("returns not-connected when no AirPods are connected", () => {
    const result = parseAirPodsBatteryReport(
      JSON.stringify({
        SPBluetoothDataType: [
          {
            device_connected: [
              {
                "Magic Keyboard": {
                  device_batteryLevel: "95%",
                },
              },
            ],
          },
        ],
      }),
    );

    expect(result).toEqual({
      status: "not-connected",
      message: "No connected AirPods were found.",
    });
  });

  it("chooses the first connected AirPods-like device", () => {
    const result = parseAirPodsBatteryReport(
      JSON.stringify({
        SPBluetoothDataType: [
          {
            device_connected: [
              {
                "First AirPods": {
                  device_batteryLevelLeft: "10%",
                  device_batteryLevelRight: "11%",
                },
              },
              {
                "Second AirPods": {
                  device_batteryLevelLeft: "90%",
                  device_batteryLevelRight: "91%",
                },
              },
            ],
          },
        ],
      }),
    );

    expect(result.status).toBe("connected");

    if (result.status === "connected") {
      expect(result.battery.name).toBe("First AirPods");
      expect(result.battery.left).toBe("10%");
      expect(result.battery.right).toBe("11%");
    }
  });

  it("reports malformed JSON as an error", () => {
    expect(parseAirPodsBatteryReport("{nope")).toEqual({
      status: "error",
      message: "Bluetooth data was not valid JSON.",
    });
  });

  it("reports empty Bluetooth JSON as not connected", () => {
    expect(parseAirPodsBatteryReport("{}")).toEqual({
      status: "not-connected",
      message: "No connected AirPods were found.",
    });
  });
});
