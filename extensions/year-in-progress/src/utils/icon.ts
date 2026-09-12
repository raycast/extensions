import { getProgressIcon } from "@raycast/utils";

export function getIcon(progressNum: number) {
  return {
    source: getProgressIcon(progressNum / 100),
    tintColor: { dark: "#E6E6E6", light: "#262626", adjustContrast: false },
  };
}
