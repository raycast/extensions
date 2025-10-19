import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseBatteryInfo } from "../battery-status";
import type { BatteryInfo } from "../battery-status";
import * as fixtures from "./fixtures/system-profiler-outputs";

// child_processモジュールをモック
vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("child_process")>();
  return {
    ...actual,
    execSync: vi.fn(),
  };
});

import { execSync } from "child_process";

describe("parseBatteryInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // console.errorをモックしてエラーログを抑制
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("正常系", () => {
    it("完全なバッテリー情報を正しくパースできる", () => {
      vi.mocked(execSync).mockReturnValue(fixtures.normalBatteryOutput);

      const result = parseBatteryInfo();

      expect(result).toEqual<BatteryInfo>({
        stateOfCharge: 85,
        isCharging: true,
        fullyCharged: false,
        cycleCount: 125,
        condition: "Normal",
        maxCapacity: 95,
        acConnected: true,
        acCharging: true,
        acWattage: 60,
      });
    });

    it("放電中のバッテリー情報を正しくパースできる", () => {
      vi.mocked(execSync).mockReturnValue(fixtures.batteryDischarging);

      const result = parseBatteryInfo();

      expect(result).toEqual<BatteryInfo>({
        stateOfCharge: 45,
        isCharging: false,
        fullyCharged: false,
        cycleCount: 250,
        condition: "Normal",
        maxCapacity: 88,
        acConnected: false,
        acCharging: false,
        acWattage: undefined,
      });
    });

    it("フル充電時のバッテリー情報を正しくパースできる", () => {
      vi.mocked(execSync).mockReturnValue(fixtures.batteryFullyCharged);

      const result = parseBatteryInfo();

      expect(result).toEqual<BatteryInfo>({
        stateOfCharge: 100,
        isCharging: false,
        fullyCharged: true,
        cycleCount: 50,
        condition: "Normal",
        maxCapacity: 98,
        acConnected: true,
        acCharging: false,
        acWattage: 87,
      });
    });

    it("Replace Soon状態のバッテリー情報を正しくパースできる", () => {
      vi.mocked(execSync).mockReturnValue(fixtures.batteryReplaceSoon);

      const result = parseBatteryInfo();

      expect(result).not.toBeNull();
      expect(result?.condition).toBe("Replace Soon");
      expect(result?.cycleCount).toBe(850);
      expect(result?.maxCapacity).toBe(72);
    });

    it("Service Battery状態のバッテリー情報を正しくパースできる", () => {
      vi.mocked(execSync).mockReturnValue(fixtures.batteryServiceRequired);

      const result = parseBatteryInfo();

      expect(result).not.toBeNull();
      expect(result?.condition).toBe("Service Battery");
      expect(result?.cycleCount).toBe(1200);
      expect(result?.maxCapacity).toBe(55);
    });

    it("AC非接続時の情報を正しく取得できる", () => {
      vi.mocked(execSync).mockReturnValue(fixtures.batteryDischarging);

      const result = parseBatteryInfo();

      expect(result).not.toBeNull();
      expect(result?.acConnected).toBe(false);
      expect(result?.acCharging).toBe(false);
      expect(result?.acWattage).toBeUndefined();
    });
  });

  describe("エッジケース", () => {
    it("maxCapacityが欠けている場合にnullを返す", () => {
      vi.mocked(execSync).mockReturnValue(fixtures.missingMaxCapacity);

      const result = parseBatteryInfo();

      expect(result).not.toBeNull();
      expect(result?.maxCapacity).toBeNull();
    });

    it("cycleCountが欠けている場合に0を返す", () => {
      vi.mocked(execSync).mockReturnValue(fixtures.missingCycleCount);

      const result = parseBatteryInfo();

      expect(result).not.toBeNull();
      expect(result?.cycleCount).toBe(0);
    });

    it("AC Wattageが欠けている場合にundefinedを返す", () => {
      vi.mocked(execSync).mockReturnValue(fixtures.acConnectedNoWattage);

      const result = parseBatteryInfo();

      expect(result).not.toBeNull();
      expect(result?.acConnected).toBe(true);
      expect(result?.acWattage).toBeUndefined();
    });
  });

  describe("異常系", () => {
    it("execSyncがエラーをスローした場合にnullを返す", () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("Command failed");
      });

      const result = parseBatteryInfo();

      expect(result).toBeNull();
    });

    it("State of Chargeが取得できない場合にnullを返す", () => {
      vi.mocked(execSync).mockReturnValue(fixtures.missingStateOfCharge);

      const result = parseBatteryInfo();

      expect(result).toBeNull();
    });

    it("空の出力の場合にnullを返す", () => {
      vi.mocked(execSync).mockReturnValue(fixtures.emptyOutput);

      const result = parseBatteryInfo();

      expect(result).toBeNull();
    });
  });

  describe("execSyncの呼び出し", () => {
    it("正しいコマンドとオプションでexecSyncを呼び出す", () => {
      vi.mocked(execSync).mockReturnValue(fixtures.normalBatteryOutput);

      parseBatteryInfo();

      expect(execSync).toHaveBeenCalledWith(
        "/usr/sbin/system_profiler SPPowerDataType",
        {
          encoding: "utf-8",
          env: expect.objectContaining({ LANG: "C" }),
        },
      );
    });
  });
});
