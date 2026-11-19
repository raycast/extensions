import type { EcoFlowApiDevice } from "../api/types";
import { findNumber, readBoolean, readNumber } from "../api/quotas";
import type { DeviceFamily, DeviceSnapshot, PowerFlowState, QuotaMap, SupplyPriority } from "../types/device";
import { detectDeviceProfile } from "./profiles";

type SnapshotDraft = { [Key in keyof DeviceSnapshot]?: DeviceSnapshot[Key] | undefined };

const BATTERY_ALIASES = [
  "bmsMaster.soc",
  "bms_bmsStatus.soc",
  "bms_emsStatus.lcdShowSoc",
  "bms_emsStatus.f32LcdShowSoc",
  "pd.soc",
  "pd.bpPowerSoc",
  "20_1.batSoc",
  "batSoc",
  "bpSoc",
  "cmsBattSoc",
  "cms_batt_soc",
  "backupIncreInfo.backupBatPer",
  "powerPbLevel",
  "totalSoc",
  "backupBatPer",
] as const;

const INPUT_WATT_ALIASES = [
  "pd.wattsInSum",
  "wattsInSum",
  "bmsMaster.inputWatts",
  "inputWatts",
  "wattInfo.gridWatt",
  "powInSumW",
  "pow_in_sum_w",
  "totalInWatts",
] as const;

const OUTPUT_WATT_ALIASES = [
  "pd.wattsOutSum",
  "wattsOutSum",
  "bmsMaster.outputWatts",
  "outputWatts",
  "20_1.invOutputWatts",
  "invOutputWatts",
  "wattInfo.allHallWatt",
  "sysLoadPwr",
  "powOutSumW",
  "pow_out_sum_w",
  "totalOutWatts",
  "2_1.watts",
] as const;

const SOLAR_WATT_ALIASES = [
  "mppt.inWatts",
  "pd.mpptInWatts",
  "solarInputWatts",
  "pvInWatts",
  "powGetPv",
  "pow_get_pv",
  "mpptPwr",
  "powGetPvSum",
  "pd.mpptPwr",
  "pd.pvPower",
] as const;

const SIGNED_REMAINING_FAMILIES: readonly DeviceFamily[] = ["delta-pro", "delta-2", "delta-2-max"];

