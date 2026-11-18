import { Color } from "@raycast/api";
import { RiskLevel } from "../lib/rules/evaluate";

export const riskColors: Record<RiskLevel, Color> = {
  High: Color.Red,
  Medium: Color.Orange,
  Low: Color.Yellow,
  None: Color.Green,
};
