import { Color } from "@raycast/api";
import { ReboundRequestMethod, ReboundRequestMethodType } from "../types/rebound";

export function getRandomColor() {
  const colors = Object.values(Color);

  return colors[Math.floor(Math.random() * colors.length)];
}

export function getColorForMethod(method: ReboundRequestMethodType) {
  switch (method) {
    case ReboundRequestMethod.GET:
      return Color.Blue;
    case ReboundRequestMethod.POST:
      return Color.Green;
    case ReboundRequestMethod.PUT:
      return Color.Orange;
    case ReboundRequestMethod.DELETE:
      return Color.Red;
    default:
      return Color.PrimaryText;
  }
}