export function buildDeviceSnapshot(
  device: EcoFlowApiDevice,
  quotas: QuotaMap = {},
  quotaError?: string,
): DeviceSnapshot {
  const profile = detectDeviceProfile(device);

  const batteryLevel = normalizeBattery(
    readNumber(
      quotas,
      profile.family === "glacier" ? ["pd.powerPbLevel", "pd.batPct", ...BATTERY_ALIASES] : BATTERY_ALIASES,
    ) ?? findNumber(quotas, [/(^|\.)(soc|batsoc|batterypercentage)$/i, /(battery|backup).*percent/i]),
  );

  const pv1 =
    readNumber(quotas, [
      "20_1.pv1InputWatts",
      "pv1InputWatts",
      "pv1InWatts",
      "powGetPv",
      "pow_get_pv",
      "inHvMpptPwr",
      "powGetPvH",
    ]) ?? (profile.family === "powerstream" ? powerStreamPvWatts(quotas, 1) : undefined);
  const pv2 =
    readNumber(quotas, [
      "20_1.pv2InputWatts",
      "pv2InputWatts",
      "pv2InWatts",
      "powGetPv2",
      "pow_get_pv2",
      "inLvMpptPwr",
      "powGetPvL",
    ]) ?? (profile.family === "powerstream" ? powerStreamPvWatts(quotas, 2) : undefined);
  const solarWatts =
    sumKnown(pv1, pv2) ??
    readNumber(quotas, SOLAR_WATT_ALIASES) ??
    findNumber(quotas, [/(^|\.)(solar|pv).*watts?$/i, /mppt.*in.*watts?$/i]);

  const gridWatts = readNumber(quotas, [
    "sysGridPwr",
    "wattInfo.gridWatt",
    "gridWatt",
    "gridPower",
    "gridConnectionPower",
    "powGetSysGrid",
  ]);
  const loadWatts = readNumber(quotas, [
    "sysLoadPwr",
    "wattInfo.allHallWatt",
    "loadWatt",
    "loadPower",
    "powGetSysLoad",
  ]);
  const batteryWatts = readNumber(quotas, [
    "bpPwr",
    "powGetBpCms",
    "batteryPower",
    "batteryWatts",
    "pd.batPwrOut",
    "power.batPwrOut",
  ]);
  const inputWatts =
    readNumber(quotas, INPUT_WATT_ALIASES) ??
    (profile.family === "wave" ? readNumber(quotas, ["pd.acPwrIn", "power.acPwrIn"]) : undefined) ??
    (profile.category === "home-battery" ? gridWatts : undefined) ??
    findNumber(quotas, [/(^|\.)(wattsinsum|inputwatts|inwatts)$/i]);
  const rawOutputWatts =
    readNumber(quotas, OUTPUT_WATT_ALIASES) ??
    (profile.category === "home-battery" ? loadWatts : undefined) ??
    findNumber(quotas, [/(^|\.)(wattsoutsum|outputwatts|outwatts)$/i]);
  const outputWatts =
    profile.family === "smart-plug" && rawOutputWatts !== undefined ? rawOutputWatts / 10 : rawOutputWatts;

  const reportedPowerFlow = readNumber(quotas, ["cmsChgDsgState", "cms_chg_dsg_state", "totalChgDsgState"]);
  const wavePowerFlow = profile.family === "wave" ? readNumber(quotas, ["bms.bmsChgDsgSts"]) : undefined;
  const signedRemainingMinutes = SIGNED_REMAINING_FAMILIES.includes(profile.family)
    ? readNumber(quotas, ["pd.remainTime"])
    : undefined;
  const inferredPowerFlow = inferPowerFlow(profile, batteryWatts, inputWatts, outputWatts, batteryLevel);
  const powerFlow =
    wavePowerFlow === 1
      ? "charging"
      : wavePowerFlow === 2
        ? "discharging"
        : wavePowerFlow === 0
          ? "idle"
          : reportedPowerFlow === 2
            ? "charging"
            : reportedPowerFlow === 1
              ? "discharging"
              : inferredPowerFlow !== "unknown"
                ? inferredPowerFlow
                : signedRemainingMinutes !== undefined && signedRemainingMinutes > 0
                  ? "charging"
                  : signedRemainingMinutes !== undefined && signedRemainingMinutes < 0
                    ? "discharging"
                    : "unknown";
  const chargeRemainingMinutes =
    readNumber(quotas, [
      "bms_emsStatus.chgRemainTime",
      "chgRemainTime",
      "cmsChgRemTime",
      "cms_chg_rem_time",
      "pd.batChgRemain",
      "bms.bmsChgTime",
    ]) ?? (signedRemainingMinutes !== undefined && signedRemainingMinutes > 0 ? signedRemainingMinutes : undefined);
  const dischargeRemainingMinutes =
    readNumber(quotas, [
      "bms_emsStatus.dsgRemainTime",
      "dsgRemainTime",
      "cmsDsgRemTime",
      "cms_dsg_rem_time",
      "totalRemainTime",
      "backupChaTime",
      "pd.batDsgRemain",
      "bms.bmsDsgTime",
      "bms.bmsDisplayTime",
    ]) ??
    (profile.family === "smart-home-panel-2"
      ? scale(readNumber(quotas, ["backupInfo.backupDischargeTime"]), 60)
      : signedRemainingMinutes !== undefined && signedRemainingMinutes < 0
        ? Math.abs(signedRemainingMinutes)
        : undefined);
  const genericRemainingMinutes = readNumber(quotas, [
    "bmsMaster.remainTime",
    "bms_bmsStatus.remainTime",
    "hs_yj751_pd_appshow_addr.remainTime",
  ]);
  const remainingMinutes = normalizeRemainingMinutes(
    powerFlow === "charging"
      ? (chargeRemainingMinutes ?? genericRemainingMinutes ?? dischargeRemainingMinutes)
      : (dischargeRemainingMinutes ?? genericRemainingMinutes ?? chargeRemainingMinutes),
  );
  const temperatureCelsius = readTemperatureCelsius(profile.family, quotas);
  const targetTemperatureCelsius =
    profile.family === "wave"
      ? normalizeTemperature(readNumber(quotas, ["pd.setTemp", "pd.setTempCel", "setTemp"]), false)
      : undefined;
  const dpuShowFlag =
    profile.family === "delta-pro-ultra"
      ? readNumber(quotas, ["hs_yj751_pd_appshow_addr.showFlag", "showFlag"])
      : undefined;
  const acOutputEnabled =
    readBoolean(quotas, ["inv.cfgAcEnabled", "mppt.cfgAcEnabled", "pd.acAutoOutConfig"]) ??
    readFlowOutputState(quotas, ["flowInfoAcOut", "flowInfoAcHvOut", "flowInfoAcLvOut"]) ??
    readAnyBoolean(quotas, ["relay2Onoff", "relay3Onoff"]) ??
    readBit(dpuShowFlag, 2);
  const dcOutputEnabled =
    readBoolean(quotas, ["mppt.carState", "pd.carState", "pd.dcOutState"]) ??
    readFlowOutputState(quotas, ["flowInfo12v"]) ??
    (profile.family === "power-kits" ? readBoolean(quotas, ["dcOutSta"]) : undefined) ??
    readBit(dpuShowFlag, 5);
  const wavePowerMode = profile.family === "wave" ? readNumber(quotas, ["pd.powerMode"]) : undefined;
  const switchEnabled =
    readBoolean(quotas, ["2_1.switchSta", "switchSta", "plugSwitch"]) ??
    (wavePowerMode === undefined ? undefined : wavePowerMode === 1);
  const voltageVolts = readVoltageVolts(profile.family, quotas);
  const currentAmps = readCurrentAmps(profile.family, quotas);
  const frequencyHertz = readFrequencyHertz(profile.family, quotas);
  const chargeLimitPercent = readChargeLimitPercent(profile.family, quotas);
  const dischargeLimitPercent = readDischargeLimitPercent(profile.family, quotas);
  const solarInput1Watts = profile.family === "powerstream" ? pv1 : undefined;
  const solarInput2Watts = profile.family === "powerstream" ? pv2 : undefined;
  const customLoadWatts =
    profile.family === "powerstream"
      ? scale(readNumber(quotas, ["20_1.permanentWatts", "permanentWatts"]), 10)
      : undefined;
  const supplyPriority =
    profile.family === "powerstream"
      ? readSupplyPriority(readNumber(quotas, ["20_1.supplyPriority", "supplyPriority"]))
      : undefined;
  const indicatorBrightnessPercent = readIndicatorBrightnessPercent(profile.family, quotas);
  const waveState = readWaveState(profile.family, quotas);
  const glacierState = readGlacierState(profile.family, quotas);

  const snapshot: DeviceSnapshot = {
    serialNumber: device.sn,
    name: device.deviceName?.trim() || device.productName?.trim() || profile.displayName,
    online: device.online === 1,
    profile,
    powerFlow,
    quotas,
  };

  if (device.productName) snapshot.productName = device.productName;
  if (batteryLevel !== undefined) snapshot.batteryLevel = batteryLevel;
  if (inputWatts !== undefined) snapshot.inputWatts = inputWatts;
  if (outputWatts !== undefined) snapshot.outputWatts = outputWatts;
  if (solarWatts !== undefined) snapshot.solarWatts = solarWatts;
  if (gridWatts !== undefined) snapshot.gridWatts = gridWatts;
  if (loadWatts !== undefined) snapshot.loadWatts = loadWatts;
  if (batteryWatts !== undefined) snapshot.batteryWatts = batteryWatts;
  if (solarInput1Watts !== undefined) snapshot.solarInput1Watts = solarInput1Watts;
  if (solarInput2Watts !== undefined) snapshot.solarInput2Watts = solarInput2Watts;
  if (voltageVolts !== undefined) snapshot.voltageVolts = voltageVolts;
  if (currentAmps !== undefined) snapshot.currentAmps = currentAmps;
  if (frequencyHertz !== undefined) snapshot.frequencyHertz = frequencyHertz;
  if (remainingMinutes !== undefined) snapshot.remainingMinutes = remainingMinutes;
  if (temperatureCelsius !== undefined) snapshot.temperatureCelsius = temperatureCelsius;
  if (targetTemperatureCelsius !== undefined) snapshot.targetTemperatureCelsius = targetTemperatureCelsius;
  if (chargeLimitPercent !== undefined) snapshot.chargeLimitPercent = chargeLimitPercent;
  if (dischargeLimitPercent !== undefined) snapshot.dischargeLimitPercent = dischargeLimitPercent;
  if (customLoadWatts !== undefined) snapshot.customLoadWatts = customLoadWatts;
  if (supplyPriority !== undefined) snapshot.supplyPriority = supplyPriority;
  if (indicatorBrightnessPercent !== undefined) snapshot.indicatorBrightnessPercent = indicatorBrightnessPercent;
  Object.assign(snapshot, waveState, glacierState);
  if (acOutputEnabled !== undefined) snapshot.acOutputEnabled = acOutputEnabled;
  if (dcOutputEnabled !== undefined) snapshot.dcOutputEnabled = dcOutputEnabled;
  if (switchEnabled !== undefined) snapshot.switchEnabled = switchEnabled;
  if (quotaError) snapshot.quotaError = quotaError;

  return snapshot;
}

