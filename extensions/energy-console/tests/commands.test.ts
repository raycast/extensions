import { describe, expect, it } from "vitest";
import {
  findDeviceCommand,
  formatCommandValue,
  isDisruptiveCommand,
  validateCommandValue,
} from "../src/devices/commands";
import { buildDeviceSnapshot } from "../src/devices/status";

function device(serialNumber: string) {
  return buildDeviceSnapshot({ sn: serialNumber, online: 1 });
}

describe("verified device controls", () => {
  it("keeps name-detected devices read-only until the serial prefix is verified", () => {
    const unverifiedWave = buildDeviceSnapshot({
      sn: "UNKNOWN123456",
      online: 1,
      deviceName: "Bedroom WAVE",
      productName: "WAVE 2",
    });

    expect(unverifiedWave.profile.family).toBe("wave");
    expect(findDeviceCommand(unverifiedWave, "set_temperature")).toBeUndefined();
  });

  it("uses human-readable values and flags disruptive controls", () => {
    const wave = device("KT21TEST1234");
    const powerState = findDeviceCommand(wave, "set_power_state");
    const temperature = findDeviceCommand(wave, "set_temperature");

    expect(powerState && formatCommandValue(powerState, 3)).toBe("Shut Down");
    expect(temperature && formatCommandValue(temperature, 22)).toBe("22°C");
    expect(powerState && isDisruptiveCommand(powerState, 3)).toBe(true);
    expect(powerState && isDisruptiveCommand(powerState, 1)).toBe(false);
  });

  it("rejects fractional values for whole-number controls", () => {
    const temperature = findDeviceCommand(device("KT21TEST1234"), "set_temperature");
    expect(() => temperature && validateCommandValue(temperature, 22.5)).toThrow(/increments of 1/i);
  });

  it("uses the current WAVE temperature and buzzer payloads", () => {
    const wave = device("KT21TEST1234");

    expect(findDeviceCommand(wave, "set_temperature")?.buildPayload(21)).toEqual({
      moduleType: 1,
      operateType: "setTemp",
      params: { setTemp: 21 },
    });
    expect(findDeviceCommand(wave, "buzzer_on")?.buildPayload()).toEqual({
      operateType: "beepEn",
      params: { en: 1 },
    });
    expect(findDeviceCommand(wave, "set_power_state")?.buildPayload(2)).toEqual({
      moduleType: 1,
      operateType: "powerMode",
      params: { powerMode: 2 },
    });
    expect(findDeviceCommand(wave, "set_submode")?.buildPayload(1)).toEqual({
      operateType: "subMode",
      params: { subMode: 1 },
    });
    expect(findDeviceCommand(wave, "set_fan_speed")?.buildPayload(2)).toEqual({
      operateType: "fanValue",
      params: { fanValue: 2 },
    });
    expect(findDeviceCommand(wave, "set_light_strip")?.buildPayload(0)).toEqual({
      moduleType: 1,
      operateType: "rgbState",
      params: { rgbState: 0 },
    });
  });

  it("uses GLACIER's buzzer flag instead of triggering a beep pattern", () => {
    const glacier = device("BX11TEST1234");
    expect(findDeviceCommand(glacier, "buzzer_off")?.buildPayload()).toEqual({
      moduleType: 1,
      operateType: "beepEn",
      params: { flag: 0 },
    });
  });

  it("uses current Power Kits battery-limit envelopes", () => {
    const powerKit = device("M106TEST1234");

    expect(findDeviceCommand(powerKit, "set_charge_limit")?.buildPayload(85)).toMatchObject({
      id: expect.any(Number),
      version: "1.0",
      moduleSn: "0000000000000000",
      moduleType: 0,
      operateType: "socUpperLimit",
      params: { maxChgSoc: 85 },
    });
    expect(findDeviceCommand(powerKit, "set_discharge_limit")?.buildPayload(20)).toMatchObject({
      operateType: "socLowerLimit",
      params: { minDsgSoc: 20 },
    });
  });

  it("preserves the paired Smart Home Panel threshold when changing one limit", () => {
    const panel = buildDeviceSnapshot(
      { sn: "SP10TEST1234", online: 1 },
      {
        "backupChaDiscCfg.forceChargeHigh": 90,
        "backupChaDiscCfg.discLower": 20,
      },
    );

    expect(findDeviceCommand(panel, "eps_on")?.buildPayload()).toEqual({
      operateType: "TCP",
      params: { cmdSet: 11, id: 24, eps: 1 },
    });
    expect(findDeviceCommand(panel, "set_charge_limit")?.buildPayload(95, panel.quotas)).toEqual({
      operateType: "TCP",
      params: { cmdSet: 11, id: 29, forceChargeHigh: 95, discLower: 20 },
    });
    expect(findDeviceCommand(panel, "set_discharge_limit")?.buildPayload(15, panel.quotas)).toEqual({
      operateType: "TCP",
      params: { cmdSet: 11, id: 29, forceChargeHigh: 90, discLower: 15 },
    });
  });

  it("does not overwrite a missing Smart Home Panel threshold", () => {
    const panel = device("SP10TEST1234");
    expect(() => findDeviceCommand(panel, "set_charge_limit")?.buildPayload(90, panel.quotas)).toThrow(
      /discharge threshold must be available/i,
    );
  });

  it("rejects overlapping Smart Home Panel thresholds", () => {
    const panel = buildDeviceSnapshot(
      { sn: "SP10TEST1234", online: 1 },
      {
        "backupChaDiscCfg.forceChargeHigh": 80,
        "backupChaDiscCfg.discLower": 30,
      },
    );

    expect(() => findDeviceCommand(panel, "set_charge_limit")?.buildPayload(30, panel.quotas)).toThrow(
      /above the current 30%/i,
    );
    expect(() => findDeviceCommand(panel, "set_discharge_limit")?.buildPayload(80, panel.quotas)).toThrow(
      /below the current 80%/i,
    );
  });

  it("uses the documented DELTA 3 Max Plus envelope and acknowledgement flags", () => {
    const delta = device("D3M1TEST1234");
    expect(findDeviceCommand(delta, "ac_on")?.buildPayload()).toEqual({
      cmdId: 17,
      cmdFunc: 254,
      dest: 2,
      dirDest: 1,
      dirSrc: 1,
      needAck: true,
      params: { cfgAcOutOpen: true },
    });
    expect(findDeviceCommand(delta, "set_discharge_limit")?.buildPayload(20)).toMatchObject({
      needAck: false,
      params: { cfgMinDsgSoc: 20 },
    });
  });

  it("uses the documented DELTA Pro Ultra payloads and preserves AC settings", () => {
    const ultra = buildDeviceSnapshot(
      { sn: "Y711TEST1234", online: 1 },
      {
        "hs_yj751_pd_app_set_info_addr.acXboost": 1,
        "hs_yj751_pd_app_set_info_addr.acOutFreq": 60,
      },
    );

    expect(findDeviceCommand(ultra, "ac_on")?.buildPayload(undefined, ultra.quotas)).toEqual({
      cmdCode: "YJ751_PD_AC_DSG_SET",
      params: { enable: 1, xboost: 1, outFreq: 60 },
    });
    expect(findDeviceCommand(ultra, "dc_off")?.buildPayload()).toEqual({
      cmdCode: "YJ751_PD_DC_SWITCH_SET",
      params: { enable: 0 },
    });
    expect(findDeviceCommand(ultra, "set_charge_limit")?.buildPayload(85)).toEqual({
      cmdCode: "YJ751_PD_CHG_SOC_MAX_SET",
      params: { maxChgSoc: 85 },
    });
    expect(findDeviceCommand(ultra, "set_discharge_limit")?.buildPayload(15)).toEqual({
      cmdCode: "YJ751_PD_DSG_SOC_MIN_SET",
      params: { minDsgSoc: 15 },
    });
  });

  it("does not guess DELTA Pro Ultra AC settings or legacy DCBP payloads", () => {
    expect(() => findDeviceCommand(device("Y711TEST1234"), "ac_on")?.buildPayload()).toThrow(/current X-Boost/);
    expect(findDeviceCommand(device("DCBPTEST1234"), "ac_on")).toBeUndefined();
  });

  it("uses the documented STREAM outlet payloads only for verified prefixes", () => {
    const streamUltra = device("BK11TEST1234");
    expect(findDeviceCommand(streamUltra, "ac1_on")?.buildPayload()).toMatchObject({
      needAck: true,
      params: { cfgRelay2Onoff: true },
    });
    expect(findDeviceCommand(streamUltra, "ac2_off")?.buildPayload()).toMatchObject({
      needAck: true,
      params: { cfgRelay3Onoff: false },
    });

    const streamMax = device("BK41TEST1234");
    expect(findDeviceCommand(streamMax, "ac_on")?.buildPayload()).toMatchObject({
      params: { cfgRelay2Onoff: true },
    });

    expect(findDeviceCommand(device("BK31TEST1234"), "ac_on")).toBeUndefined();
    expect(findDeviceCommand(device("BK51TEST1234"), "ac_on")).toBeUndefined();
  });
});
