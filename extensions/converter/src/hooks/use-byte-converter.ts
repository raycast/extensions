import { MutableRefObject, useEffect, useRef, useState } from "react";
import { insertDot, parseBigFloat } from "../utils/byte-converter-utils";
import { autoPaste } from "../types/preferences";
import { Clipboard, Form } from "@raycast/api";

export type ByteConverter<Units extends string> = {
  get: (exponent: number) => string;
  set: (exponent: number, value: string) => void;
  reset: () => void;
  getBestUnitExpression: () => string | null;
  ref: MutableRefObject<Record<Units, Form.TextField>>;
};

type Override = { exponent: number; value: string };

export default function useByteConverter<Units extends string>(
  unitToExponent: Record<Units, number>,
): ByteConverter<Units> {
  const [value, setValue] = useState<null | bigint>(null);
  const [override, setOverride] = useState<null | Override>(null);

  const precision = BigInt(100);

  const ref = useRef({} as Record<Units, Form.TextField>);

  useEffect(() => {
    if (autoPaste) {
      Clipboard.readText().then((text) => {
        if (!text) return;
        text = text.trim();
        for (const [unit, exponent] of Object.entries(unitToExponent)) {
          if (text.endsWith(unit)) {
            const value = text.substring(0, text.length - unit.length).trimEnd();
            set(exponent as number, value);
            ref.current[unit as Units]?.focus();
          }
        }
      });
    }
  }, []);

  const getBestUnitExpression = () => {
    const maxValue = BigInt(1000);
    if (value === null) return null;

    let best: [bigint, string | null] = [BigInt(0), null];
    // closest is used in case of no unit matched maxValue requirement
    let closest: [bigint | null, string | null] = [null, null];

    for (const [unit, exponent] of Object.entries(unitToExponent)) {
      const multiplier = BigInt(1) << BigInt(exponent as number);
      const v = (precision * value) / multiplier;
      if (v < precision * maxValue && v > best[0]) {
        best = [v, unit];
      } else if (closest[0] === null || v < closest[0]) {
        closest = [v, unit];
      }
    }
    if (best[1] !== null) return `${insertDot(best[0])} ${best[1]}`;
    if (closest[0] !== null) return `${insertDot(closest[0])} ${closest[1]}`;
    throw new Error("Invalid unitToExponent");
  };

  const get = (exponent: number): string => {
    if (override !== null && override.exponent == exponent) {
      return override.value;
    }
    if (value === null) return "";
    const multiplier = BigInt(1) << BigInt(exponent);
    return insertDot((precision * value) / multiplier);
  };

  const set = (exponent: number, value: string) => {
    setOverride({ exponent, value });
    value = value.trim();
    const [parsed, quotient] = parseBigFloat(value);
    if (parsed === null) setValue(null);
    else {
      const multiplier = BigInt(1) << BigInt(exponent);
      setValue((parsed * multiplier) / quotient);
    }
  };

  const reset = () => {
    setValue(null);
    setOverride(null);
  };

  return { get, set, reset, getBestUnitExpression, ref };
}
