import { RenderMode } from "../types";
import { Icon } from "@raycast/api";

export interface RenderModeOption {
  value: RenderMode;
  title: string;
  icon: Icon;
  charsPerLine: number;
}

export const RENDER_MODE_OPTIONS: RenderModeOption[] = [
  {
    value: "svg",
    title: "SVG (Graphics)",
    icon: Icon.Image,
    charsPerLine: 30,
  },
  {
    value: "terminal",
    title: "Terminal (Text)",
    icon: Icon.Terminal,
    charsPerLine: 45,
  },
];

export const getCharsPerLine = (mode: RenderMode): number => {
  const option = RENDER_MODE_OPTIONS.find((opt) => opt.value === mode);
  return option?.charsPerLine ?? 30;
};
