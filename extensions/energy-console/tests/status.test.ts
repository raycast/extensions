import { describe, expect, it } from "vitest";
import { normalizeQuotaResponse } from "../src/api/quotas";
import { buildDeviceSnapshot } from "../src/devices/status";

describe("normalized device status", () => {
  it("reads EcoFlow's current DELTA 3 Max Plus heartbeat example", () => {
    const quotas = normalizeQuotaResponse({
      powGetPv: 102,
      powGetPv2: 0,
      cmsChgRemTime: 793,
      cmsDsgRemTime: 12927,
      flowInfoAcOut: 4,
      flowInfo12v: 4,
      cmsBattSoc: 49,
      powOutSumW: 0,
      powInSumW: 102,
    });
    const snapshot = buildDeviceSnapshot({ sn: "D3M1ZA1A9H7H0136", online: 1, deviceName: "Workshop Battery" }, quotas);

    expect(snapshot).toMatchObject({
      batteryLevel: 49,
      inputWatts: 102,
      outputWatts: 0,
      solarWatts: 102,
      remainingMinutes: 793,
      acOutputEnabled: false,
      dcOutputEnabled: false,
      powerFlow: "charging",
    });
  });

  it("reads the flat dotted response published for DELTA Pro", () => {
    const snapshot = buildDeviceSnapshot(
      { sn: "DCABZ123456789", online: 1 },
      normalizeQuotaResponse({
        "bmsMaster.soc": "100",
        "bmsMaster.temp": "34",
        "bmsMaster.inputWatts": "0",
        "bmsMaster.outputWatts": "0",
        "pd.remainTime": "14781",
        "inv.cfgAcEnabled": "0",
        "mppt.carState": "0",
      }),
    );

    expect(snapshot).toMatchObject({
      batteryLevel: 100,
      temperatureCelsius: 34,
      inputWatts: 0,
      outputWatts: 0,
      remainingMinutes: 14781,
      acOutputEnabled: false,
      dcOutputEnabled: false,
      powerFlow: "full",
    });
  });

  it("uses the reported charge state to select the relevant runtime", () => {
    const snapshot = buildDeviceSnapshot(
      { sn: "D3N1TEST1234", online: 1 },
      normalizeQuotaResponse({
        cmsBattSoc: 40,
        powInSumW: 0,
        powOutSumW: 0,
        cmsChgDsgState: 1,
        cmsChgRemTime: 60,
        cmsDsgRemTime: 240,
      }),
    );

    expect(snapshot.powerFlow).toBe("discharging");
    expect(snapshot.remainingMinutes).toBe(240);
  });

  it("converts documented negative DELTA runtime into discharge minutes", () => {
    const snapshot = buildDeviceSnapshot(
      { sn: "R331TEST1234", online: 1 },
      normalizeQuotaResponse({
        "bms_emsStatus.lcdShowSoc": 55,
        "pd.remainTime": -185,
      }),
    );

    expect(snapshot).toMatchObject({
      batteryLevel: 55,
      powerFlow: "discharging",
      remainingMinutes: 185,
    });
  });

  it("normalizes PowerOcean energy flow from the current documented fields", () => {
    const snapshot = buildDeviceSnapshot(
      { sn: "HJ31TEST1234", online: 1, deviceName: "Home Battery" },
      normalizeQuotaResponse({
        mpptPwr: 650,
        bpSoc: 42,
        bpPwr: -104,
        sysLoadPwr: 101,
        sysGridPwr: -3,
      }),
    );

    expect(snapshot).toMatchObject({
      batteryLevel: 42,
      batteryWatts: -104,
      solarWatts: 650,
      gridWatts: -3,
      loadWatts: 101,
      powerFlow: "discharging",
    });
  });

  it("normalizes Smart Home Panel 2 live battery, grid, load, and runtime fields", () => {
    const snapshot = buildDeviceSnapshot(
      { sn: "HD31TEST1234", online: 1, deviceName: "Home Panel" },
      normalizeQuotaResponse({
        "backupIncreInfo.backupBatPer": 79,
        "backupInfo.backupDischargeTime": 17389,
        "wattInfo.gridWatt": 0,
        "wattInfo.allHallWatt": 237,
      }),
    );

    expect(snapshot).toMatchObject({
      batteryLevel: 79,
      inputWatts: 0,
      outputWatts: 237,
      gridWatts: 0,
      loadWatts: 237,
      remainingMinutes: 290,
      powerFlow: "discharging",
    });
  });

  it("normalizes STREAM system power from the current documented fields", () => {
    const snapshot = buildDeviceSnapshot(
      { sn: "BK31TEST1234", online: 1, deviceName: "STREAM" },
      normalizeQuotaResponse({
        powGetPvSum: 498,
        gridConnectionPower: 0,
        powGetSysLoad: 600,
        cmsBattSoc: 12,
        powGetBpCms: 498,
        relay2Onoff: false,
        relay3Onoff: true,
      }),
    );

    expect(snapshot).toMatchObject({
      batteryLevel: 12,
      batteryWatts: 498,
      solarWatts: 498,
      gridWatts: 0,
      loadWatts: 600,
      powerFlow: "charging",
      acOutputEnabled: true,
    });
  });

  it("calculates PowerStream PV input and applies its documented electrical units", () => {
    const snapshot = buildDeviceSnapshot(
      { sn: "HW51TEST1234", online: 1, deviceName: "Balcony Solar" },
      normalizeQuotaResponse({
        "20_1.batSoc": 58,
        "20_1.pv1InputVolt": 355,
        "20_1.pv1InputCur": 48,
        "20_1.pv2InputVolt": 200,
        "20_1.pv2InputCur": 20,
        "20_1.batInputVolt": 480,
        "20_1.batInputCur": -25,
        "20_1.batTemp": 273,
        "20_1.invFreq": 500,
        "20_1.permanentWatts": 3200,
        "20_1.supplyPriority": 1,
        "20_1.lowerLimit": 22,
        "20_1.upperLimit": 83,
        "20_1.invBrightness": 200,
      }),
    );

    expect(snapshot).toMatchObject({
      batteryLevel: 58,
      solarWatts: 210.4,
      solarInput1Watts: 170.4,
      solarInput2Watts: 40,
      voltageVolts: 48,
      currentAmps: -2.5,
      frequencyHertz: 50,
      temperatureCelsius: 27.3,
      customLoadWatts: 320,
      supplyPriority: "battery-charging-first",
      dischargeLimitPercent: 22,
      chargeLimitPercent: 83,
      indicatorBrightnessPercent: 20,
    });
  });

  it("normalizes WAVE power, runtime, temperature, and battery readings", () => {
    const snapshot = buildDeviceSnapshot(
      { sn: "KT21TEST1234", online: 1, deviceName: "Bedroom WAVE" },
      normalizeQuotaResponse({
        "pd.batSoc": 64,
        "bms.bmsChgDsgSts": 1,
        "pd.acPwrIn": 300,
        "pd.mpptPwr": 120,
        "pd.batPwrOut": 180,
        "pd.batChgRemain": 90,
        "pd.envTemp": 23.5,
        "pd.setTempCel": 21,
        "pd.powerMode": 1,
        "pd.batVolt": 2460,
        "pd.batCurr": -500,
        "pd.acFreq": 50,
        "pd.tempSys": 0,
        "pd.mainMode": 0,
        "pd.pdSubMode": 3,
        "pd.fanValue": 1,
        "pd.rgbState": 0,
      }),
    );

    expect(snapshot).toMatchObject({
      batteryLevel: 64,
      inputWatts: 300,
      solarWatts: 120,
      batteryWatts: 180,
      remainingMinutes: 90,
      temperatureCelsius: 23.5,
      targetTemperatureCelsius: 21,
      switchEnabled: true,
      voltageVolts: 24.6,
      currentAmps: -0.5,
      frequencyHertz: 50,
      powerFlow: "charging",
      operatingMode: "Cool",
      operatingSubmode: "Manual",
      fanSpeed: "Medium",
      lightStripMode: "Follow screen",
    });
  });

  it("applies the documented Smart Plug units", () => {
    const snapshot = buildDeviceSnapshot(
      { sn: "HW52TEST1234", online: 1, deviceName: "Desk Plug" },
      normalizeQuotaResponse({
        "2_1.switchSta": true,
        "2_1.watts": 10,
        "2_1.volt": 233,
        "2_1.current": 450,
        "2_1.freq": 50,
        "2_1.temp": 39,
        "2_1.brightness": 1000,
      }),
    );

    expect(snapshot).toMatchObject({
      switchEnabled: true,
      outputWatts: 1,
      voltageVolts: 233,
      currentAmps: 0.45,
      frequencyHertz: 50,
      temperatureCelsius: 39,
      indicatorBrightnessPercent: 98,
      powerFlow: "unknown",
    });
  });

  it("reads Power Kits aggregate metrics", () => {
    const snapshot = buildDeviceSnapshot(
      { sn: "M106TEST1234", online: 1, deviceName: "Van Power Kit" },
      normalizeQuotaResponse({
        "bmsTotal.totalSoc": 73,
        "bmsTotal.totalInWatts": 800,
        "bmsTotal.totalOutWatts": 250,
        "bmsTotal.totalRemainTime": 420,
        "bmsTotal.totalChgDsgState": 2,
        "bmsTotal.chgSetSoc": 80,
        "bmsTotal.dsgSetSoc": 25,
        "kitscc.pv1InWatts": 500,
        "kitscc.pv2InWatts": 300,
        "bbcout.M1093-DCOUT-CA7C3.ldOutVol": 24000,
        "bbcout.M1093-DCOUT-CA7C3.ldOutCurr": 12500,
        "bbcout.M1093-DCOUT-CA7C3.dcOutSta": 1,
      }),
    );

    expect(snapshot).toMatchObject({
      batteryLevel: 73,
      inputWatts: 800,
      outputWatts: 250,
      solarWatts: 800,
      remainingMinutes: 420,
      voltageVolts: 24,
      currentAmps: 12.5,
      dcOutputEnabled: true,
      powerFlow: "charging",
      chargeLimitPercent: 80,
      dischargeLimitPercent: 25,
    });
  });

  it("reads DELTA Pro Ultra's namespaced fields", () => {
    const snapshot = buildDeviceSnapshot(
      { sn: "Y711TEST1234", online: 1, deviceName: "Ultra" },
      normalizeQuotaResponse({
        "hs_yj751_pd_appshow_addr.soc": 55,
        "hs_yj751_pd_appshow_addr.wattsInSum": 1200,
        "hs_yj751_pd_appshow_addr.wattsOutSum": 400,
        "hs_yj751_pd_appshow_addr.inHvMpptPwr": 700,
        "hs_yj751_pd_appshow_addr.inLvMpptPwr": 500,
        "hs_yj751_pd_appshow_addr.remainTime": 180,
        "hs_yj751_pd_appshow_addr.showFlag": 36,
      }),
    );

    expect(snapshot).toMatchObject({
      batteryLevel: 55,
      inputWatts: 1200,
      outputWatts: 400,
      solarWatts: 1200,
      remainingMinutes: 180,
      acOutputEnabled: true,
      dcOutputEnabled: true,
      powerFlow: "charging",
    });
  });

  it("normalizes GLACIER dual-zone temperatures and appliance state", () => {
    const snapshot = buildDeviceSnapshot(
      { sn: "BX11TEST1234", online: 1, deviceName: "Garage GLACIER" },
      normalizeQuotaResponse({
        "pd.batPct": 76,
        "pd.flagTwoZone": 1,
        "pd.tmpAver": 335,
        "pd.tmpL": -85,
        "pd.tmpR": 45,
        "pd.tmpLSet": -1,
        "pd.tmpRSet": 4,
        "pd.coolMode": 1,
        "pd.doorStat": 0,
        "pd.iceMkMode": 3,
        "pd.icePercent": 64,
      }),
    );

    expect(snapshot).toMatchObject({
      batteryLevel: 76,
      leftTemperatureCelsius: -8.5,
      rightTemperatureCelsius: 4.5,
      leftTargetTemperatureCelsius: -1,
      rightTargetTemperatureCelsius: 4,
      ecoModeEnabled: true,
      doorOpen: false,
      partitionInstalled: true,
      iceMakingState: "Making large ice",
      iceProgressPercent: 64,
    });
    expect(snapshot.temperatureCelsius).toBeUndefined();
    expect(snapshot.targetTemperatureCelsius).toBeUndefined();
  });

  it("uses GLACIER's combined target when the partition is removed", () => {
    const snapshot = buildDeviceSnapshot(
      { sn: "BX11TEST1234", online: 1 },
      normalizeQuotaResponse({
        "pd.flagTwoZone": 0,
        "pd.tmpAver": 35,
        "pd.tmpMSet": 3,
      }),
    );

    expect(snapshot).toMatchObject({
      temperatureCelsius: 3.5,
      targetTemperatureCelsius: 3,
      partitionInstalled: false,
    });
    expect(snapshot.leftTemperatureCelsius).toBeUndefined();
    expect(snapshot.rightTemperatureCelsius).toBeUndefined();
  });

  it("reads DELTA Pro 3 battery limits and rejects invalid percentages", () => {
    const valid = buildDeviceSnapshot(
      { sn: "MR51TEST1234", online: 1 },
      normalizeQuotaResponse({ cfgMaxChgSoc: 85, cfgMinDsgSoc: 15 }),
    );
    const invalid = buildDeviceSnapshot(
      { sn: "MR51TEST1234", online: 1 },
      normalizeQuotaResponse({ cfgMaxChgSoc: 255, cfgMinDsgSoc: -1 }),
    );

    expect(valid).toMatchObject({ chargeLimitPercent: 85, dischargeLimitPercent: 15 });
    expect(invalid.chargeLimitPercent).toBeUndefined();
    expect(invalid.dischargeLimitPercent).toBeUndefined();
  });
});
