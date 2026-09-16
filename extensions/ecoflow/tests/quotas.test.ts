import { describe, expect, it } from "vitest";
import { normalizeQuotaResponse, readBoolean, readNumber } from "../src/api/quotas";

describe("quota normalization", () => {
  it("preserves the current API's flat dotted keys", () => {
    const quotas = normalizeQuotaResponse({
      "bmsMaster.soc": "87",
      "bmsMaster.inputWatts": "125",
      "inv.cfgAcEnabled": "1",
    });

    expect(readNumber(quotas, ["bmsMaster.soc"])).toBe(87);
    expect(readNumber(quotas, ["inputWatts"])).toBe(125);
    expect(readBoolean(quotas, ["inv.cfgAcEnabled"])).toBe(true);
  });

  it("also flattens nested MQTT-style quota objects", () => {
    const quotas = normalizeQuotaResponse({
      bmsMaster: { soc: 42, inputWatts: 5 },
      ports: [{ watts: 10 }, { watts: 20 }],
    });

    expect(quotas).toEqual({
      "bmsMaster.soc": 42,
      "bmsMaster.inputWatts": 5,
      ports: '[{"watts":10},{"watts":20}]',
    });
  });

  it("matches snake case and camel case quota names", () => {
    const quotas = normalizeQuotaResponse({ pow_in_sum_w: 150 });
    expect(readNumber(quotas, ["powInSumW"])).toBe(150);
  });
});
