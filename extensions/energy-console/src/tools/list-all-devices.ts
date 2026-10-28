import { getDeviceCommands } from "../devices/commands";
import { getApiSupportLevel, getDeviceCategory } from "../devices/catalog";
import { createEcoFlowService } from "../devices/runtime";
import { maskSerialNumber } from "../devices/service";

export default async function tool() {
  const devices = await createEcoFlowService().listDeviceSnapshots();

  return devices.map((device) => ({
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
    gridWatts: device.gridWatts,
    loadWatts: device.loadWatts,
    batteryWatts: device.batteryWatts,
    remainingMinutes: device.remainingMinutes,
    temperatureCelsius: device.temperatureCelsius,
    targetTemperatureCelsius: device.targetTemperatureCelsius,
    chargeLimitPercent: device.chargeLimitPercent,
    dischargeLimitPercent: device.dischargeLimitPercent,
    operatingMode: device.operatingMode,
    operatingSubmode: device.operatingSubmode,
    ecoModeEnabled: device.ecoModeEnabled,
    iceMakingState: device.iceMakingState,
    powerFlow: device.powerFlow,
    controlsAvailable: device.online && getDeviceCommands(device).length > 0,
    readingsError: device.quotaError,
  }));
}
