import type { StatusIndicator } from "@/types";

const INDICATOR_SEVERITY: Record<StatusIndicator, number> = {
  none: 0,
  minor: 1,
  major: 2,
  critical: 3,
};

export function worstIndicator(indicators: StatusIndicator[]): StatusIndicator {
  return indicators.reduce<StatusIndicator>(
    (worst, indicator) =>
      INDICATOR_SEVERITY[indicator] > INDICATOR_SEVERITY[worst]
        ? indicator
        : worst,
    "none",
  );
}
