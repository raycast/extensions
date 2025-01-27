import { Color } from "@raycast/api";
import { RequestMethod, RequestMethodType } from "../types/request";

export function getRandomColor() {
  const colors = Object.values(Color);

  return colors[Math.floor(Math.random() * colors.length)];
}

export const MethodColors = {
  [RequestMethod.GET]: Color.Green,
  [RequestMethod.POST]: Color.Yellow,
  [RequestMethod.PUT]: Color.Purple,
  [RequestMethod.PATCH]: Color.Orange,
  [RequestMethod.DELETE]: Color.Red,
};

export function getColorForMethod(method: RequestMethodType) {
  return MethodColors[method] ?? Color.SecondaryText;
}
