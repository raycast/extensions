import { VaultState } from "../models/vaultState";
import { Color } from "@raycast/api";

export function getVaultStateColor(vaultState: VaultState): Color {
  switch (vaultState) {
    case "active":
      return Color.Green;
    case "frozen":
      return Color.Blue;
    case "inactive":
      return Color.PrimaryText;
    case "may_liquidate":
      return Color.Orange;
    case "in_liquidation":
      return Color.Red;
  }
}
