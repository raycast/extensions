import { describe, it, expect } from "vitest";
import {
  getStatusText,
  getPowerSourceText,
  getConditionText,
  getFormattedTime,
  getTimeRemainingText,
  getAmperageText,
  getTemperatureText,
} from "../helpers";
import type { BatteryInfo } from "../battery-status";

describe("helpers", () => {
  describe("getStatusText", () => {
    it("フル充電時は'フル充電済み'を返す", () => {
      const batteryInfo: BatteryInfo = {
        stateOfCharge: 100,
        isCharging: false,
        fullyCharged: true,
        cycleCount: 50,
        condition: "Normal",
        maxCapacity: 98,
        acConnected: true,
        acCharging: false,
        acWattage: 60,
      };

      expect(getStatusText(batteryInfo)).toBe("フル充電済み");
    });

    it("充電中は'充電中'を返す", () => {
      const batteryInfo: BatteryInfo = {
        stateOfCharge: 50,
        isCharging: true,
        fullyCharged: false,
        cycleCount: 50,
        condition: "Normal",
        maxCapacity: 98,
        acConnected: true,
        acCharging: true,
        acWattage: 60,
      };

      expect(getStatusText(batteryInfo)).toBe("充電中");
    });

    it("放電中は'放電中'を返す", () => {
      const batteryInfo: BatteryInfo = {
        stateOfCharge: 50,
        isCharging: false,
        fullyCharged: false,
        cycleCount: 50,
        condition: "Normal",
        maxCapacity: 98,
        acConnected: false,
        acCharging: false,
      };

      expect(getStatusText(batteryInfo)).toBe("放電中");
    });
  });

  describe("getPowerSourceText", () => {
    it("AC接続時は'AC接続'を返す", () => {
      const batteryInfo: BatteryInfo = {
        stateOfCharge: 50,
        isCharging: true,
        fullyCharged: false,
        cycleCount: 50,
        condition: "Normal",
        maxCapacity: 98,
        acConnected: true,
        acCharging: true,
        acWattage: 60,
      };

      expect(getPowerSourceText(batteryInfo)).toBe("AC接続");
    });

    it("AC非接続時は'バッテリー動作'を返す", () => {
      const batteryInfo: BatteryInfo = {
        stateOfCharge: 50,
        isCharging: false,
        fullyCharged: false,
        cycleCount: 50,
        condition: "Normal",
        maxCapacity: 98,
        acConnected: false,
        acCharging: false,
      };

      expect(getPowerSourceText(batteryInfo)).toBe("バッテリー動作");
    });
  });

  describe("getConditionText", () => {
    it("Normalは'正常'を返す", () => {
      expect(getConditionText("Normal")).toBe("正常");
    });

    it("Replace Soonは'まもなく交換'を返す", () => {
      expect(getConditionText("Replace Soon")).toBe("まもなく交換");
    });

    it("Replace Nowは'今すぐ交換'を返す", () => {
      expect(getConditionText("Replace Now")).toBe("今すぐ交換");
    });

    it("Service Batteryは'バッテリー修理'を返す", () => {
      expect(getConditionText("Service Battery")).toBe("バッテリー修理");
    });

    it("不明は'不明'を返す", () => {
      expect(getConditionText("不明")).toBe("不明");
    });
  });

  describe("getFormattedTime", () => {
    it("nullの場合は空文字を返す", () => {
      expect(getFormattedTime(null)).toBe("");
    });

    it("時刻を HH:MM:SS 形式でフォーマットする", () => {
      const date = new Date("2025-01-01T14:05:03");
      expect(getFormattedTime(date)).toBe("14:05:03");
    });

    it("1桁の時刻を0パディングする", () => {
      const date = new Date("2025-01-01T09:05:03");
      expect(getFormattedTime(date)).toBe("09:05:03");
    });
  });

  describe("getTimeRemainingText", () => {
    it("フル充電時は空文字を返す", () => {
      expect(getTimeRemainingText(120, false, true)).toBe("");
    });

    it("timeRemainingがundefinedの場合は空文字を返す", () => {
      expect(getTimeRemainingText(undefined, false, false)).toBe("");
    });

    it("充電中は'充電完了まで'と表示する", () => {
      expect(getTimeRemainingText(184, true, false)).toBe("充電完了まで 3:04");
    });

    it("放電中は'残り'と表示する", () => {
      expect(getTimeRemainingText(125, false, false)).toBe("残り 2:05");
    });

    it("分が0の場合は00と表示する", () => {
      expect(getTimeRemainingText(120, false, false)).toBe("残り 2:00");
    });

    it("分が1桁の場合は0パディングする", () => {
      expect(getTimeRemainingText(67, true, false)).toBe("充電完了まで 1:07");
    });
  });

  describe("getAmperageText", () => {
    it("amperageがundefinedの場合は'未取得'を返す", () => {
      expect(getAmperageText(undefined, false)).toBe("未取得");
    });

    it("充電中は'(充電中)'と表示する", () => {
      expect(getAmperageText(1500, true)).toBe("1500mA (充電中)");
    });

    it("放電中は'(使用中)'と表示する", () => {
      expect(getAmperageText(-800, false)).toBe("800mA (使用中)");
    });

    it("負の値は絶対値にする", () => {
      expect(getAmperageText(-1200, false)).toBe("1200mA (使用中)");
    });

    it("0の場合は0mAと表示する", () => {
      expect(getAmperageText(0, false)).toBe("0mA (使用中)");
    });
  });

  describe("getTemperatureText", () => {
    it("temperatureがundefinedの場合は'未取得'を返す", () => {
      expect(getTemperatureText(undefined)).toBe("未取得");
    });

    it("正常な温度を小数点1桁で表示する", () => {
      expect(getTemperatureText(32.5)).toBe("32.5℃");
    });

    it("45℃以上の場合は高温警告を表示する", () => {
      expect(getTemperatureText(48.2)).toBe("48.2℃ ⚠️ 高温");
    });

    it("45℃ちょうどの場合は高温警告を表示する", () => {
      expect(getTemperatureText(45.0)).toBe("45.0℃ ⚠️ 高温");
    });

    it("44.9℃の場合は高温警告を表示しない", () => {
      expect(getTemperatureText(44.9)).toBe("44.9℃");
    });
  });
});
