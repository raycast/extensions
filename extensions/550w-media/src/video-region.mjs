import { rectangle } from "./generated/api.mjs";

export function videoRegion(value, width, height) {
  return { x1: 0, y1: 0, x2: 0, y2: 0, ...rectangle(value, width, height) };
}
