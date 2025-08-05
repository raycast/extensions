import { Icon } from "@raycast/api";

export const getIconForModules = (numberOfModules: number) => {
  if (numberOfModules <= 5) {
    return Icon.StackedBars1;
  } else if (numberOfModules <= 20) {
    return Icon.StackedBars2;
  } else if (numberOfModules <= 50) {
    return Icon.StackedBars3;
  } else {
    return Icon.StackedBars4;
  }
};