function readFlowOutputState(quotas: QuotaMap, aliases: readonly string[]): boolean | undefined {
  const value = readNumber(quotas, aliases);
  return value === undefined ? undefined : value !== 4;
}

function readAnyBoolean(quotas: QuotaMap, aliases: readonly string[]): boolean | undefined {
  const values = aliases.map((alias) => readBoolean(quotas, [alias])).filter((value) => value !== undefined);
  return values.length ? values.some(Boolean) : undefined;
}

function readBit(value: number | undefined, zeroBasedBit: number): boolean | undefined {
  if (value === undefined || !Number.isInteger(value) || value < 0) return undefined;
  return (value & (2 ** zeroBasedBit)) !== 0;
}

function inferPowerFlow(
  profile: DeviceSnapshot["profile"],
  batteryWatts: number | undefined,
  inputWatts: number | undefined,
  outputWatts: number | undefined,
  batteryLevel: number | undefined,
): PowerFlowState {
  if (profile.family === "smart-plug" || profile.family === "unknown") return "unknown";
  if (profile.family === "wave") {
    return batteryWatts !== undefined && batteryWatts > 1 ? "discharging" : "unknown";
  }
  if (profile.category === "home-battery" && batteryWatts !== undefined && Math.abs(batteryWatts) > 1) {
    return batteryWatts > 0 ? "charging" : "discharging";
  }
  return getPowerFlow(inputWatts, outputWatts, batteryLevel);
}

