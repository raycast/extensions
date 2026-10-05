import { Initiative } from "@linear/sdk";

import { getIcon } from "./icons";

export function getInitiativeIcon(initiative: Pick<Initiative, "icon" | "color">) {
  return getIcon({
    icon: initiative.icon ?? undefined,
    color: initiative.color ?? undefined,
    fallbackIcon: { source: { light: "light/initiative.svg", dark: "dark/initiative.svg" } },
  });
}
