import { ScrollBarValue } from "../types";

export const scrollBarOutputToValueMap: Record<string, ScrollBarValue> = {
  Automatic: ScrollBarValue.AUTOMATIC,
  WhenScrolling: ScrollBarValue.WHEN_SCROLLING,
  Always: ScrollBarValue.ALWAYS,
};

export const scrollBarLabel: Record<ScrollBarValue, string> = {
  [ScrollBarValue.AUTOMATIC]: "Automatic",
  [ScrollBarValue.WHEN_SCROLLING]: "When Scrolling",
  [ScrollBarValue.ALWAYS]: "Always",
};
