import { Color } from "@raycast/api";

export const colorRotation = () => {
  const keys = Object.keys(Color) as Array<keyof typeof Color>;
  const enumKey = keys[Math.floor(Math.random() * keys.length)];

  return Color[enumKey];
};
