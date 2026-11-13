import { Color, Icon } from "@raycast/api";
import { ChargeState } from "../analysis/battery";
import { Level } from "../analysis/level";
import { Severity } from "../analysis/severity";

/** Row icon colors for the chart severity scale, so lists and charts read the same way. */
export const SEVERITY_COLOR: Record<Severity, Color> = {
  low: Color.Green,
  moderate: Color.Yellow,
  high: Color.Orange,
  critical: Color.Red,
};

/** One icon per charging state, so the Now row needs no words for it (the tooltip explains). */
export const CHARGE_ICON: Record<ChargeState, { source: Icon; tintColor: Color }> = {
  // The plug icon is taken by the adapter's input on the Now row, so charging is an up arrow.
  charging: { source: Icon.ArrowUpCircle, tintColor: Color.Green },
  paused: { source: Icon.Pause, tintColor: Color.Orange },
  full: { source: Icon.CheckCircle, tintColor: Color.Green },
  "not-charging": { source: Icon.XMarkCircle, tintColor: Color.SecondaryText },
  "on-battery": { source: Icon.Clock, tintColor: Color.SecondaryText },
};

/** The Now row's chip in Diagnose: green when all is well, orange for sustained high draw, red for a runaway. */
export const LEVEL_COLOR: Record<Level, Color> = { normal: Color.Green, high: Color.Orange, runaway: Color.Red };
