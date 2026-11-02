import { springWindow, DEFAULT_DURATION, type Easing } from "./model.ts";

export const COMPONENTS = [
  "Sheet",
  "Toggle",
  "Tooltip",
  "Staggered List",
] as const;
export type Component = (typeof COMPONENTS)[number];
export const REVEALS: Record<Component, string> = {
  Sheet: "Long travel exposes overshoot and settling time.",
  Toggle: "At short distances, bounce can read as a defect.",
  Tooltip: "Small, quick motion: is the easing still perceptible?",
  "Staggered List": "A tolerable defect once is repeated six times.",
};
export type PreviewSpec = {
  easing: Easing;
  duration: number;
  component: Component;
  appearance: "light" | "dark";
};
export function previewDuration(easing: Easing, duration?: number) {
  return easing.kind === "spring"
    ? springWindow(easing).seconds
    : (duration ?? easing.duration ?? DEFAULT_DURATION);
}
