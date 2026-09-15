import type { JsonObject } from "../api/types";
import { readNumber } from "../api/quotas";
import type {
  DeviceCommandDefinition,
  DeviceCommandOption,
  DeviceFamily,
  DeviceSnapshot,
  QuotaMap,
} from "../types/device";

const LEGACY_TCP_FAMILIES: readonly DeviceFamily[] = ["delta-pro", "delta-max", "delta-mini", "river-pro"];
const MODULE_POWER_STATION_FAMILIES: readonly DeviceFamily[] = [
  "delta-2",
  "delta-2-max",
  "river-2",
  "river-2-max",
  "river-2-pro",
];
const DELTA_3_MAX_FAMILIES: readonly DeviceFamily[] = ["delta-3-max", "delta-3-max-plus"];

export function getDeviceCommands(device: DeviceSnapshot): DeviceCommandDefinition[] {
  const { family } = device.profile;

  if (LEGACY_TCP_FAMILIES.includes(family)) return legacyTcpCommands();
  if (MODULE_POWER_STATION_FAMILIES.includes(family)) return modulePowerStationCommands();
  if (DELTA_3_MAX_FAMILIES.includes(family)) return delta3MaxCommands(family === "delta-3-max-plus");
  if (family === "delta-pro-ultra") return deltaProUltraCommands(device.serialNumber);
  if (family === "delta-pro-3") return deltaPro3Commands();
  if (family === "smart-plug") return smartPlugCommands();
  if (family === "powerstream") return powerStreamCommands();
  if (family === "stream") return streamCommands(device.serialNumber);
  if (family === "smart-home-panel") return smartHomePanelCommands();
  if (family === "power-kits") return powerKitCommands();
  if (family === "wave") return waveCommands();
  if (family === "glacier") return glacierCommands();
  return [];
}

function deltaProUltraCommands(serialNumber: string): DeviceCommandDefinition[] {
  if (!serialNumber.toUpperCase().startsWith("Y711")) return [];

  return [
    ...togglePair("ac", "AC Output", (enabled, quotas = {}) => {
      const xboost = readNumber(quotas, ["hs_yj751_pd_app_set_info_addr.acXboost", "acXboost"]);
      const outFreq = readNumber(quotas, ["hs_yj751_pd_app_set_info_addr.acOutFreq", "acOutFreq"]);
      if (xboost === undefined || outFreq === undefined) {
        throw new Error("AC output cannot be changed until its current X-Boost and frequency settings are available.");
      }

      return {
        cmdCode: "YJ751_PD_AC_DSG_SET",
        params: { enable: enabled ? 1 : 0, xboost, outFreq },
      };
    }),
    ...togglePair("dc", "DC Output", (enabled) => ({
      cmdCode: "YJ751_PD_DC_SWITCH_SET",
      params: { enable: enabled ? 1 : 0 },
    })),
    numberCommand(
      "set_charge_limit",
      "Set Charge Limit",
      "Maximum battery state of charge.",
      50,
      100,
      "%",
      (value) => ({
        cmdCode: "YJ751_PD_CHG_SOC_MAX_SET",
        params: { maxChgSoc: value },
      }),
    ),
    numberCommand(
      "set_discharge_limit",
      "Set Discharge Limit",
      "Minimum battery state of charge.",
      0,
      30,
      "%",
      (value) => ({
        cmdCode: "YJ751_PD_DSG_SOC_MIN_SET",
        params: { minDsgSoc: value },
      }),
    ),
  ];
}

function streamCommands(serialNumber: string): DeviceCommandDefinition[] {
  const prefix = serialNumber.slice(0, 4).toUpperCase();
  if (prefix === "BK11") {
    return [
      ...togglePair("ac1", "AC 1 Output", (enabled) => newProtocolPayload({ cfgRelay2Onoff: enabled })),
      ...togglePair("ac2", "AC 2 Output", (enabled) => newProtocolPayload({ cfgRelay3Onoff: enabled })),
    ];
  }
  if (prefix === "BK41") {
    return togglePair("ac", "AC Output", (enabled) => newProtocolPayload({ cfgRelay2Onoff: enabled }));
  }
  return [];
}

