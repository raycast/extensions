import { bestEffortFormat } from "./best-effort-format";
import { assertInputWithinLimit } from "./input";

export type ValidFormatResult = {
  kind: "valid";
  minified: string;
  pretty: string;
};

export type FallbackFormatResult = {
  formatted: string;
  kind: "fallback";
};

export type FormatResult = ValidFormatResult | FallbackFormatResult;

export function formatJsonInput(input: string): FormatResult {
  assertInputWithinLimit(input);

  try {
    const value: unknown = JSON.parse(input);
    return {
      kind: "valid",
      minified: JSON.stringify(value),
      pretty: JSON.stringify(value, null, 2),
    };
  } catch {
    return {
      formatted: bestEffortFormat(input),
      kind: "fallback",
    };
  }
}
