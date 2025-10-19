import type { BatteryInfo, BatteryCondition } from "./battery-status";
import { t } from "./i18n";

export function getStatusText(batteryInfo: BatteryInfo): string {
  if (batteryInfo.fullyCharged) return t("fullyCharged");
  if (batteryInfo.isCharging) return t("charging");
  return t("discharging");
}

export function getPowerSourceText(batteryInfo: BatteryInfo): string {
  return batteryInfo.acConnected ? t("acConnected") : t("batteryPowered");
}

export function getConditionText(condition: BatteryCondition): string {
  switch (condition) {
    case "Normal":
      return t("normal");
    case "Replace Soon":
      return t("replaceSoon");
    case "Replace Now":
      return t("replaceNow");
    case "Service Battery":
      return t("serviceBattery");
    default:
      return t("unknown");
  }
}

export function getFormattedTime(lastUpdated: Date | null): string {
  if (!lastUpdated) return "";

  const hours = lastUpdated.getHours().toString().padStart(2, "0");
  const minutes = lastUpdated.getMinutes().toString().padStart(2, "0");
  const seconds = lastUpdated.getSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function getTimeRemainingText(
  timeRemaining: number | undefined,
  isCharging: boolean,
  fullyCharged: boolean,
): string {
  if (fullyCharged) return "";
  if (timeRemaining === undefined) return "";

  const hours = Math.floor(timeRemaining / 60);
  const minutes = timeRemaining % 60;
  const timeStr = `${hours}:${minutes.toString().padStart(2, "0")}`;

  if (isCharging) {
    return `${t("chargingUntil")} ${timeStr}`;
  } else {
    return `${t("remaining")} ${timeStr}`;
  }
}

export function getAmperageText(
  amperage: number | undefined,
  isCharging: boolean,
): string {
  if (amperage === undefined) return t("notAvailable");

  const absAmperage = Math.abs(amperage);
  if (isCharging) {
    return `${absAmperage}mA ${t("chargingStatus")}`;
  } else {
    return `${absAmperage}mA ${t("inUse")}`;
  }
}

export function getTemperatureText(temperature: number | undefined): string {
  if (temperature === undefined) return t("notAvailable");

  const tempStr = `${temperature.toFixed(1)}℃`;
  if (temperature >= 45) {
    return `${tempStr} ${t("highTemp")}`;
  }
  return tempStr;
}