export function findDeviceCommand(device: DeviceSnapshot, commandId: string): DeviceCommandDefinition | undefined {
  return getDeviceCommands(device).find((command) => command.id === commandId);
}

export function validateCommandValue(command: DeviceCommandDefinition, value: number | undefined): void {
  if (command.kind === "toggle") return;
  if (value === undefined || !Number.isFinite(value)) {
    throw new Error(`${command.title} requires a numeric value.`);
  }
  if (command.min !== undefined && value < command.min) {
    throw new Error(`${command.title} must be at least ${command.min}.`);
  }
  if (command.max !== undefined && value > command.max) {
    throw new Error(`${command.title} must be at most ${command.max}.`);
  }
  if (command.step !== undefined) {
    const offset = value - (command.min ?? 0);
    const steps = offset / command.step;
    if (Math.abs(steps - Math.round(steps)) > Number.EPSILON * 10) {
      throw new Error(`${command.title} must use increments of ${command.step}.`);
    }
  }
  if (command.options && !command.options.some((option) => option.value === value)) {
    throw new Error(`${command.title} received an unsupported value.`);
  }
}

export function formatCommandValue(command: DeviceCommandDefinition, value: number | undefined): string | undefined {
  if (value === undefined) return undefined;
  const option = command.options?.find((candidate) => candidate.value === value);
  return option?.title ?? `${value}${command.valueLabel?.match(/\((.+)\)/)?.[1] ?? ""}`;
}

export function isDisruptiveCommand(command: DeviceCommandDefinition, value: number | undefined): boolean {
  return (
    command.id.endsWith("_off") || command.id.startsWith("stop_") || (command.id === "set_power_state" && value === 3)
  );
}

function legacyTcpCommands(): DeviceCommandDefinition[] {
  return [
    ...togglePair("ac", "AC Output", (enabled) => tcpPayload(66, { enabled: enabled ? 1 : 0 })),
    ...togglePair("dc", "DC Output", (enabled) => tcpPayload(81, { enabled: enabled ? 1 : 0 })),
    numberCommand("set_charge_limit", "Set Charge Limit", "Maximum battery state of charge.", 50, 100, "%", (value) =>
      tcpPayload(49, { maxChgSoc: value }),
    ),
    numberCommand(
      "set_discharge_limit",
      "Set Discharge Limit",
      "Minimum battery state of charge.",
      0,
      30,
      "%",
      (value) => tcpPayload(51, { minDsgSoc: value }),
    ),
    ...togglePair("buzzer", "Buzzer", (enabled) => tcpPayload(38, { enabled: enabled ? 1 : 0 })),
  ];
}

function modulePowerStationCommands(): DeviceCommandDefinition[] {
  return [
    ...togglePair("ac", "AC Output", (enabled) => ({
      operateType: "acOutCfg",
      moduleType: 5,
      params: { enabled: enabled ? 1 : 0, out_voltage: -1, out_freq: 255, xboost: 255 },
    })),
    ...togglePair("dc", "12V Output", (enabled) => ({
      operateType: "mpptCar",
      moduleType: 5,
      params: { enabled: enabled ? 1 : 0 },
    })),
    numberCommand(
      "set_charge_limit",
      "Set Charge Limit",
      "Maximum battery state of charge.",
      50,
      100,
      "%",
      (value) => ({
        operateType: "upsConfig",
        moduleType: 2,
        params: { maxChgSoc: value },
      }),
    ),
    numberCommand(
      "set_discharge_limit",
      "Set Discharge Limit",
      "Minimum battery state of charge.",
      0,
      30,
      "%",
      (value) => ({
        operateType: "dsgCfg",
        moduleType: 2,
        params: { minDsgSoc: value },
      }),
    ),
  ];
}

