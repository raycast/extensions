import { Icon, Color } from "@raycast/api";
import { CIStatus, PRExtraInfo } from "../../github/types/ci";

export function getCIIcon(status: CIStatus): { source: Icon; tintColor: Color } {
  if (status === "success") return { source: Icon.Checkmark, tintColor: Color.Green };
  if (status === "failure") return { source: Icon.XMarkCircle, tintColor: Color.Red };
  if (status === "pending") return { source: Icon.Clock, tintColor: Color.Yellow };
  return { source: Icon.Minus, tintColor: Color.SecondaryText };
}

export function getCILabel({ status, passing, failing, pending }: PRExtraInfo["ci"]): string {
  if (status === "success") return `${passing} passed`;
  if (status === "failure") return `${failing} failed${passing > 0 ? `, ${passing} passed` : ""}`;
  if (status === "pending") return `${pending} running${passing > 0 ? `, ${passing} passed` : ""}`;
  return "—";
}

export function getCIDotColor(status: CIStatus): Color {
  if (status === "success") return Color.Green;
  if (status === "failure") return Color.Red;
  if (status === "pending") return Color.Yellow;
  return Color.SecondaryText;
}
