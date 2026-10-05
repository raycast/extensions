import { Color, Icon } from "@raycast/api";

export const getBikeIcon = (totalBikes: number) => {
  if (totalBikes === 0) {
    return { icon: Icon.Signal0, color: Color.Red };
  } else if (totalBikes <= 2) {
    return { icon: Icon.Signal1, color: Color.Orange };
  } else if (totalBikes <= 5) {
    return { icon: Icon.Signal2, color: Color.Yellow };
  } else if (totalBikes <= 10) {
    return { icon: Icon.Signal3, color: Color.Green };
  } else {
    return { icon: Icon.FullSignal, color: Color.Green };
  }
};
