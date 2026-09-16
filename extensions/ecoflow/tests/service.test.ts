import { describe, expect, it, vi } from "vitest";
import type { EcoFlowTransport } from "../src/devices/service";
import { EcoFlowService, resolveDevice } from "../src/devices/service";

describe("EcoFlowService", () => {
  it("isolates a quota failure to the affected device", async () => {
    const transport: EcoFlowTransport = {
      listDevices: vi.fn().mockResolvedValue([
        { sn: "DCABONLINE1234", online: 1, deviceName: "Garage" },
        { sn: "R331ERROR12345", online: 1, deviceName: "Office" },
        { sn: "HW52OFFLINE123", online: 0, deviceName: "Desk Plug" },
      ]),
      getAllQuotas: vi.fn(async (serialNumber: string) => {
        if (serialNumber.includes("ERROR")) throw new Error("quota unavailable");
        return { "bmsMaster.soc": "75" };
      }),
      setDeviceCommand: vi.fn(),
    };

    const snapshots = await new EcoFlowService(transport).listDeviceSnapshots();
    expect(snapshots).toHaveLength(3);
    expect(snapshots[0]).toMatchObject({ name: "Garage", batteryLevel: 75 });
    expect(snapshots[1]).toMatchObject({ name: "Office", quotaError: "quota unavailable" });
    expect(snapshots[2]).toMatchObject({ name: "Desk Plug", online: false });
    expect(transport.getAllQuotas).toHaveBeenCalledTimes(2);
  });

  it("rejects ambiguous partial device names", () => {
    expect(() =>
      resolveDevice(
        [
          { sn: "ONE", online: 1, deviceName: "Garage Main" },
          { sn: "TWO", online: 1, deviceName: "Garage Backup" },
        ],
        "garage",
      ),
    ).toThrow(/matches more than one device/i);
  });

  it("resolves the masked serial identifiers returned by AI discovery", () => {
    const selected = resolveDevice(
      [
        { sn: "D3M1ABCDEF1234", online: 1, deviceName: "Battery" },
        { sn: "R621ZYXWVU5678", online: 1, deviceName: "Battery" },
      ],
      "D3M1••••1234",
    );

    expect(selected.sn).toBe("D3M1ABCDEF1234");
  });

  it("builds and sends a verified command payload", async () => {
    const setDeviceCommand = vi.fn();
    const transport: EcoFlowTransport = {
      listDevices: vi.fn().mockResolvedValue([{ sn: "KT21TEST1234", online: 1, deviceName: "WAVE" }]),
      getAllQuotas: vi.fn().mockResolvedValue({ "pd.setTemp": 20 }),
      setDeviceCommand,
    };

    const result = await new EcoFlowService(transport).executeCommand({
      serialNumber: "KT21TEST1234",
      commandId: "set_temperature",
      value: 22,
    });

    expect(result.commandTitle).toBe("Set Temperature");
    expect(setDeviceCommand).toHaveBeenCalledWith("KT21TEST1234", {
      moduleType: 1,
      operateType: "setTemp",
      params: { setTemp: 22 },
    });
  });
});
