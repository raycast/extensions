import { getIcon } from "./icons";
import { Initiative } from "@linear/sdk";

export function getInitiativeIcon(initiative: Pick<Initiative, "icon" | "color">) {
  return getIcon({
    icon: initiative.icon,
    color: initiative.color,
    fallbackIcon: { source: { light: "light/initiative.svg", dark: "dark/initiative.svg" } },
  });
}
