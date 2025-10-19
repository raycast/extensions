import React from "react";
import { List, Action, ActionPanel } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { execSync } from "child_process";
import {
  getStatusText,
  getPowerSourceText,
  getConditionText,
  getFormattedTime,
  getTimeRemainingText,
  getAmperageText,
  getTemperatureText,
} from "./helpers";
import { t } from "./i18n";

export type BatteryCondition =
  | "Normal"
  | "Replace Soon"
  | "Replace Now"
  | "Service Battery"
  | "不明";

export interface BatteryInfo {
  stateOfCharge: number;
  isCharging: boolean;
  fullyCharged: boolean;
  cycleCount: number;
  condition: BatteryCondition;
  maxCapacity: number | null;
  acConnected: boolean;
  acCharging: boolean;
  acWattage?: number;
  timeRemaining?: number; // 分単位、取得できない場合はundefined
  amperage?: number; // mA、取得できない場合はundefined
  temperature?: number; // 摂氏、取得できない場合はundefined
}

export function parseBatteryInfo(): BatteryInfo | null {
  try {
    const output = execSync("/usr/sbin/system_profiler SPPowerDataType", {
      encoding: "utf-8",
      env: { ...process.env, LANG: "C" },
    });

    // 正規表現でデータを抽出
    const stateOfChargeMatch = output.match(/State of Charge \(%\):\s*(\d+)/);
    const chargingMatch = output.match(/Charging:\s*(\w+)/);
    const fullyChargedMatch = output.match(/Fully Charged:\s*(\w+)/);
    const cycleCountMatch = output.match(/Cycle Count:\s*(\d+)/);
    const conditionMatch = output.match(/Condition:\s*([^\n]+)/);
    const maxCapacityMatch = output.match(/Maximum Capacity:\s*([\d]+)%/);
    const acConnectedMatch = output.match(
      /AC Charger Information:[\s\S]*?Connected:\s*(\w+)/,
    );
    const acChargingMatch = output.match(
      /AC Charger Information:[\s\S]*?Charging:\s*(\w+)/,
    );
    const acWattageMatch = output.match(/Wattage \(W\):\s*(\d+)/);

    if (!stateOfChargeMatch) {
      return null;
    }

    const stateOfCharge = parseInt(stateOfChargeMatch[1]);
    const isCharging = chargingMatch?.[1] === "Yes";
    const fullyCharged = fullyChargedMatch?.[1] === "Yes";
    const cycleCount = cycleCountMatch ? parseInt(cycleCountMatch[1]) : 0;
    const condition: BatteryCondition =
      (conditionMatch?.[1] as BatteryCondition) || "不明";
    const maxCapacity = maxCapacityMatch ? parseInt(maxCapacityMatch[1]) : null;
    const acConnected = acConnectedMatch?.[1] === "Yes";
    const acCharging = acChargingMatch?.[1] === "Yes";
    const acWattage = acWattageMatch ? parseInt(acWattageMatch[1]) : undefined;

    // pmsetから残り時間を取得
    let timeRemaining: number | undefined;
    try {
      const pmsetOutput = execSync("/usr/bin/pmset -g batt", {
        encoding: "utf-8",
        env: { ...process.env, LANG: "C" },
      });
      const timeMatch = pmsetOutput.match(/(\d+):(\d+) remaining/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        timeRemaining = hours * 60 + minutes;
      }
    } catch {
      // pmsetが失敗してもエラーにしない
      timeRemaining = undefined;
    }

    // ioregから電流値と温度を取得
    let amperage: number | undefined;
    let temperature: number | undefined;
    try {
      const ioregOutput = execSync("/usr/sbin/ioreg -rn AppleSmartBattery", {
        encoding: "utf-8",
        env: { ...process.env, LANG: "C" },
      });

      const amperageMatch = ioregOutput.match(/"Amperage"\s*=\s*(\d+)/);
      if (amperageMatch) {
        // BigIntを使って正確に処理
        const ampBigInt = BigInt(amperageMatch[1]);
        const maxU32 = BigInt(4294967296); // 2^32
        const maxS32 = BigInt(2147483647); // 2^31 - 1

        let amp: number;
        if (ampBigInt > BigInt(4294967295)) {
          // 64ビット値 - 下位32ビットを取得
          const lower32 = ampBigInt % maxU32;
          amp = lower32 > maxS32 ? Number(lower32 - maxU32) : Number(lower32);
        } else if (ampBigInt > maxS32) {
          // 32ビット符号なし整数を符号付きに変換
          amp = Number(ampBigInt - maxU32);
        } else {
          amp = Number(ampBigInt);
        }
        amperage = amp;
      }

      const tempMatch = ioregOutput.match(/"Temperature"\s*=\s*(\d+)/);
      if (tempMatch) {
        const tempKelvin = parseInt(tempMatch[1]) / 10;
        temperature = tempKelvin - 273.15;
      }
    } catch {
      // ioregが失敗してもエラーにしない
      amperage = undefined;
      temperature = undefined;
    }

    return {
      stateOfCharge,
      isCharging,
      fullyCharged,
      cycleCount,
      condition,
      maxCapacity,
      acConnected,
      acCharging,
      acWattage,
      timeRemaining,
      amperage,
      temperature,
    };
  } catch (error: unknown) {
    console.error("バッテリ情報の取得に失敗しました:", error);
    return null;
  }
}

