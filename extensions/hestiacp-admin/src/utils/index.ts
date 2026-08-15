import { Color, Icon, Image } from "@raycast/api";
import { HOSTNAME } from "../constants";

export function isValidApiUrl() {
  try {
    generateApiUrl();
    return true;
  } catch {
    return false;
  }
}
export function generateApiUrl() {
  return new URL("api/", HOSTNAME).toString();
}

export function getTextAndIconFromVal(val: string) {
  let icon = undefined;
  let text = undefined;
  if (!val) icon = Icon.Minus;
  else if (val === "yes") icon = Icon.Check;
  else if (val === "no") icon = Icon.Multiply;
  else text = val;

  return { text, icon };
}

export function getLogIconByLevel(level: string): Image.ImageLike {
  if (level === "Info") return { source: Icon.Info, tintColor: Color.Blue };
  if (level === "Error") return { source: Icon.ExclamationMark, tintColor: Color.Red };
  return { source: Icon.Warning, tintColor: Color.Yellow };
}