function powerStreamPvWatts(quotas: QuotaMap, input: 1 | 2): number | undefined {
  const voltage = readNumber(quotas, [`20_1.pv${input}InputVolt`, `pv${input}InputVolt`]);
  const current = readNumber(quotas, [`20_1.pv${input}InputCur`, `pv${input}InputCur`]);
  if (voltage === undefined || current === undefined) return undefined;
  return (voltage * current) / 100;
}

function readVoltageVolts(family: DeviceSnapshot["profile"]["family"], quotas: QuotaMap): number | undefined {
  if (family === "smart-plug") return readNumber(quotas, ["2_1.volt"]);
  if (family === "powerstream") return scale(readNumber(quotas, ["20_1.batInputVolt", "batInputVolt"]), 10);
  if (family === "wave") return scale(readNumber(quotas, ["pd.batVolt"]), 100);
  if (family === "power-kits") return scale(readNumber(quotas, ["ldOutVol"]), 1000);
  if (family === "smart-home-panel" || family === "smart-home-panel-2") {
    return readNumber(quotas, ["gridInfo.gridVol"]);
  }
  return undefined;
}

function readCurrentAmps(family: DeviceSnapshot["profile"]["family"], quotas: QuotaMap): number | undefined {
  if (family === "smart-plug") return scale(readNumber(quotas, ["2_1.current"]), 1000);
  if (family === "powerstream") return scale(readNumber(quotas, ["20_1.batInputCur", "batInputCur"]), 10);
  if (family === "wave") return scale(readNumber(quotas, ["pd.batCurr"]), 1000);
  if (family === "power-kits") return scale(readNumber(quotas, ["ldOutCurr"]), 1000);
  return undefined;
}

