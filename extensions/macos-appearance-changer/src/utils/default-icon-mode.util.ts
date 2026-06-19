import { IconStyle, IconMode } from "../types/types";
import { ICON_MODE_OPTIONS } from "../constants/icon-mode-options.constant";

export const defaultIconModeForStyle = (style: IconStyle): IconMode => {
  const options = ICON_MODE_OPTIONS[style];
  return options.length > 0 ? options[0].value : IconMode.None;
};
