import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("i18n", () => {
  let mockGetPreferenceValues: ReturnType<typeof vi.fn>;
  let mockExecSync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockGetPreferenceValues = vi.fn();
    mockExecSync = vi.fn();

    vi.doMock("@raycast/api", () => ({
      getPreferenceValues: mockGetPreferenceValues,
    }));

    vi.doMock("child_process", () => ({
      execSync: mockExecSync,
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("手動言語設定", () => {
    it("英語設定時は英語翻訳を返す", async () => {
      mockGetPreferenceValues.mockReturnValue({ language: "en" });

      const { t: tFunc } = await import("../i18n");
      expect(tFunc("batteryStatus")).toBe("Battery Status");
      expect(tFunc("update")).toBe("Update");
    });

    it("日本語設定時は日本語翻訳を返す", async () => {
      mockGetPreferenceValues.mockReturnValue({ language: "ja" });

      const { t: tFunc } = await import("../i18n");
      expect(tFunc("batteryStatus")).toBe("バッテリー状態");
      expect(tFunc("update")).toBe("更新");
    });
  });

  describe("自動言語検出", () => {
    it("autoモード + 日本語システム = 日本語翻訳", async () => {
      mockGetPreferenceValues.mockReturnValue({ language: "auto" });
      mockExecSync.mockReturnValue('(\n    "ja-JP",\n    "en-US"\n)');

      const { t: tFunc } = await import("../i18n");
      expect(tFunc("batteryStatus")).toBe("バッテリー状態");
    });

    it("autoモード + 英語システム = 英語翻訳", async () => {
      mockGetPreferenceValues.mockReturnValue({ language: "auto" });
      mockExecSync.mockReturnValue('(\n    "en-US",\n    "ja-JP"\n)');

      const { t: tFunc } = await import("../i18n");
      expect(tFunc("batteryStatus")).toBe("Battery Status");
    });
  });

  describe("エラー処理", () => {
    it("設定取得エラー時は日本語システムから検出", async () => {
      mockGetPreferenceValues.mockImplementation(() => {
        throw new Error("Preferences not available");
      });
      mockExecSync.mockReturnValue('(\n    "ja-JP",\n    "en-US"\n)');

      const { t: tFunc } = await import("../i18n");
      expect(tFunc("batteryStatus")).toBe("バッテリー状態");
    });

    it("設定取得エラー時は英語システムから検出", async () => {
      mockGetPreferenceValues.mockImplementation(() => {
        throw new Error("Preferences not available");
      });
      mockExecSync.mockReturnValue('(\n    "en-US",\n    "ja-JP"\n)');

      const { t: tFunc } = await import("../i18n");
      expect(tFunc("batteryStatus")).toBe("Battery Status");
    });

    it("システム言語検出エラー時は英語をデフォルトで使用", async () => {
      mockGetPreferenceValues.mockReturnValue({ language: "auto" });
      mockExecSync.mockImplementation(() => {
        throw new Error("Command failed");
      });

      const { t: tFunc } = await import("../i18n");
      expect(tFunc("batteryStatus")).toBe("Battery Status");
    });

    it("言語出力にマッチがない場合は英語をデフォルトで使用", async () => {
      mockGetPreferenceValues.mockReturnValue({ language: "auto" });
      mockExecSync.mockReturnValue("invalid output");

      const { t: tFunc } = await import("../i18n");
      expect(tFunc("batteryStatus")).toBe("Battery Status");
    });
  });

  describe("翻訳キー", () => {
    beforeEach(() => {
      mockGetPreferenceValues.mockReturnValue({ language: "ja" });
    });

    it("全ての翻訳キーが正しく動作する", async () => {
      const { t: tFunc } = await import("../i18n");

      // Section titles
      expect(tFunc("batteryStatus")).toBe("バッテリー状態");
      expect(tFunc("power")).toBe("電源");

      // Item titles
      expect(tFunc("chargeLevel")).toBe("残量と充電");
      expect(tFunc("batteryTemperature")).toBe("バッテリー温度");
      expect(tFunc("healthStatus")).toBe("健康状態");

      // Status texts
      expect(tFunc("fullyCharged")).toBe("フル充電済み");
      expect(tFunc("charging")).toBe("充電中");
      expect(tFunc("discharging")).toBe("放電中");

      // Condition
      expect(tFunc("normal")).toBe("正常");
      expect(tFunc("replaceSoon")).toBe("まもなく交換");

      // Error
      expect(tFunc("error")).toBe("エラー");
    });
  });
});
