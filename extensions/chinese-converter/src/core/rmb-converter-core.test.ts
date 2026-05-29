import BigNumber from "bignumber.js";
import { describe, expect, it } from "vitest";
import {
  convert2rmb,
  createNzh,
  parseBooleanPreference,
  parseDecimalPlaces,
  parseMoneyPrefix,
  parsePreferences,
  parseRoundingMode,
  ROUNDING_MODES,
  trimTrailingDecimalZeros,
} from "./rmb-converter-core";

describe("rmb-converter-core", () => {
  it("parseDecimalPlaces should clamp invalid input to default 2", () => {
    expect(parseDecimalPlaces(undefined)).toBe(2);
    expect(parseDecimalPlaces("")).toBe(2);
    expect(parseDecimalPlaces("-1")).toBe(2);
    expect(parseDecimalPlaces("6")).toBe(2);
  });

  it("parseDecimalPlaces should accept 0~5", () => {
    expect(parseDecimalPlaces("0")).toBe(0);
    expect(parseDecimalPlaces("5")).toBe(5);
    expect(parseDecimalPlaces("2")).toBe(2);
  });

  it("parseRoundingMode should accept all 9 bignumber.js modes", () => {
    for (const m of ROUNDING_MODES) {
      expect(parseRoundingMode(String(m.value))).toBe(m.value);
    }
    expect(parseRoundingMode(undefined)).toBe(BigNumber.ROUND_HALF_UP);
    expect(parseRoundingMode("")).toBe(BigNumber.ROUND_HALF_UP);
    expect(parseRoundingMode("99")).toBe(BigNumber.ROUND_HALF_UP);
  });

  it("parse helpers should normalize values", () => {
    expect(parseMoneyPrefix("  人民币  ")).toBe("人民币");
    expect(parseBooleanPreference(true, false)).toBe(true);
    expect(parseBooleanPreference("true", false)).toBe(true);
    expect(parseBooleanPreference("false", true)).toBe(false);
    expect(parseBooleanPreference(undefined, true)).toBe(true);
  });

  it("trimTrailingDecimalZeros should remove trailing zeros after decimal point", () => {
    expect(trimTrailingDecimalZeros("1.2300")).toBe("1.23");
    expect(trimTrailingDecimalZeros("1.200")).toBe("1.2");
    expect(trimTrailingDecimalZeros("1.000")).toBe("1");
    expect(trimTrailingDecimalZeros("0.000")).toBe("0");
    expect(trimTrailingDecimalZeros("10.020")).toBe("10.02");
    expect(trimTrailingDecimalZeros("100.00")).toBe("100");
    expect(trimTrailingDecimalZeros("1.00000")).toBe("1");
    // no trailing zeros
    expect(trimTrailingDecimalZeros("1.23")).toBe("1.23");
    expect(trimTrailingDecimalZeros("1.001")).toBe("1.001");
    // no decimal point
    expect(trimTrailingDecimalZeros("100")).toBe("100");
    // single digit after decimal
    expect(trimTrailingDecimalZeros("1.2")).toBe("1.2");
  });

  it("parsePreferences should parse and normalize all preferences", () => {
    expect(
      parsePreferences({
        autoReadClipboard: false,
        roundingMode: "1",
        preferTraditionalYuan: true,
        preferSimpleZheng: true,
        unOmitYuan: true,
        forceZheng: false,
        moneyPrefix: "  RMB  ",
      }),
    ).toEqual({
      decimalPlaces: 2,
      roundingMode: 1,
      moneyPrefix: "RMB",
      yuanChar: "圆",
      zhengChar: "正",
      moneyOptions: { unOmitYuan: true, forceZheng: false },
    });
    expect(
      parsePreferences({
        autoReadClipboard: false,
        roundingMode: "4",
        unOmitYuan: false,
        preferTraditionalYuan: false,
        forceZheng: false,
        preferSimpleZheng: false,
        moneyPrefix: "",
      }),
    ).toEqual({
      decimalPlaces: 2,
      roundingMode: 4,
      moneyPrefix: "",
      yuanChar: "元",
      zhengChar: "整",
      moneyOptions: { unOmitYuan: false, forceZheng: false },
    });
  });

  it("convert2rmb should follow validate -> toFixed -> toMoney flow", () => {
    const nzh = createNzh({ moneyPrefix: "", yuanChar: "元", zhengChar: "整" });
    const res = convert2rmb("1.2300", {
      decimalPlaces: 2,
      roundingMode: BigNumber.ROUND_HALF_UP,
      moneyOptions: { unOmitYuan: false, forceZheng: true },
      nzh,
    });

    expect(res.state).toBe("ok");
    if (res.state === "ok") {
      expect(res.roundedValue).toBe("1.23");
      expect(res.rmbValue).toBe("壹元贰角叁分");
    }
  });

  it("convert2rmb should reject invalid and negative input", () => {
    const nzh = createNzh({ moneyPrefix: "", yuanChar: "元", zhengChar: "整" });

    expect(
      convert2rmb("", {
        decimalPlaces: 2,
        roundingMode: BigNumber.ROUND_HALF_UP,
        moneyOptions: { unOmitYuan: false, forceZheng: true },
        nzh,
      }),
    ).toEqual({ state: "idle", message: "Please enter a number" });

    expect(
      convert2rmb("abc", {
        decimalPlaces: 2,
        roundingMode: BigNumber.ROUND_HALF_UP,
        moneyOptions: { unOmitYuan: false, forceZheng: true },
        nzh,
      }),
    ).toEqual({ state: "error", message: "Input cannot be parsed as a number" });

    expect(
      convert2rmb("-1", {
        decimalPlaces: 2,
        roundingMode: BigNumber.ROUND_HALF_UP,
        moneyOptions: { unOmitYuan: false, forceZheng: true },
        nzh,
      }),
    ).toEqual({ state: "error", message: "Negative numbers are not supported" });
  });

  it("convert2rmb should apply moneyPrefix via m_t", () => {
    const nzh = createNzh({ moneyPrefix: "人民币", yuanChar: "元", zhengChar: "整" });
    const res = convert2rmb("0.32", {
      decimalPlaces: 2,
      roundingMode: BigNumber.ROUND_HALF_UP,
      moneyOptions: { unOmitYuan: true, forceZheng: true },
      nzh,
    });

    expect(res.state).toBe("ok");
    if (res.state === "ok") {
      expect(res.rmbValue.startsWith("人民币")).toBe(true);
    }
  });

  it("createNzh should use 圆 when yuanChar is 圆", () => {
    const nzh = createNzh({ moneyPrefix: "", yuanChar: "圆", zhengChar: "整" });
    const res = convert2rmb("1", {
      decimalPlaces: 2,
      roundingMode: BigNumber.ROUND_HALF_UP,
      moneyOptions: { unOmitYuan: false, forceZheng: false },
      nzh,
    });

    expect(res.state).toBe("ok");
    if (res.state === "ok") {
      expect(res.rmbValue).toBe("壹圆整");
    }
  });

  it("createNzh should use 正 when zhengChar is 正", () => {
    const nzh = createNzh({ moneyPrefix: "", yuanChar: "元", zhengChar: "正" });
    const res = convert2rmb("1", {
      decimalPlaces: 2,
      roundingMode: BigNumber.ROUND_HALF_UP,
      moneyOptions: { unOmitYuan: false, forceZheng: false },
      nzh,
    });

    expect(res.state).toBe("ok");
    if (res.state === "ok") {
      expect(res.rmbValue).toBe("壹元正");
    }
  });

  it("convert2rmb should use truncate (ROUND_DOWN) correctly", () => {
    const nzh = createNzh({ moneyPrefix: "", yuanChar: "元", zhengChar: "整" });
    const res = convert2rmb("1.239", {
      decimalPlaces: 2,
      roundingMode: BigNumber.ROUND_DOWN,
      moneyOptions: { unOmitYuan: false, forceZheng: true },
      nzh,
    });

    expect(res.state).toBe("ok");
    if (res.state === "ok") {
      expect(res.roundedValue).toBe("1.23");
      expect(res.rmbValue).toBe("壹元贰角叁分");
    }
  });

  it("nzh input should have trailing decimal zeros stripped", () => {
    const nzh = createNzh({ moneyPrefix: "", yuanChar: "元", zhengChar: "整" });

    // Whole yuan inputs: trailing zeros stripped → 整
    for (const dp of [0, 1, 2, 3, 4, 5] as const) {
      const res = convert2rmb("1", {
        decimalPlaces: dp,
        roundingMode: BigNumber.ROUND_HALF_UP,
        moneyOptions: { unOmitYuan: false, forceZheng: false },
        nzh,
      });
      expect(res.state).toBe("ok");
      if (res.state === "ok") {
        expect(res.rmbValue).toBe("壹元整");
      }
    }

    // "1.00" same as "1"
    const trailingZeros = convert2rmb("1.00", {
      decimalPlaces: 2,
      roundingMode: BigNumber.ROUND_HALF_UP,
      moneyOptions: { unOmitYuan: false, forceZheng: false },
      nzh,
    });
    expect(trailingZeros.state).toBe("ok");
    if (trailingZeros.state === "ok") {
      expect(trailingZeros.rmbValue).toBe("壹元整");
    }

    // Partial trailing zeros: "1.20" → "1.2" → 壹元贰角
    const partial = convert2rmb("1.20", {
      decimalPlaces: 2,
      roundingMode: BigNumber.ROUND_HALF_UP,
      moneyOptions: { unOmitYuan: false, forceZheng: false },
      nzh,
    });
    expect(partial.state).toBe("ok");
    if (partial.state === "ok") {
      expect(partial.rmbValue).toBe("壹元贰角");
    }

    // Fractional inputs: no trailing zeros to strip
    const cases: [number, string, string][] = [
      [1, "1.1", "壹元壹角"],
      [2, "1.23", "壹元贰角叁分"],
    ];
    for (const [dp, input, expected] of cases) {
      const res = convert2rmb(input, {
        decimalPlaces: dp,
        roundingMode: BigNumber.ROUND_HALF_UP,
        moneyOptions: { unOmitYuan: false, forceZheng: false },
        nzh,
      });
      expect(res.state).toBe("ok");
      if (res.state === "ok") {
        expect(res.rmbValue).toBe(expected);
      }
    }
  });

  it("README rounding mode table examples should be correct", () => {
    const dp = 2;
    const cases: [string, string, string][] = [
      // [BigNumber mode constant name, input, expected output]
      ["ROUND_HALF_UP", "1.235", "1.24"],
      ["ROUND_HALF_UP", "1.255", "1.26"],
      ["ROUND_DOWN", "1.235", "1.23"],
      ["ROUND_HALF_EVEN", "1.235", "1.24"],
      ["ROUND_HALF_EVEN", "1.245", "1.24"],
      ["ROUND_UP", "1.235", "1.24"],
      ["ROUND_FLOOR", "-1.235", "-1.24"],
      ["ROUND_CEIL", "-1.235", "-1.23"],
      ["ROUND_HALF_DOWN", "1.235", "1.23"],
      ["ROUND_HALF_CEIL", "-1.235", "-1.23"],
      ["ROUND_HALF_FLOOR", "-1.235", "-1.24"],
    ];

    for (const [modeName, input, expected] of cases) {
      const mode = BigNumber[modeName as keyof typeof BigNumber] as BigNumber.RoundingMode;
      const actual = new BigNumber(input).toFixed(dp, mode);
      expect(actual, `${modeName}(${input})`).toBe(expected);
    }
  });
});
