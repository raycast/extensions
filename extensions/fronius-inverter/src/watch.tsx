// src/watch.tsx
import { MenuBarExtra, getPreferenceValues, showToast, Toast, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchInverterInfo, fetchPowerFlowRealtimeData } from "./api";
// import { InverterInfoResponse, PowerFlowRealtimeDataResponse } from "./types";
import t from "./i18n";

interface Preferences {
  baseUrl: string;
}

interface InverterItemMinimal {
  id: string;
  ErrorCode: number;
  CustomName: string;
  InverterState: string;
  PVPower: number;
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

export default function Watch() {
  const { baseUrl } = getPreferenceValues<Preferences>();
  const [errorCount, setErrorCount] = useState<number>(0);
  const [inverterItems, setInverterItems] = useState<InverterItemMinimal[]>([]);
  const [systemOverview, setSystemOverview] = useState<SystemOverview | null>(null);
  const [ohmpilotEnergy, setOhmpilotEnergy] = useState<number | null>(null);

  async function loadDashboardData() {
    try {
      const [invResponse, powerResponse] = await Promise.all([
        fetchInverterInfo(baseUrl),
        fetchPowerFlowRealtimeData(baseUrl),
      ]);

      // Process inverter info minimally
      const invData = invResponse.Body.Data;
      const inverters: InverterItemMinimal[] = Object.entries(invData).map(([id, info]) => ({
        id,
        ErrorCode: info.ErrorCode,
        CustomName: info.CustomName,
        InverterState: info.InverterState,
        PVPower: info.PVPower,
      }));
      setInverterItems(inverters);
      const errors = inverters.filter((info) => info.ErrorCode !== 0 && info.ErrorCode !== -1).length;
      setErrorCount(errors);

      // Process system overview data
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
        BatterySOC: site.StateOfCharge_Relative ?? null,
      };
      setSystemOverview(overview);

      // Process Ohmpilot data if available
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
      await showToast(Toast.Style.Failure, t("errorLoadingData"), errMsg);
      setErrorCount(0);
    }
  }

  // Poll every 30 seconds.
  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [baseUrl]);

  // When the user clicks "Show Dashboard", open the dashboard command.
  function openDashboard() {
    // Replace "YourName" with your actual publisher/extension identifier.
    open("raycast://extensions/Olli0103/fronius-inverter/dashboard");
  }

  // Build a minimal list for the menu bar.
  const inverterListItems = inverterItems.map((inv) => ({
    title: inv.CustomName || `Inverter ${inv.id}`,
    subtitle: `${t("stateColon")} ${inv.InverterState} • ${inv.PVPower} W`,
    accessory: inv.ErrorCode !== 0 && inv.ErrorCode !== -1 ? `⚠️ ${inv.ErrorCode}` : "OK",
  }));

  // Formatting helpers for system overview.
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
    return `${num.toFixed(decimals)}%`;
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
        ...(ohmpilotEnergy !== null
          ? [{ label: t("ohmpilotEnergy"), value: convertWhToKwh(ohmpilotEnergy), emoji: "📡" }]
          : []),
      ].filter((item): item is { label: string; value: string; emoji: string } => item !== null)
    : [];

  return (
    <MenuBarExtra
      title={errorCount > 0 ? `⚠️ ${errorCount}` : "✔️"}
      tooltip={errorCount > 0 ? t("watchErrorDetected") : t("watchNoErrors")}
    >
      <MenuBarExtra.Section title={t("inverterInfoSection")}>
        {inverterListItems.map((item, idx) => (
          <MenuBarExtra.Item key={idx} title={item.title} subtitle={item.subtitle} />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title={t("systemOverviewSection")}>
        {systemItems.map((item, idx) => (
          <MenuBarExtra.Item key={idx} title={`${item.emoji} ${item.label}`} subtitle={item.value} />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Item title={t("showDashboard")} onAction={openDashboard} />
      <MenuBarExtra.Item title={t("refreshWatch")} onAction={loadDashboardData} />
    </MenuBarExtra>
  );
}
