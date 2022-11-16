import { Color, Icon } from "@raycast/api";
import { LinkStrength } from "../network-info";

export const linkStrengthColors: Record<LinkStrength, Color> = {
  [LinkStrength.Excellent]: Color.Green,
  [LinkStrength.Good]: Color.Green,
  [LinkStrength.Fair]: Color.Yellow,
  [LinkStrength.Poor]: Color.Red,
};

export const linkStrengthIcons: Record<LinkStrength, Icon> = {
  [LinkStrength.Excellent]: Icon.FullSignal,
  [LinkStrength.Good]: Icon.Signal3,
  [LinkStrength.Fair]: Icon.Signal2,
  [LinkStrength.Poor]: Icon.Signal1,
};
