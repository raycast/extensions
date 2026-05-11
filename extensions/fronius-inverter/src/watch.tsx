// src/watch.tsx
import { MenuBarExtra, getPreferenceValues, showToast, Toast, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchInverterInfo, fetchPowerFlowRealtimeData } from "./api";

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
      await showToast(Toast.Style.Failure, "Error loading data", errMsg);
    }
  }

  // Poll every 30 seconds.
  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [baseUrl]);

  function openDashboard() {
    open("raycast://extensions/Olli0103/fronius-inverter/dashboard");
  }

  // Build a minimal list for the menu bar.
  const inverterListItems = inverterItems.map((inv) => ({
    id: inv.id, // Ensure the id is included here
    title: inv.CustomName || `Inverter ${inv.id}`,
    subtitle: `State: ${inv.InverterState} • ${inv.PVPower} W`,
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
        { label: "Total Energy", value: convertWhToKwh(systemOverview.E_Total), emoji: "💯" },
        { label: "PV Power", value: formatPower(systemOverview.P_PV), emoji: "🌞" },
        { label: "Load Power", value: formatPower(systemOverview.P_Load), emoji: "🔌" },
        { label: "Grid Power", value: formatPower(systemOverview.P_Grid), emoji: "⚡" },
        { label: "Battery Power", value: formatPower(systemOverview.P_Akku), emoji: "🔋" },
        systemOverview.BatterySOC !== null
          ? { label: "Battery Charge", value: formatPercentage(systemOverview.BatterySOC), emoji: "🪫" }
          : null,
        ...(ohmpilotEnergy !== null
          ? [{ label: "Ohmpilot Energy", value: convertWhToKwh(ohmpilotEnergy), emoji: "📡" }]
          : []),
      ].filter((item): item is { label: string; value: string; emoji: string } => item !== null)
    : [];

  return (
    <MenuBarExtra
      title={errorCount > 0 ? `⚠️ ${errorCount}` : "✔️"}
      tooltip={errorCount > 0 ? "Error Detected" : "No Errors Detected"}
    >
      <MenuBarExtra.Section title={"Inverter Info"}>
        {inverterListItems.map((item) => (
          <MenuBarExtra.Item key={item.id} title={item.title} subtitle={`${item.subtitle} • ${item.accessory}`} />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title={"System Overview"}>
        {systemItems.map((item) => (
          <MenuBarExtra.Item key={item.label} title={`${item.emoji} ${item.label}`} subtitle={item.value} />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Item title={"Show Dashboard"} onAction={openDashboard} />
      <MenuBarExtra.Item title={"Refresh Watch"} onAction={loadDashboardData} />
    </MenuBarExtra>
  );
}
