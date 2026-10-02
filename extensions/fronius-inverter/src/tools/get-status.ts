import { getPreferenceValues } from "@raycast/api";
import { hasInverterError, inverterDisplayName } from "../model";
import { fetchFroniusSnapshot } from "../service";

export default async function getStatus() {
  const { baseUrl } = getPreferenceValues<Preferences>();
  const snapshot = await fetchFroniusSnapshot(baseUrl);

  return {
    timestamp: snapshot.timestamp,
    api: snapshot.apiVersion
      ? {
          version: snapshot.apiVersion.APIVersion,
          compatibilityRange: snapshot.apiVersion.CompatibilityRange,
          powerFlowVersion: snapshot.powerFlowVersion,
        }
      : null,
    capabilities: {
      smartMeters: snapshot.meters.length,
      batteries: snapshot.storages.length,
      ohmpilots: snapshot.ohmpilots.length,
    },
    errorCount: snapshot.errorCount,
    inverters: snapshot.inverters.map((inverter) => {
      const { id, info } = inverter;
      return {
        id,
        name: inverterDisplayName(inverter),
        state: info.InverterState,
        connectedPvPowerWatts: info.PVPower,
        errorCode: info.ErrorCode,
        hasError: hasInverterError(info),
      };
    }),
    site: {
      pvPowerWatts: snapshot.site.P_PV,
      loadPowerWatts: snapshot.site.P_Load,
      gridPowerWatts: snapshot.site.P_Grid,
      batteryPowerWatts: snapshot.site.P_Akku,
      batteryChargePercent: snapshot.site.StateOfCharge_Relative ?? null,
      autonomyPercent: snapshot.site.rel_Autonomy,
      selfConsumptionPercent: snapshot.site.rel_SelfConsumption,
      energyTodayWattHours: snapshot.site.E_Day ?? null,
      energyYearWattHours: snapshot.site.E_Year ?? null,
      totalEnergyWattHours: snapshot.site.E_Total,
    },
    meters: snapshot.meters,
    batteries: snapshot.storages,
    ohmpilots: snapshot.ohmpilots,
    totalOhmpilotEnergyWattHours: snapshot.ohmpilotEnergy,
    partialDataWarnings: snapshot.warnings,
  };
}