export default function Command() {
  const [batteryInfo, setBatteryInfo] = useState<BatteryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const updateBatteryInfo = useCallback((): void => {
    setIsLoading(true);
    const info = parseBatteryInfo();
    setBatteryInfo(info);
    setLastUpdated(new Date());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    updateBatteryInfo();
  }, [updateBatteryInfo]);

  const RefreshAction = () => (
    <ActionPanel>
      <Action
        title={t("update")}
        onAction={updateBatteryInfo}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    </ActionPanel>
  );

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (!batteryInfo) {
    return (
      <List>
        <List.Item title={t("error")} subtitle={t("errorMessage")} />
      </List>
    );
  }

  return (
    <List>
      <List.Section title={t("batteryStatus")}>
        <List.Item
          title={t("chargeLevel")}
          accessories={[
            { text: `${batteryInfo.stateOfCharge}%` },
            { text: getStatusText(batteryInfo) },
            { text: getPowerSourceText(batteryInfo) },
            {
              text: getTimeRemainingText(
                batteryInfo.timeRemaining,
                batteryInfo.isCharging,
                batteryInfo.fullyCharged,
              ),
            },
          ].filter((acc) => acc.text !== "")}
          actions={<RefreshAction />}
        />
        <List.Item
          title={t("batteryTemperature")}
          accessories={[{ text: getTemperatureText(batteryInfo.temperature) }]}
          actions={<RefreshAction />}
        />
        <List.Item
          title={t("chargeDischargeCurrent")}
          accessories={[
            {
              text: getAmperageText(
                batteryInfo.amperage,
                batteryInfo.isCharging,
              ),
            },
          ]}
          actions={<RefreshAction />}
        />
      </List.Section>
      <List.Section>
        <List.Item
          title={t("healthStatus")}
          accessories={[
            { text: getConditionText(batteryInfo.condition) },
            {
              text: `${t("maxCapacity")}: ${batteryInfo.maxCapacity !== null ? `${batteryInfo.maxCapacity}%` : t("unknown")}`,
            },
            {
              text: `${t("cycleCount")}: ${batteryInfo.cycleCount}${t("cycles")}`,
            },
          ]}
          actions={<RefreshAction />}
        />
      </List.Section>
      <List.Section title={t("power")}>
        {batteryInfo.acConnected ? (
          <List.Item
            title={t("acAdapter")}
            accessories={[
              { text: t("connected") },
              {
                text: batteryInfo.acCharging ? t("charging") : t("notCharging"),
              },
              {
                text: batteryInfo.acWattage ? `${batteryInfo.acWattage}W` : "",
              },
            ].filter((acc) => acc.text !== "")}
            actions={<RefreshAction />}
          />
        ) : (
          <List.Item
            title={t("acAdapter")}
            accessories={[{ text: t("notConnected") }]}
            actions={<RefreshAction />}
          />
        )}
        <List.Item title=" " actions={<RefreshAction />} />
        <List.Item
          title=" "
          accessories={[
            { text: `${t("lastUpdated")}： ${getFormattedTime(lastUpdated)}` },
          ]}
          actions={<RefreshAction />}
        />
      </List.Section>
    </List>
  );
}
