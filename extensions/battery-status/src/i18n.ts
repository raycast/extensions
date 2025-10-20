import { getPreferenceValues } from "@raycast/api";
import { execSync } from "child_process";

interface Translations {
  // Section titles
  batteryStatus: string;
  power: string;

  // Item titles
  chargeLevel: string;
  batteryTemperature: string;
  chargeDischargeCurrent: string;
  healthStatus: string;
  acAdapter: string;
  lastUpdated: string;

  // Status texts
  fullyCharged: string;
  charging: string;
  discharging: string;

  // Power source
  acConnected: string;
  batteryPowered: string;

  // Condition
  normal: string;
  replaceSoon: string;
  replaceNow: string;
  serviceBattery: string;
  unknown: string;

  // Time remaining
  chargingUntil: string;
  remaining: string;

  // Amperage
  chargingStatus: string;
  inUse: string;
  notAvailable: string;

  // Temperature
  highTemp: string;

  // Other
  maxCapacity: string;
  cycleCount: string;
  cycles: string;
  connected: string;
  notConnected: string;
  notCharging: string;
  update: string;

  // Error
  error: string;
  errorMessage: string;
}

const en: Translations = {
  // Section titles
  batteryStatus: "Battery Status",
  power: "Power",

  // Item titles
  chargeLevel: "Charge & Status",
  batteryTemperature: "Battery Temperature",
  chargeDischargeCurrent: "Charge/Discharge Current",
  healthStatus: "Health Status",
  acAdapter: "AC Adapter",
  lastUpdated: "Last Updated",

  // Status texts
  fullyCharged: "Fully Charged",
  charging: "Charging",
  discharging: "Discharging",

  // Power source
  acConnected: "AC Connected",
  batteryPowered: "Battery Powered",

  // Condition
  normal: "Normal",
  replaceSoon: "Replace Soon",
  replaceNow: "Replace Now",
  serviceBattery: "Service Battery",
  unknown: "Unknown",

  // Time remaining
  chargingUntil: "Until charged",
  remaining: "Remaining",

  // Amperage
  chargingStatus: "(charging)",
  inUse: "(in use)",
  notAvailable: "Not Available",

  // Temperature
  highTemp: "⚠️ High",

  // Other
  maxCapacity: "Max Capacity",
  cycleCount: "Cycle Count",
  cycles: "cycles",
  connected: "Connected",
  notConnected: "Not Connected",
  notCharging: "Not Charging",
  update: "Update",

  // Error
  error: "Error",
  errorMessage:
    "Could not retrieve battery information. This Mac may not have a battery.",
};

const ja: Translations = {
  // Section titles
  batteryStatus: "バッテリー状態",
  power: "電源",

  // Item titles
  chargeLevel: "残量と充電",
  batteryTemperature: "バッテリー温度",
  chargeDischargeCurrent: "充放電電流",
  healthStatus: "健康状態",
  acAdapter: "AC充電器",
  lastUpdated: "最終更新",

  // Status texts
  fullyCharged: "フル充電済み",
  charging: "充電中",
  discharging: "放電中",

  // Power source
  acConnected: "AC接続",
  batteryPowered: "バッテリー動作",

  // Condition
  normal: "正常",
  replaceSoon: "まもなく交換",
  replaceNow: "今すぐ交換",
  serviceBattery: "バッテリー修理",
  unknown: "不明",

  // Time remaining
  chargingUntil: "充電完了まで",
  remaining: "残り",

  // Amperage
  chargingStatus: "(充電中)",
  inUse: "(使用中)",
  notAvailable: "未取得",

  // Temperature
  highTemp: "⚠️ 高温",

  // Other
  maxCapacity: "最大容量",
  cycleCount: "サイクル数",
  cycles: "回",
  connected: "接続済み",
  notConnected: "接続なし",
  notCharging: "充電なし",
  update: "更新",

  // Error
  error: "エラー",
  errorMessage:
    "バッテリ情報を取得できませんでした。このMacにはバッテリがない可能性があります。",
};

/**
 * システムのロケールを検出
 * macOSの優先言語設定から判定
 */
function detectSystemLocale(): "en" | "ja" {
  try {
    const output = execSync("defaults read -g AppleLanguages", {
      encoding: "utf-8",
    });
    const match = output.match(/"([^"]+)"/);
    if (match) {
      const primaryLocale = match[1];
      const isJapanese = primaryLocale.toLowerCase().startsWith("ja");
      return isJapanese ? "ja" : "en";
    }
  } catch {
    // エラー時はデフォルト
  }
  return "en";
}

function getCurrentLanguage(): "en" | "ja" {
  try {
    const preferences = getPreferenceValues<Preferences>();
    if (preferences.language === "auto") {
      return detectSystemLocale();
    }
    return preferences.language;
  } catch {
    return detectSystemLocale();
  }
}

function getTranslations(): Translations {
  const lang = getCurrentLanguage();
  return lang === "ja" ? ja : en;
}

export function t(key: keyof Translations): string {
  return getTranslations()[key];
}