function delta3MaxCommands(hasSecondAcOutput: boolean): DeviceCommandDefinition[] {
  return [
    ...togglePair("ac", "AC Output", (enabled) => newProtocolPayload({ cfgAcOutOpen: enabled })),
    ...(hasSecondAcOutput
      ? togglePair("ac2", "AC 2 Output", (enabled) => newProtocolPayload({ cfgAc2OutOpen: enabled }))
      : []),
    ...togglePair("dc", "12V Output", (enabled) => newProtocolPayload({ cfgDc12vOutOpen: enabled })),
    numberCommand("set_charge_limit", "Set Charge Limit", "Maximum battery state of charge.", 50, 100, "%", (value) =>
      newProtocolPayload({ cfgMaxChgSoc: value }),
    ),
    numberCommand(
      "set_discharge_limit",
      "Set Discharge Limit",
      "Minimum battery state of charge.",
      0,
      30,
      "%",
      (value) => newProtocolPayload({ cfgMinDsgSoc: value }, false),
    ),
    ...togglePair("buzzer", "Buzzer", (enabled) => newProtocolPayload({ cfgBeepEn: enabled })),
  ];
}

function deltaPro3Commands(): DeviceCommandDefinition[] {
  return [
    ...togglePair("hv_ac", "High-Voltage AC Output", (enabled) => newProtocolPayload({ cfgHvAcOutOpen: enabled })),
    ...togglePair("lv_ac", "Low-Voltage AC Output", (enabled) => newProtocolPayload({ cfgLvAcOutOpen: enabled })),
    ...togglePair("dc", "12V Output", (enabled) => newProtocolPayload({ cfgDc12vOutOpen: enabled })),
    numberCommand("set_charge_limit", "Set Charge Limit", "Maximum battery state of charge.", 50, 100, "%", (value) =>
      newProtocolPayload({ cfgMaxChgSoc: value }),
    ),
    numberCommand(
      "set_discharge_limit",
      "Set Discharge Limit",
      "Minimum battery state of charge.",
      0,
      30,
      "%",
      (value) => newProtocolPayload({ cfgMinDsgSoc: value }),
    ),
    ...togglePair("buzzer", "Buzzer", (enabled) => newProtocolPayload({ cfgBeepEn: enabled })),
  ];
}

function smartPlugCommands(): DeviceCommandDefinition[] {
  return [
    ...togglePair("plug", "Smart Plug", (enabled) => ({
      cmdCode: "WN511_SOCKET_SET_PLUG_SWITCH_MESSAGE",
      params: { plugSwitch: enabled ? 1 : 0 },
    })),
    numberCommand(
      "set_brightness",
      "Set Indicator Brightness",
      "Indicator light brightness.",
      0,
      1023,
      "",
      (value) => ({
        cmdCode: "WN511_SOCKET_SET_BRIGHTNESS_PACK",
        params: { brightness: value },
      }),
    ),
  ];
}

function powerStreamCommands(): DeviceCommandDefinition[] {
  return [
    selectCommand(
      "set_supply_priority",
      "Set Supply Priority",
      "Choose whether solar power serves the load or charges storage first.",
      [
        { title: "Power Supply First", value: 0 },
        { title: "Battery Charging First", value: 1 },
      ],
      (value) => ({ cmdCode: "WN511_SET_SUPPLY_PRIORITY_PACK", params: { supplyPriority: value } }),
    ),
    numberCommand(
      "set_custom_load_power",
      "Set Custom Load Power",
      "Target home load power.",
      0,
      600,
      "W",
      (value) => ({
        cmdCode: "WN511_SET_PERMANENT_WATTS_PACK",
        params: { permanentWatts: value * 10 },
      }),
    ),
    numberCommand(
      "set_charge_limit",
      "Set Battery Charge Limit",
      "Maximum battery state of charge.",
      70,
      100,
      "%",
      (value) => ({
        cmdCode: "WN511_SET_BAT_UPPER_PACK",
        params: { upperLimit: value },
      }),
    ),
    numberCommand(
      "set_discharge_limit",
      "Set Battery Discharge Limit",
      "Minimum battery state of charge.",
      1,
      30,
      "%",
      (value) => ({
        cmdCode: "WN511_SET_BAT_LOWER_PACK",
        params: { lowerLimit: value },
      }),
    ),
  ];
}

