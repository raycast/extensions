import { Initiative } from "@linear/sdk";

import { getIcon } from "./icons";

export function getInitiativeIcon(initiative: Pick<Initiative, "icon" | "color">) {
  return getIcon({
    icon: initiative.icon,
    color: initiative.color,
    fallbackIcon: { source: { light: "light/initiative.svg", dark: "dark/initiative.svg" } },
  });
}
