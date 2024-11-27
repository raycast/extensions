import { Color } from "@raycast/api";

export const getStatusColor = (status: number) => {
  if (status >= 100 && status < 200) {
    return Color.SecondaryText;
  }

  if (status >= 200 && status < 300) {
    return Color.Green;
  }

  if (status >= 300 && status < 400) {
    return Color.Yellow;
  }

  return Color.Red;
};
