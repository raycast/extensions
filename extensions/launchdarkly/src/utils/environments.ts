import { Color, Icon, Image } from "@raycast/api";
import { LDEnvironment, LDFlagEnvironment, LDFlagStatusName } from "../types";
import { capitalizeFirstLetter } from "./stringUtils";

/** Order keys by the user's saved order; keys not in the order keep their relative position at the end. */
export function sortEnvironmentKeys(keys: string[], order: string[]): string[] {
  return [...keys].sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export function getEnvironmentName(envKey: string, flagEnv?: LDFlagEnvironment, env?: LDEnvironment): string {
  return env?.name || flagEnv?._environmentName || capitalizeFirstLetter(envKey);
}

export function getEnvironmentColor(env?: LDEnvironment): Color.ColorLike | undefined {
  if (!env?.color) return undefined;
  return env.color.startsWith("#") ? env.color : `#${env.color}`;
}

export function getEnvironmentIcon(on: boolean, env?: LDEnvironment): Image.ImageLike {
  const tintColor = getEnvironmentColor(env) ?? (on ? Color.Green : Color.SecondaryText);
  return { source: on ? Icon.CircleFilled : Icon.Circle, tintColor };
}

export const FLAG_STATUS_COLORS: Record<LDFlagStatusName, Color> = {
  new: Color.Blue,
  active: Color.Green,
  inactive: Color.Orange,
  launched: Color.Purple,
};

export const FLAG_STATUS_HINTS: Record<LDFlagStatusName, string> = {
  new: "Created in the last 7 days and never requested",
  active: "Requested by an SDK in the last 7 days",
  inactive: "Not requested in the last 7 days",
  launched: "All contexts receive the same variation; safe to remove",
};
