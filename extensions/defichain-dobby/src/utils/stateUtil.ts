import { VaultState } from "../models/vaultState";
import { Color } from "@raycast/api";

export function getVaultStateColor(vaultState: VaultState): Color {
  switch (vaultState) {
    case "active":
      return Color.Green
    case "frozen":
      return Color.Blue;
    case "inactive":
      return Color.PrimaryText;
    case "mayLiquidate":
      return Color.Orange;
    case "inLiquidation":
      return Color.Red;
  }
}