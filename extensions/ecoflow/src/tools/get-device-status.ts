import { listRawReadings } from "../api/quotas";
import { createEcoFlowService } from "../devices/runtime";
import { maskSerialNumber } from "../devices/service";
import { getDeviceCommands } from "../devices/commands";
import { getApiSupportLevel, getDeviceCategory } from "../devices/catalog";

type Input = {
  /** Device name or serial number. A partial name is accepted only when it matches one device. */
  deviceIdentifier: string;
};

export default async function tool(input: Input) {
  const device = await createEcoFlowService().getDeviceSnapshot(input.deviceIdentifier);

  return {
    category: getDeviceCategory(device.profile.category).label,
    categoryEmoji: getDeviceCategory(device.profile.category).emoji,
    apiSupport: getApiSupportLevel(device.profile),
    name: device.name,
    serialNumber: maskSerialNumber(device.serialNumber),
    family: device.profile.displayName,
    online: device.online,
    batteryLevel: device.batteryLevel,
    inputWatts: device.inputWatts,
    outputWatts: device.outputWatts,
    solarWatts: device.solarWatts,
    solarInput1Watts: device.solarInput1Watts,
    solarInput2Watts: device.solarInput2Watts,
    gridWatts: device.gridWatts,
    loadWatts: device.loadWatts,
    batteryWatts: device.batteryWatts,
    remainingMinutes: device.remainingMinutes,
    voltageVolts: device.voltageVolts,
    currentAmps: device.currentAmps,
    frequencyHertz: device.frequencyHertz,
    powerFlow: device.powerFlow,
    temperatureCelsius: device.temperatureCelsius,
    targetTemperatureCelsius: device.targetTemperatureCelsius,
    leftTemperatureCelsius: device.leftTemperatureCelsius,
    rightTemperatureCelsius: device.rightTemperatureCelsius,
    leftTargetTemperatureCelsius: device.leftTargetTemperatureCelsius,
    rightTargetTemperatureCelsius: device.rightTargetTemperatureCelsius,
    chargeLimitPercent: device.chargeLimitPercent,
    dischargeLimitPercent: device.dischargeLimitPercent,
    customLoadWatts: device.customLoadWatts,
    supplyPriority: device.supplyPriority,
    indicatorBrightnessPercent: device.indicatorBrightnessPercent,
    operatingMode: device.operatingMode,
    operatingSubmode: device.operatingSubmode,
    fanSpeed: device.fanSpeed,
    lightStripMode: device.lightStripMode,
    ecoModeEnabled: device.ecoModeEnabled,
    doorOpen: device.doorOpen,
    temperatureZones: device.partitionInstalled === undefined ? undefined : device.partitionInstalled ? 2 : 1,
    iceMakingState: device.iceMakingState,
    iceProgressPercent: device.iceProgressPercent,
    acOutputEnabled: device.acOutputEnabled,
    dcOutputEnabled: device.dcOutputEnabled,
    switchEnabled: device.switchEnabled,
    availableControls: getDeviceCommands(device).map((command) => ({
      id: command.id,
      title: command.title,
      valueRange: command.min !== undefined && command.max !== undefined ? `${command.min}-${command.max}` : undefined,
      options: command.options,
    })),
    usefulReadings: listRawReadings(device.quotas)
      .filter((reading) => reading.relevance > 0)
      .slice(0, 20)
      .map(({ key, value }) => ({ key, value })),
  };
}
