// src/dashboard.tsx
import { ActionPanel, Action, List, getPreferenceValues, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchInverterInfo, fetchPowerFlowRealtimeData } from "./api";
import { InverterInfo } from "./types";
import t from "./i18n";

interface Preferences {
  baseUrl: string;
}

interface InverterItem {
  id: string;
  info: InverterInfo;
}

interface SystemOverview {
  E_Total: number | null;
  P_PV: number;
  P_Load: number;
  P_Grid: number;
  P_Akku: number;
  rel_Autonomy: number;
  rel_SelfConsumption: number;
  BackupMode: number | boolean;
  BatteryStandby: number | boolean;
  BatterySOC?: number | null;
}

export default function CombinedDashboard() {
  const { baseUrl } = getPreferenceValues<Preferences>();
  const [inverterItems, setInverterItems] = useState<InverterItem[]>([]);
  const [systemOverview, setSystemOverview] = useState<SystemOverview | null>(null);
  const [ohmpilotEnergy, setOhmpilotEnergy] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadData() {
    setIsLoading(true);
    try {
      const [invResponse, powerResponse] = await Promise.all([
        fetchInverterInfo(baseUrl),
        fetchPowerFlowRealtimeData(baseUrl),
      ]);
      const invData = invResponse.Body.Data;
      const inverters: InverterItem[] = Object.entries(invData).map(([id, info]) => ({
        id,
        info,
      }));
      setInverterItems(inverters);

      const site = powerResponse.Body.Data.Site;
      const overview: SystemOverview = {
        E_Total: site.E_Total,
        P_PV: site.P_PV,
        P_Load: site.P_Load,
        P_Grid: site.P_Grid,
        P_Akku: site.P_Akku,
        rel_Autonomy: site.rel_Autonomy,
        rel_SelfConsumption: site.rel_SelfConsumption,
        BackupMode: site.BackupMode,
        BatteryStandby: site.BatteryStandby,
        // Map battery charge from StateOfCharge_Relative (if available)
        BatterySOC: site.StateOfCharge_Relative ?? null,
      };
      setSystemOverview(overview);

      const ohmpilots = powerResponse.Body.Data.Ohmpilots;
      if (ohmpilots) {
        const totalOhmpilotEnergy = Object.values(ohmpilots).reduce(
          (sum, ohmpilot) => sum + (ohmpilot.EnergyReal_WAC_Sum_Consumed || 0),
          0,
        );
        setOhmpilotEnergy(totalOhmpilotEnergy);
      } else {
        setOhmpilotEnergy(null);
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      showToast(Toast.Style.Failure, t("errorLoadingData"), errMsg);
    } finally {
      setIsLoading(false);
    }
  }

  // Auto-refresh every 60 seconds
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [baseUrl]);

  // Formatting helpers
  function convertWhToKwh(value: number | string | null | undefined): string {
    if (value == null || value === "") return "N/A";
    const num = typeof value === "number" ? value : Number(value);
    if (isNaN(num)) return "N/A";
    return `${(Math.abs(num) / 1000).toFixed(2)} kWh`;
  }

  function formatPower(value: number | string | null | undefined, decimals = 1): string {
    if (value == null || value === "") return "N/A";
    const num = typeof value === "number" ? value : Number(value);
    if (isNaN(num)) return "N/A";
    return `${Math.abs(num).toFixed(decimals)} W`;
  }

  function formatPercentage(value: number | string | null | undefined, decimals = 1): string {
    if (value == null || value === "") return "N/A";
    const num = typeof value === "number" ? value : Number(value);
    if (isNaN(num)) return "N/A";
    return `${num.toFixed(decimals)} %`;
  }

  const systemItems = systemOverview
    ? [
        { label: t("totalEnergy"), value: convertWhToKwh(systemOverview.E_Total), emoji: "🔋" },
        { label: t("pvPower"), value: formatPower(systemOverview.P_PV), emoji: "🌞" },
        { label: t("loadPower"), value: formatPower(systemOverview.P_Load), emoji: "🔌" },
        { label: t("gridPower"), value: formatPower(systemOverview.P_Grid), emoji: "⚡" },
        { label: t("batteryPower"), value: formatPower(systemOverview.P_Akku), emoji: "🔋" },
        systemOverview.BatterySOC !== null
          ? { label: t("batteryCharge"), value: formatPercentage(systemOverview.BatterySOC), emoji: "🔋" }
          : null,
        { label: t("autonomy"), value: formatPercentage(systemOverview.rel_Autonomy), emoji: "📊" },
        { label: t("selfConsumption"), value: formatPercentage(systemOverview.rel_SelfConsumption), emoji: "📈" },
        {
          label: t("backupMode"),
          value:
            typeof systemOverview.BackupMode === "boolean"
              ? systemOverview.BackupMode
                ? t("enabled")
                : t("disabled")
              : String(systemOverview.BackupMode),
          emoji: "🔧",
        },
        {
          label: t("batteryStandby"),
          value:
            typeof systemOverview.BatteryStandby === "boolean"
              ? systemOverview.BatteryStandby
                ? t("active")
                : t("inactive")
              : String(systemOverview.BatteryStandby),
          emoji: "⚙️",
        },
        ...(ohmpilotEnergy !== null
          ? [{ label: t("ohmpilotEnergy"), value: convertWhToKwh(ohmpilotEnergy), emoji: "📡" }]
          : []),
      ].filter((item): item is { label: string; value: string; emoji: string } => item !== null)
    : [];

  const inverterListItems = inverterItems.map((inv) => ({
    title: inv.info.CustomName || `Inverter ${inv.id}`,
    subtitle: `${t("stateColon")} ${inv.info.InverterState} • ${inv.info.PVPower} W`,
    accessory: inv.info.ErrorCode !== 0 && inv.info.ErrorCode !== -1 ? `⚠️ ${inv.info.ErrorCode}` : "OK",
  }));

  return (
    <List isLoading={isLoading} searchBarPlaceholder={t("searchPlaceholder")}>
      <List.Section title={t("inverterInfoSection")}>
        {inverterListItems.map((item, idx) => (
          <List.Item key={idx} title={item.title} subtitle={item.subtitle} accessories={[{ text: item.accessory }]} />
        ))}
      </List.Section>
      <List.Section title={t("systemOverviewSection")}>
        {systemItems.map((item, idx) => (
          <List.Item key={idx} title={`${item.emoji} ${item.label}`} accessories={[{ text: item.value }]} />
        ))}
      </List.Section>
      <List.Item
        title={t("refresh")}
        icon={Icon.ArrowClockwise}
        actions={
          <ActionPanel>
            <Action title={t("refresh")} icon={Icon.ArrowClockwise} onAction={loadData} />
          </ActionPanel>
        }
      />
      {!inverterItems.length && !systemOverview && !isLoading && (
        <List.EmptyView title={t("noData")} description={t("tryRefreshing")} />
      )}
    </List>
  );
}