function readFrequencyHertz(family: DeviceSnapshot["profile"]["family"], quotas: QuotaMap): number | undefined {
  if (family === "smart-plug") return readNumber(quotas, ["2_1.freq"]);
  if (family === "powerstream") return scale(readNumber(quotas, ["20_1.invFreq", "invFreq"]), 10);
  if (family === "wave") return readNumber(quotas, ["pd.acFreq", "power.acFreq"]);
  if (family === "smart-home-panel" || family === "smart-home-panel-2") {
    return readNumber(quotas, ["gridInfo.gridFreq"]);
  }
  return undefined;
}

function readTemperatureCelsius(family: DeviceFamily, quotas: QuotaMap): number | undefined {
  if (family === "glacier") {
    const partitionInstalled = readBoolean(quotas, ["pd.flagTwoZone", "flagTwoZone"]);
    return partitionInstalled === true ? undefined : scale(readNumber(quotas, ["pd.tmpAver", "tmpAver"]), 10);
  }
  if (family === "wave") return normalizeTemperature(readNumber(quotas, ["pd.envTemp", "envTemp"]), false);
  if (family === "powerstream") {
    return scale(readNumber(quotas, ["20_1.batTemp", "batTemp"]), 10);
  }
  if (family === "smart-plug") return normalizeTemperature(readNumber(quotas, ["2_1.temp"]), false);
  return normalizeTemperature(readNumber(quotas, ["bmsMaster.temp", "bms_bmsStatus.temp"]));
}

function readChargeLimitPercent(family: DeviceFamily, quotas: QuotaMap): number | undefined {
  const familyAliases: Partial<Record<DeviceFamily, readonly string[]>> = {
    powerstream: ["20_1.upperLimit", "upperLimit"],
    "power-kits": ["bmsTotal.chgSetSoc", "bmsTotal.maxChgSoc"],
    "delta-pro-3": ["cfgMaxChgSoc"],
    "delta-pro-ultra": ["hs_yj751_pd_appshow_addr.maxChgSoc", "maxChgSoc"],
  };
  const value = readNumber(quotas, [...(familyAliases[family] ?? []), "ems.maxChgSoc", "bms_emsStatus.maxChgSoc"]);
  return normalizePercent(value);
}

function readDischargeLimitPercent(family: DeviceFamily, quotas: QuotaMap): number | undefined {
  const familyAliases: Partial<Record<DeviceFamily, readonly string[]>> = {
    powerstream: ["20_1.lowerLimit", "lowerLimit"],
    "power-kits": ["bmsTotal.dsgSetSoc", "bmsTotal.minDsgSoc"],
    "delta-pro-3": ["cfgMinDsgSoc"],
    "delta-pro-ultra": ["hs_yj751_pd_appshow_addr.minDsgSoc", "minDsgSoc"],
  };
  const value = readNumber(quotas, [...(familyAliases[family] ?? []), "ems.minDsgSoc", "bms_emsStatus.minDsgSoc"]);
  return normalizePercent(value);
}

function readIndicatorBrightnessPercent(family: DeviceFamily, quotas: QuotaMap): number | undefined {
  const value =
    family === "powerstream"
      ? readNumber(quotas, ["20_1.invBrightness", "invBrightness"])
      : family === "smart-plug"
        ? readNumber(quotas, ["2_1.brightness", "brightness"])
        : undefined;
  if (value === undefined || value < 0 || value > 1023) return undefined;
  return Math.round((value / 1023) * 100);
}

function readSupplyPriority(value: number | undefined): SupplyPriority | undefined {
  if (value === 0) return "power-supply-first";
  if (value === 1) return "battery-charging-first";
  return undefined;
}

function readWaveState(family: DeviceFamily, quotas: QuotaMap): Partial<DeviceSnapshot> {
  if (family !== "wave") return {};

  return compactSnapshot({
    operatingMode: mapNumber(readNumber(quotas, ["pd.mainMode", "mainMode"]), {
      0: "Cool",
      1: "Heat",
      2: "Fan",
    }),
    operatingSubmode: mapNumber(readNumber(quotas, ["pd.pdSubMode", "pd.subMode", "subMode"]), {
      0: "Max",
      1: "Sleep",
      2: "Eco",
      3: "Manual",
    }),
    fanSpeed: mapNumber(readNumber(quotas, ["pd.fanValue", "fanValue"]), {
      0: "Low",
      1: "Medium",
      2: "High",
    }),
    lightStripMode: mapNumber(readNumber(quotas, ["pd.rgbState", "rgbState"]), {
      0: "Follow screen",
      1: "Always on",
      2: "Always off",
    }),
  });
}

