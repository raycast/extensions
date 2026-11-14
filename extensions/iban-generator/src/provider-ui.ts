import { Color, Icon } from "@raycast/api";
import type { ProviderOutcome } from "./lib";

export function outcomeColor(outcome: ProviderOutcome): Color {
  switch (outcome) {
    case "success":
      return Color.Green;
    case "failure":
      return Color.Red;
    case "dispute":
      return Color.Orange;
    default:
      return Color.SecondaryText;
  }
}

export function outcomeIcon(outcome: ProviderOutcome): Icon {
  switch (outcome) {
    case "success":
      return Icon.CheckCircle;
    case "failure":
      return Icon.XMarkCircle;
    case "dispute":
      return Icon.ExclamationMark;
    default:
      return Icon.QuestionMark;
  }
}
