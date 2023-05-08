import { Color, Icon, Image, List } from "@raycast/api";
import {
  EventReportItem,
  GroupReportItem,
  isCompleted,
  isEventReportItem,
  isTodoReportItem,
  ReportItemStatus,
  reportItemStatus,
  RSVPStatus,
  TodoReportItem,
} from "./report";

type ScalePercentageBin = `one${"1" | "2" | "4" | "8" | "16" | "32"}th` | "zero";

export const gray = { light: "#767473", dark: "#9E9B9A" };

const reportItemStatusIcon: Record<ReportItemStatus, { light: string; dark: string }> = {
  [reportItemStatus.completedAsScheduled]: { light: "light/check-square.svg", dark: "dark/check-square.svg" },
  [reportItemStatus.completedSpontaneously]: {
    light: "light/check-lightning-square.svg",
    dark: "dark/check-lightning-square.svg",
  },
  [reportItemStatus.progressingAsScheduled]: {
    light: "light/chevron-right-square.svg",
    dark: "dark/chevron-right-square.svg",
  },
  [reportItemStatus.progressingSpontaneously]: {
    light: "light/chevron-right-lightning-square.svg",
    dark: "dark/chevron-right-lightning-square.svg",
  },
  [reportItemStatus.missed]: { light: "light/question-mark-square.svg", dark: "dark/question-mark-square.svg" },
  [reportItemStatus.upcoming]: { light: "light/square.svg", dark: "dark/square.svg" },
  [reportItemStatus.completed]: { light: "light/check-square.svg", dark: "dark/check-square.svg" },
  [reportItemStatus.progressing]: { light: "light/chevron-right-square.svg", dark: "dark/chevron-right-square.svg" },
  [reportItemStatus.scheduled]: { light: "light/square.svg", dark: "dark/square.svg" },
  [reportItemStatus.spontaneous]: { light: "light/lightning-square.svg", dark: "dark/lightning-square.svg" },
  [reportItemStatus.todos]: { light: "light/square.svg", dark: "dark/square.svg" },
  // "canceled" is currently not displayed. Should it be displayed, create `xmark-square.svg` icons.
  [reportItemStatus.canceled]: { light: "light/xmark-square-small.svg", dark: "dark/xmark-square-small.svg" },
};

const scaleIcon: Record<ScalePercentageBin, Image.Source> = {
  zero: { light: "light/square-dotted.svg", dark: "light/square-dotted.svg" },
  one32th: { light: "light/square-0.svg", dark: "light/square-0.svg" }, // (0%, 6.25%) or less than 30 minutes of an 8-hour day
  one16th: { light: "light/square-12.5.svg", dark: "light/square-12.5.svg" }, // [6.25%, 12.5%) or 30 minutes to <1 hour of an 8-hour day
  one8th: { light: "light/square-25.svg", dark: "light/square-25.svg" }, // [12.5%, 25%) or 1 to <2 hours of an 8-hour day
  one4th: { light: "light/square-50.svg", dark: "light/square-50.svg" }, // [25%, 50%) or 2 to <4 hours of an 8-hour day
  one2th: { light: "light/square-75.svg", dark: "light/square-75.svg" }, // [50%, 100%) or 4 to <8 hours of an 8-hour day
  one1th: { light: "light/square-100.svg", dark: "light/square-100.svg" }, // 100% or 8 hours of an 8-hour day
};

export const rsvpIcon: Record<RSVPStatus, Image> = {
  Pending: { source: { light: "light/circle-dotted.svg", dark: "dark/circle-dotted.svg" }, tintColor: gray },
  Accepted: { source: Icon.CheckCircle, tintColor: Color.Green },
  Declined: { source: Icon.XMarkCircle, tintColor: Color.Red },
  Tentative: { source: Icon.QuestionMarkCircle, tintColor: Color.Orange },
};

export function getReportItemIcon(
  reportItem: TodoReportItem | EventReportItem | GroupReportItem
): List.Item.Props["icon"] {
  if (isTodoReportItem(reportItem)) {
    return {
      value: {
        source: reportItemStatusIcon[reportItem.status],
        tintColor: isCompleted(reportItem.status) ? Color.Green : gray,
      },
      tooltip: `To-Do Status: ${reportItem.status}`,
    };
  } else if (isEventReportItem(reportItem)) {
    const eventType = `Event Type: ${reportItem.hasAttendees ? "Organized Event / Meeting" : "Personal Event"}`;
    const rsvpStatus = reportItem.rsvpStatus ? `\nRSVP Status: ${reportItem.rsvpStatus}` : "";

    return {
      value: reportItem.rsvpStatus ? rsvpIcon[reportItem.rsvpStatus] : { source: reportItem.icon, tintColor: gray },
      tooltip: eventType + rsvpStatus,
    };
  } else {
    const { type, status, icon } = reportItem;
    const tooltipElements: string[] = [];
    if (type) tooltipElements.push(`Reporting Group Type: ${type}`);
    if (status) tooltipElements.push(`Status: ${status}`);

    return {
      value: {
        source: status ? reportItemStatusIcon[status] : icon ?? Icon.Dot,
        tintColor:
          status === reportItemStatus.completed ||
          status === reportItemStatus.completedAsScheduled ||
          status === reportItemStatus.completedSpontaneously
            ? Color.Green
            : gray,
      },
      tooltip: tooltipElements.join("\n"),
    };
  }
}

export function getRelativeScaleIcon(shareOfTotal: number): Image.Source {
  if (shareOfTotal <= 0) return scaleIcon.zero;
  const nextPowerOf2 = 1 << (32 - Math.clz32(Math.ceil(1 / shareOfTotal) - 1));
  const key = `one${nextPowerOf2}th` as ScalePercentageBin;
  return key in scaleIcon ? scaleIcon[key] : scaleIcon.one32th;
}