function readGlacierState(family: DeviceFamily, quotas: QuotaMap): Partial<DeviceSnapshot> {
  if (family !== "glacier") return {};

  const twoZone = readBoolean(quotas, ["pd.flagTwoZone", "flagTwoZone"]);
  const rightTemperature = scale(readNumber(quotas, ["pd.tmpR", "tmpR"]), 10);
  const leftTemperature = scale(readNumber(quotas, ["pd.tmpL", "tmpL"]), 10);
  const averageTemperature = scale(readNumber(quotas, ["pd.tmpAver", "tmpAver"]), 10);
  const combinedTarget = readNumber(quotas, ["pd.tmpMSet", "tmpMSet"]);
  const rightTarget = readNumber(quotas, ["pd.tmpRSet", "tmpRSet"]);
  const leftTarget = readNumber(quotas, ["pd.tmpLSet", "tmpLSet"]);
  const iceMode = readNumber(quotas, ["pd.iceMkMode", "iceMkMode"]);

  return compactSnapshot({
    temperatureCelsius: twoZone === true ? undefined : averageTemperature,
    targetTemperatureCelsius: twoZone === false ? combinedTarget : undefined,
    leftTemperatureCelsius: twoZone === true ? leftTemperature : undefined,
    rightTemperatureCelsius: twoZone === true ? rightTemperature : undefined,
    leftTargetTemperatureCelsius: twoZone === true ? leftTarget : undefined,
    rightTargetTemperatureCelsius: twoZone === true ? rightTarget : undefined,
    ecoModeEnabled: readBoolean(quotas, ["pd.coolMode", "coolMode"]),
    doorOpen: readBoolean(quotas, ["pd.doorStat", "doorStat"]),
    partitionInstalled: twoZone,
    iceMakingState: mapNumber(iceMode, {
      0: "Small ice ready",
      1: "Large ice ready",
      2: "Making small ice",
      3: "Making large ice",
    }),
    iceProgressPercent: normalizePercent(readNumber(quotas, ["pd.icePercent", "icePercent"])),
  });
}

function mapNumber(value: number | undefined, labels: Record<number, string>): string | undefined {
  return value === undefined ? undefined : labels[value];
}

function compactSnapshot(values: SnapshotDraft): Partial<DeviceSnapshot> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}

function scale(value: number | undefined, divisor: number): number | undefined {
  return value === undefined ? undefined : value / divisor;
}

export function getPowerFlow(
  inputWatts: number | undefined,
  outputWatts: number | undefined,
  batteryLevel: number | undefined,
): PowerFlowState {
  if (batteryLevel !== undefined && batteryLevel >= 100 && (inputWatts ?? 0) <= (outputWatts ?? 0)) return "full";
  if ((inputWatts ?? 0) > (outputWatts ?? 0) + 1) return "charging";
  if ((outputWatts ?? 0) > (inputWatts ?? 0) + 1) return "discharging";
  if (inputWatts !== undefined || outputWatts !== undefined) return "idle";
  return "unknown";
}

function sumKnown(left: number | undefined, right: number | undefined): number | undefined {
  if (left === undefined && right === undefined) return undefined;
  return (left ?? 0) + (right ?? 0);
}

function normalizeBattery(value: number | undefined): number | undefined {
  if (value === undefined || value < 0 || value > 100) return undefined;
  return Math.round(value);
}

function normalizeRemainingMinutes(value: number | undefined): number | undefined {
  if (value === undefined || value < 0) return undefined;
  return Math.round(value);
}

function normalizeTemperature(value: number | undefined, allowTenths = true): number | undefined {
  if (value === undefined) return undefined;
  if (value >= -50 && value <= 150) return value;
  if (!allowTenths) return undefined;
  const scaled = value / 10;
  return scaled >= -50 && scaled <= 150 ? scaled : undefined;
}

function normalizePercent(value: number | undefined): number | undefined {
  if (value === undefined || value < 0 || value > 100) return undefined;
  return Math.round(value);
}
