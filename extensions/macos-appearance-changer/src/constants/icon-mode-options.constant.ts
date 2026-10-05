import { IconStyle, IconMode } from "../types/types";

export const ICON_MODE_OPTIONS: Record<IconStyle, { label: string; value: IconMode }[]> = {
  [IconStyle.Default]: [],
  [IconStyle.Dark]: [
    { label: "Always", value: IconMode.Always },
    { label: "Auto", value: IconMode.Auto },
  ],
  [IconStyle.Clear]: [
    { label: "Light", value: IconMode.Light },
    { label: "Dark", value: IconMode.Dark },
    { label: "Auto", value: IconMode.Auto },
  ],
  [IconStyle.Tinted]: [
    { label: "Light", value: IconMode.Light },
    { label: "Dark", value: IconMode.Dark },
    { label: "Auto", value: IconMode.Auto },
  ],
};