function smartHomePanelCommands(): DeviceCommandDefinition[] {
  return [
    ...togglePair("eps", "EPS Mode", (enabled) => ({
      operateType: "TCP",
      params: { cmdSet: 11, id: 24, eps: enabled ? 1 : 0 },
    })),
    numberCommand(
      "set_charge_limit",
      "Set Backup Charge Limit",
      "Upper battery threshold used by the Smart Home Panel.",
      0,
      100,
      "%",
      (value, quotas = {}) => {
        const discLower = readNumber(quotas, ["backupChaDiscCfg.discLower", "discLower"]);
        if (discLower === undefined) {
          throw new Error("The discharge threshold must be available before changing the charge threshold.");
        }
        if (value <= discLower) {
          throw new Error(`The charge threshold must be above the current ${discLower}% discharge threshold.`);
        }
        return {
          operateType: "TCP",
          params: { cmdSet: 11, id: 29, forceChargeHigh: value, discLower },
        };
      },
    ),
    numberCommand(
      "set_discharge_limit",
      "Set Backup Discharge Limit",
      "Lower battery threshold used by the Smart Home Panel.",
      0,
      100,
      "%",
      (value, quotas = {}) => {
        const forceChargeHigh = readNumber(quotas, ["backupChaDiscCfg.forceChargeHigh", "forceChargeHigh"]);
        if (forceChargeHigh === undefined) {
          throw new Error("The charge threshold must be available before changing the discharge threshold.");
        }
        if (value >= forceChargeHigh) {
          throw new Error(`The discharge threshold must be below the current ${forceChargeHigh}% charge threshold.`);
        }
        return {
          operateType: "TCP",
          params: { cmdSet: 11, id: 29, forceChargeHigh, discLower: value },
        };
      },
    ),
  ];
}

function powerKitCommands(): DeviceCommandDefinition[] {
  return [
    numberCommand("set_charge_limit", "Set Charge Limit", "Maximum battery state of charge.", 50, 100, "%", (value) =>
      powerKitPayload("socUpperLimit", { maxChgSoc: value }),
    ),
    numberCommand(
      "set_discharge_limit",
      "Set Discharge Limit",
      "Minimum battery state of charge.",
      0,
      50,
      "%",
      (value) => powerKitPayload("socLowerLimit", { minDsgSoc: value }),
    ),
  ];
}

function waveCommands(): DeviceCommandDefinition[] {
  return [
    selectCommand(
      "set_power_state",
      "Set Power State",
      "Start, place in standby, or shut down the WAVE.",
      [
        { title: "Start", value: 1 },
        { title: "Standby", value: 2 },
        { title: "Shut Down", value: 3 },
      ],
      (value) => ({ moduleType: 1, operateType: "powerMode", params: { powerMode: value } }),
    ),
    selectCommand(
      "set_mode",
      "Set Mode",
      "Set the WAVE operating mode.",
      [
        { title: "Cool", value: 0 },
        { title: "Heat", value: 1 },
        { title: "Fan", value: 2 },
      ],
      (value) => ({ moduleType: 1, operateType: "mainMode", params: { mainMode: value } }),
    ),
    selectCommand(
      "set_submode",
      "Set Sub-Mode",
      "Set the WAVE performance profile.",
      [
        { title: "Max", value: 0 },
        { title: "Sleep", value: 1 },
        { title: "Eco", value: 2 },
        { title: "Manual", value: 3 },
      ],
      (value) => ({ operateType: "subMode", params: { subMode: value } }),
    ),
    selectCommand(
      "set_fan_speed",
      "Set Fan Speed",
      "Set the WAVE fan speed.",
      [
        { title: "Low", value: 0 },
        { title: "Medium", value: 1 },
        { title: "High", value: 2 },
      ],
      (value) => ({ operateType: "fanValue", params: { fanValue: value } }),
    ),
    numberCommand("set_temperature", "Set Temperature", "Target temperature.", 16, 30, "°C", (value) => ({
      moduleType: 1,
      operateType: "setTemp",
      params: { setTemp: value },
    })),
    selectCommand(
      "set_light_strip",
      "Set Light Strip",
      "Choose how the WAVE light strip behaves.",
      [
        { title: "Follow Screen", value: 0 },
        { title: "Always On", value: 1 },
        { title: "Always Off", value: 2 },
      ],
      (value) => ({ moduleType: 1, operateType: "rgbState", params: { rgbState: value } }),
    ),
    ...togglePair("buzzer", "Buzzer", (enabled) => ({
      operateType: "beepEn",
      params: { en: enabled ? 1 : 0 },
    })),
  ];
}

