import { describe, expect, it } from "vitest";
import { createSnapshot, inverterDisplayName } from "../src/model";
import { createMetricSections } from "../src/metrics";
import {
  ApiVersionInfo,
  InverterInfoResponse,
  InverterRealtimeDataResponse,
  MeterRealtimeDataResponse,
  PowerFlowRealtimeDataResponse,
  StorageRealtimeDataResponse,
} from "../src/types";

const inverterResponse: InverterInfoResponse = {
  Body: {
    Data: {
      "1": {
        CustomName: "&#82;&#111;&#111;&#102;",
        DT: 1,
        ErrorCode: 0,
        InverterState: "Running",
        PVPower: 5000,
        Show: 1,
        StatusCode: 7,
        UniqueID: "one",
      },
      "2": {
        CustomName: "Garage",
        DT: 1,
        ErrorCode: 42,
        InverterState: "Error",
        PVPower: 0,
        Show: 1,
        StatusCode: 3,
        UniqueID: "two",
      },
    },
  },
  Head: { Status: { Code: 0 }, Timestamp: "2026-09-15T08:00:00Z" },
};

const powerResponse: PowerFlowRealtimeDataResponse = {
  Body: {
    Data: {
      Site: {
        BackupMode: false,
        BatteryStandby: true,
        E_Total: 38_573_188,
        P_Akku: -6.2,
        P_Grid: -4177.7,
        P_Load: -2282.5,
        P_PV: 6621.3,
        rel_Autonomy: 100,
        rel_SelfConsumption: 35.3,
      },
      Ohmpilots: {
        "1": { CodeOfState: 0, EnergyReal_WAC_Sum_Consumed: 1200 },
        "2": { CodeOfState: 0, EnergyReal_WAC_Sum_Consumed: 800 },
      },
      Smartloads: {
        Ohmpilots: {
          "0": { P_AC_Total: 900, State: "normal", Temperature: 52 },
        },
      },
    },
  },
  Head: { Status: { Code: 0 }, Timestamp: "2026-09-15T08:01:00Z" },
};

const apiVersion: ApiVersionInfo = {
  APIVersion: 1,
  BaseURL: "/solar_api/v1/",
  CompatibilityRange: "1.8-0",
};

const inverterRealtime: InverterRealtimeDataResponse = {
  Body: {
    Data: {
      DAY_ENERGY: { Unit: "Wh", Values: { "1": 12_300 } },
      TOTAL_ENERGY: { Unit: "Wh", Values: { "1": 38_573_188 } },
      YEAR_ENERGY: { Unit: "Wh", Values: { "1": 2_400_000 } },
    },
  },
  Head: { Status: { Code: 0 }, Timestamp: "2026-09-15T08:01:00Z" },
};

const meterRealtime: MeterRealtimeDataResponse = {
  Body: {
    Data: {
      "0": {
        Frequency_Phase_Average: 50.01,
        Meter_Location_Current: 0,
        PowerReal_P_Sum: -4177.7,
        Voltage_AC_Phase_1: 230,
        Voltage_AC_Phase_2: 231,
        Voltage_AC_Phase_3: 232,
      },
    },
  },
  Head: { Status: { Code: 0 }, Timestamp: "2026-09-15T08:01:00Z" },
};

const storageRealtime: StorageRealtimeDataResponse = {
  Body: {
    Data: {
      "0": {
        Controller: {
          Current_DC: -3.2,
          StateOfCharge_Relative: 72,
          Temperature_Cell: 24.5,
          Voltage_DC: 403.2,
        },
      },
    },
  },
  Head: { Status: { Code: 0 }, Timestamp: "2026-09-15T08:01:00Z" },
};

describe("createSnapshot", () => {
  it("combines current endpoint payloads without requiring optional battery fields", () => {
    const snapshot = createSnapshot({
      apiVersion,
      inverterRealtime,
      inverterResponse,
      meterRealtime,
      powerResponse,
      storageRealtime,
    });

    expect(snapshot.inverters).toHaveLength(2);
    expect(snapshot.inverters[0]?.info.CustomName).toBe("Roof");
    expect(inverterDisplayName(snapshot.inverters[0]!)).toBe("Roof");
    expect(snapshot.errorCount).toBe(1);
    expect(snapshot.apiVersion?.CompatibilityRange).toBe("1.8-0");
    expect(snapshot.site.E_Day).toBe(12_300);
    expect(snapshot.site.E_Year).toBe(2_400_000);
    expect(snapshot.site.StateOfCharge_Relative).toBe(72);
    expect(snapshot.meters[0]?.voltageAverageVolts).toBe(231);
    expect(snapshot.storages[0]?.temperatureCelsius).toBe(24.5);
    expect(snapshot.ohmpilots[0]?.powerWatts).toBe(900);
    expect(snapshot.ohmpilots[0]?.energyWattHours).toBeNull();
    expect(snapshot.ohmpilotEnergy).toBe(2000);
    expect(snapshot.timestamp).toBe("2026-09-15T08:01:00Z");

    const sections = createMetricSections(snapshot);
    expect(sections.find((section) => section.title === "Energy")?.items).toContainEqual(
      expect.objectContaining({ label: "Energy Today", value: "12.30 kWh" }),
    );
    expect(sections.find((section) => section.title === "Battery")?.items).toContainEqual(
      expect.objectContaining({ label: "Battery Charge", value: "72.0%" }),
    );
    expect(sections.find((section) => section.title === "Ohmpilot")?.items).toContainEqual(
      expect.objectContaining({ label: "Current Power", value: "900.0 W" }),
    );
    expect(sections.find((section) => section.title === "Ohmpilot Energy")?.items).toContainEqual(
      expect.objectContaining({ label: "All Devices", value: "2.00 kWh" }),
    );
  });

  it("keeps the core snapshot usable when optional endpoint data is absent", () => {
    const snapshot = createSnapshot({ inverterResponse, powerResponse, warnings: ["Battery: unsupported"] });

    expect(snapshot.inverters).toHaveLength(2);
    expect(snapshot.meters).toEqual([]);
    expect(snapshot.storages).toEqual([]);
    expect(snapshot.site.StateOfCharge_Relative).toBeNull();
    expect(snapshot.warnings).toEqual(["Battery: unsupported"]);
  });

  it("does not report zero Ohmpilot energy when the legacy counter is unavailable", () => {
    const response: PowerFlowRealtimeDataResponse = {
      ...powerResponse,
      Body: {
        Data: {
          Site: powerResponse.Body.Data.Site,
          Ohmpilots: { "1": { CodeOfState: 0 } },
        },
      },
    };

    const snapshot = createSnapshot({ inverterResponse, powerResponse: response });

    expect(snapshot.ohmpilotEnergy).toBeNull();
    expect(snapshot.ohmpilots[0]?.energyWattHours).toBeNull();
  });

  it("does not publish a partial Ohmpilot energy sum as the total", () => {
    const response: PowerFlowRealtimeDataResponse = {
      ...powerResponse,
      Body: {
        Data: {
          Site: powerResponse.Body.Data.Site,
          Ohmpilots: {
            "1": { CodeOfState: 0, EnergyReal_WAC_Sum_Consumed: 1200 },
            "2": { CodeOfState: 0 },
          },
        },
      },
    };

    const snapshot = createSnapshot({ inverterResponse, powerResponse: response });

    expect(snapshot.ohmpilotEnergy).toBeNull();
  });
});
