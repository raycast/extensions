import { IntervalType } from "./types";

export const FocusText = "Focus";
export const ShortBreakText = "Short Break";
export const LongBreakText = "Long Break";
export const TimeStoppedPlaceholder = "--:--";

export const IntervalTitles: Record<IntervalType, string> = {
  focus: FocusText,
  "short-break": ShortBreakText,
  "long-break": LongBreakText,
};