function glacierCommands(): DeviceCommandDefinition[] {
  return [
    {
      id: "set_temperature",
      title: "Set All-Zone Temperature",
      description: "Set the same temperature for each refrigerator zone.",
      kind: "number",
      valueLabel: "Temperature (°C)",
      min: -25,
      max: 10,
      step: 1,
      buildPayload: (value) => ({
        moduleType: 1,
        operateType: "temp",
        params: { tmpR: requireValue(value), tmpL: requireValue(value), tmpM: requireValue(value) },
      }),
    },
    ...togglePair("eco_mode", "Eco Mode", (enabled) => ({
      moduleType: 1,
      operateType: "ecoMode",
      params: { mode: enabled ? 1 : 0 },
    })),
    {
      id: "start_ice_small",
      title: "Start Small Ice",
      description: "Start making small ice cubes.",
      kind: "toggle",
      buildPayload: () => ({ moduleType: 1, operateType: "iceMake", params: { enable: 1, iceShape: 0 } }),
    },
    {
      id: "start_ice_large",
      title: "Start Large Ice",
      description: "Start making large ice cubes.",
      kind: "toggle",
      buildPayload: () => ({ moduleType: 1, operateType: "iceMake", params: { enable: 1, iceShape: 1 } }),
    },
    {
      id: "stop_ice",
      title: "Stop Ice Making",
      description: "Stop the ice maker.",
      kind: "toggle",
      buildPayload: () => ({ moduleType: 1, operateType: "iceMake", params: { enable: 0, iceShape: 0 } }),
    },
    ...togglePair("buzzer", "Buzzer", (enabled) => ({
      moduleType: 1,
      operateType: "beepEn",
      params: { flag: enabled ? 1 : 0 },
    })),
  ];
}

function togglePair(
  idPrefix: string,
  title: string,
  buildPayload: (enabled: boolean, quotas?: QuotaMap) => ReturnType<DeviceCommandDefinition["buildPayload"]>,
): DeviceCommandDefinition[] {
  return [
    {
      id: `${idPrefix}_on`,
      title: `Turn ${title} On`,
      description: `Turn ${title.toLowerCase()} on.`,
      kind: "toggle",
      buildPayload: (_value, quotas) => buildPayload(true, quotas),
    },
    {
      id: `${idPrefix}_off`,
      title: `Turn ${title} Off`,
      description: `Turn ${title.toLowerCase()} off.`,
      kind: "toggle",
      buildPayload: (_value, quotas) => buildPayload(false, quotas),
    },
  ];
}

function numberCommand(
  id: string,
  title: string,
  description: string,
  min: number,
  max: number,
  unit: string,
  buildPayload: (value: number, quotas?: QuotaMap) => ReturnType<DeviceCommandDefinition["buildPayload"]>,
): DeviceCommandDefinition {
  return {
    id,
    title,
    description,
    kind: "number",
    valueLabel: unit ? `Value (${unit})` : "Value",
    min,
    max,
    step: 1,
    buildPayload: (value, quotas) => buildPayload(requireValue(value), quotas),
  };
}

function selectCommand(
  id: string,
  title: string,
  description: string,
  options: readonly DeviceCommandOption[],
  buildPayload: (value: number) => ReturnType<DeviceCommandDefinition["buildPayload"]>,
): DeviceCommandDefinition {
  return {
    id,
    title,
    description,
    kind: "select",
    valueLabel: "Value",
    options,
    buildPayload: (value) => buildPayload(requireValue(value)),
  };
}

function requireValue(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) throw new Error("This control requires a numeric value.");
  return value;
}

function tcpPayload(id: number, params: JsonObject): JsonObject {
  return {
    operateType: "TCP",
    params: { cmdSet: 32, id, ...params },
  };
}

function newProtocolPayload(params: JsonObject, needAck = true): JsonObject {
  return {
    cmdId: 17,
    cmdFunc: 254,
    dest: 2,
    dirDest: 1,
    dirSrc: 1,
    needAck,
    params,
  };
}

function powerKitPayload(operateType: string, params: JsonObject): JsonObject {
  return {
    id: Date.now() % 2_147_483_647,
    version: "1.0",
    moduleSn: "0000000000000000",
    moduleType: 0,
    operateType,
    params,
  };
}
