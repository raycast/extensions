import { LayoutPlacement } from "./types";

export const PLACEMENT_OPTIONS: Array<{ value: LayoutPlacement; title: string }> = [
  { value: "center", title: "Centered" },
  { value: "top", title: "Top" },
  { value: "bottom", title: "Bottom" },
  { value: "left", title: "Left Middle" },
  { value: "right", title: "Right Middle" },
  { value: "top-left", title: "Left Top" },
  { value: "top-right", title: "Right Top" },
  { value: "bottom-left", title: "Left Bottom" },
  { value: "bottom-right", title: "Right Bottom" },
];

export function getPlacementTitle(placement: LayoutPlacement = "center") {
  return PLACEMENT_OPTIONS.find((option) => option.value === placement)?.title ?? "Centered";
}
