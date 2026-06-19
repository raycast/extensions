import BigNumber from "bignumber.js";
import Nzh from "nzh";

export type RoundingMode = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// https://mikemcl.github.io/bignumber.js/#constructor-properties
export const ROUNDING_MODES = [
  { value: 4, label: "四舍五入 / Round Half Up", mode: BigNumber.ROUND_HALF_UP },
  { value: 5, label: "五舍六入 / Round Half Down", mode: BigNumber.ROUND_HALF_DOWN },
  { value: 0, label: "向上取整 / Round Up", mode: BigNumber.ROUND_UP },
  { value: 1, label: "向下取整 / Round Down", mode: BigNumber.ROUND_DOWN },
  { value: 2, label: "向正无穷取整 / Round Ceil", mode: BigNumber.ROUND_CEIL },
  { value: 3, label: "向负无穷取整 / Round Floor", mode: BigNumber.ROUND_FLOOR },
  { value: 6, label: "银行家舍入 / Round Half Even", mode: BigNumber.ROUND_HALF_EVEN },
  { value: 7, label: "半正无穷取整 / Round Half Ceil", mode: BigNumber.ROUND_HALF_CEIL },
  { value: 8, label: "半负无穷取整 / Round Half Floor", mode: BigNumber.ROUND_HALF_FLOOR },
] as const;

export type MoneyOptions = {
  unOmitYuan: boolean;
  forceZheng: boolean;
};

export type ConvertResult =
  | { state: "idle"; message: string }
  | { state: "error"; message: string }
  | { state: "ok"; rmbValue: string; rawValue: string; roundedValue: string };

export type ParsedPreferences = {
  decimalPlaces: number;
  roundingMode: RoundingMode;
  moneyPrefix: string;
  yuanChar: "元" | "圆";
  zhengChar: "整" | "正";
  moneyOptions: MoneyOptions;
};

export function parsePreferences(preferences: Preferences.ConvertNumberToRmb): ParsedPreferences {
  return {
    decimalPlaces: 2,
    roundingMode: parseRoundingMode(preferences.roundingMode),
    moneyPrefix: parseMoneyPrefix(preferences.moneyPrefix),
    yuanChar: parseBooleanPreference(preferences.preferTraditionalYuan, false) ? "圆" : "元",
    zhengChar: parseBooleanPreference(preferences.preferSimpleZheng, false) ? "正" : "整",
    moneyOptions: {
      unOmitYuan: parseBooleanPreference(preferences.unOmitYuan, false),
      forceZheng: parseBooleanPreference(preferences.forceZheng, false),
    },
  };
}

export function createNzh(options: { moneyPrefix: string; yuanChar: "元" | "圆"; zhengChar: "整" | "正" }) {
  return new Nzh({
    ch: "零壹贰叁肆伍陆柒捌玖",
    ch_u: "个拾佰仟万亿兆京",
    ch_f: "负",
    ch_d: "点",
    m_u: `${options.yuanChar}角分`,
    m_t: options.moneyPrefix,
    m_z: options.zhengChar,
  });
}

export function parseDecimalPlaces(input?: string) {
  const parsed = Number.parseInt(input ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 5) {
    return 2;
  }
  return parsed;
}

export function parseRoundingMode(input?: string): RoundingMode {
  const parsed = Number.parseInt(input ?? "", 10);
  if (ROUNDING_MODES.some((m) => m.value === parsed)) {
    return parsed as RoundingMode;
  }
  return BigNumber.ROUND_HALF_UP as RoundingMode;
}

export function parseMoneyPrefix(input?: string) {
  return (input ?? "").trim();
}

export function parseBooleanPreference(input: unknown, fallback: boolean) {
  if (typeof input === "boolean") {
    return input;
  }

  if (input === "true") {
    return true;
  }

  if (input === "false") {
    return false;
  }

  return fallback;
}

export function convert2rmb(
  rawInput: string,
  options: {
    decimalPlaces: number;
    roundingMode: RoundingMode;
    moneyOptions: MoneyOptions;
    nzh: Nzh;
  },
): ConvertResult {
  if (!rawInput) {
    return { state: "idle", message: "Please enter a number" };
  }

  const numeric = Number(rawInput);
  if (!Number.isFinite(numeric)) {
    return { state: "error", message: "Input cannot be parsed as a number" };
  }

  if (numeric < 0) {
    return { state: "error", message: "Negative numbers are not supported" };
  }

  const rounded = new BigNumber(rawInput).toFixed(options.decimalPlaces, options.roundingMode);
  const roundedValue = trimTrailingDecimalZeros(rounded);

  const rmbValue = options.nzh.toMoney(roundedValue, {
    ...options.moneyOptions,
    outSymbol: true,
  });

  return { state: "ok", rawValue: rawInput, roundedValue, rmbValue };
}

export function trimTrailingDecimalZeros(input: string) {
  return input.replace(/\.(\d*?)0+$/, ".$1").replace(/\.0*$/, "");
}
