import { Color, Icon } from "@raycast/api";
import {
  BuiltInColorId,
  DateFormatPreference,
  TweekCalendar,
  TweekCustomColor,
  TweekTask,
} from "../types";
import {
  formatRelativeTaskDate,
  formatTaskDate,
  parseVirtualTaskId,
} from "./date-utils";

export interface ColorOption {
  id: string;
  label: string;
  hex: string;
  raycastColor: Color | string;
  isFreePlanSupported: boolean;
}

export const BUILT_IN_COLORS: Record<BuiltInColorId, ColorOption> = {
  blank: {
    id: "blank",
    label: "None (Blank)",
    hex: "#8E8E93",
    raycastColor: Color.SecondaryText,
    isFreePlanSupported: true,
  },
  pink: {
    id: "pink",
    label: "Pink",
    hex: "#CD2C54",
    raycastColor: "#CD2C54",
    isFreePlanSupported: true,
  },
  yellowish: {
    id: "yellowish",
    label: "Yellowish",
    hex: "#FDEF5D",
    raycastColor: "#FDEF5D",
    isFreePlanSupported: true,
  },
  cornflower: {
    id: "cornflower",
    label: "Cornflower",
    hex: "#5167F4",
    raycastColor: "#5167F4",
    isFreePlanSupported: false,
  },
  mango: {
    id: "mango",
    label: "Mango",
    hex: "#FFAF23",
    raycastColor: "#FFAF23",
    isFreePlanSupported: false,
  },
  greenish: {
    id: "greenish",
    label: "Greenish",
    hex: "#21FFA1",
    raycastColor: "#21FFA1",
    isFreePlanSupported: false,
  },
  lilac: {
    id: "lilac",
    label: "Lilac",
    hex: "#D95CFE",
    raycastColor: "#D95CFE",
    isFreePlanSupported: false,
  },
  grey: {
    id: "grey",
    label: "Grey",
    hex: "#C2C2C2",
    raycastColor: "#C2C2C2",
    isFreePlanSupported: false,
  },
  black: {
    id: "black",
    label: "Black",
    hex: "#000000",
    raycastColor: Color.PrimaryText,
    isFreePlanSupported: false,
  },
};

export const RECURRENCE_LABELS: Record<number, string> = {
  0: "Does not repeat",
  1: "Daily",
  2: "Weekly",
  3: "Monthly",
  4: "Annually",
  5: "Every weekday (Mon–Fri)",
  6: "Every two weeks",
  7: "Custom recurrence (RRULE)",
};

export function resolveTaskColor(
  colorId: string | null | undefined,
  customColors: TweekCustomColor[] = [],
): ColorOption {
  if (!colorId || colorId === "blank") {
    return BUILT_IN_COLORS.blank;
  }
  if (colorId in BUILT_IN_COLORS) {
    return BUILT_IN_COLORS[colorId as BuiltInColorId];
  }
  const custom = customColors.find((c) => c.id === colorId);
  if (custom) {
    return {
      id: custom.id,
      label: custom.name || `Custom (${custom.backgroundColor})`,
      hex: custom.backgroundColor,
      raycastColor: custom.backgroundColor,
      isFreePlanSupported: false,
    };
  }
  return {
    id: colorId,
    label: colorId,
    hex: colorId.startsWith("#") ? colorId : "#5167F4",
    raycastColor: colorId.startsWith("#") ? colorId : Color.Blue,
    isFreePlanSupported: false,
  };
}

export function getRecurrenceDescription(task: TweekTask): string | null {
  const parsed = parseVirtualTaskId(task.id);
  if (task.freq && task.freq > 0) {
    const baseLabel = RECURRENCE_LABELS[task.freq] || "Recurring";
    if (task.freq === 7 && task.recurrence) {
      return `${baseLabel}: \`${task.recurrence}\``;
    }
    return baseLabel;
  }
  if (task.virtual || parsed.isVirtual || task.recurringTodoId) {
    return "Recurring series occurrence";
  }
  return null;
}

export function isRecurringTask(task: TweekTask): boolean {
  const parsed = parseVirtualTaskId(task.id);
  return Boolean(
    (task.freq && task.freq > 0) ||
    task.virtual ||
    parsed.isVirtual ||
    task.recurringTodoId ||
    task.isBase,
  );
}

export function getChecklistProgress(task: TweekTask): {
  total: number;
  completed: number;
  label: string;
} | null {
  if (!task.checklist || task.checklist.length === 0) {
    return null;
  }
  const items = task.checklist.filter((item) => item.variant !== "header");
  if (items.length === 0) return null;
  const completed = items.filter((item) => item.done).length;
  return {
    total: items.length,
    completed,
    label: `${completed}/${items.length}`,
  };
}

export function formatTaskMarkdown(
  task: TweekTask,
  calendar?: TweekCalendar,
  customColors: TweekCustomColor[] = [],
  dateFormat: DateFormatPreference = "dd/MM/yyyy",
): string {
  const statusBadge = task.done ? "✅ **Completed**" : "⏳ **Pending**";
  const colorInfo = resolveTaskColor(task.color, customColors);
  const recurrence = getRecurrenceDescription(task);
  const parsedVirtual = parseVirtualTaskId(task.id);

  let placementText = formatRelativeTaskDate(task.date, dateFormat);
  if (!task.date && task.listId && calendar?.lists) {
    const listObj = calendar.lists.find((l) => l.id === task.listId);
    placementText = listObj ? `Someday List: ${listObj.name}` : "Someday List";
  }

  const lines: string[] = [
    `# ${task.done ? `~~${task.text}~~` : task.text}`,
    "",
    `${statusBadge}  •  📅 **${placementText}**${
      calendar ? `  •  🗂 **${calendar.name}**` : ""
    }`,
  ];

  if (colorInfo.id !== "blank") {
    lines.push(`🎨 **Color**: ${colorInfo.label} (\`${colorInfo.hex}\`)`);
  }

  if (recurrence) {
    lines.push(
      `🔁 **Recurrence**: ${recurrence}${parsedVirtual.isVirtual ? " *(Virtual Occurrence)*" : ""}`,
    );
  }

  lines.push("", "---", "");

  if (task.note && task.note.trim()) {
    lines.push("### Notes", "", task.note.trim(), "");
  } else {
    lines.push("*No additional notes provided.*", "");
  }

  if (task.checklist && task.checklist.length > 0) {
    lines.push("### Checklist", "");
    for (const item of task.checklist) {
      if (item.variant === "header") {
        lines.push(`#### ${item.text}`);
      } else {
        const indentSpaces = "  ".repeat(
          Math.max(0, Math.min(2, item.indent || 0)),
        );
        const box = item.done ? "[x]" : "[ ]";
        const star = item.highlighted ? " ⭐" : "";
        lines.push(`${indentSpaces}- ${box} ${item.text}${star}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function formatTaskCopyText(
  task: TweekTask,
  dateFormat: DateFormatPreference = "dd/MM/yyyy",
): string {
  const status = task.done ? "[x]" : "[ ]";
  const dateLabel = formatTaskDate(task.date, dateFormat);
  const parts = [`${status} ${task.text} (${dateLabel})`];
  if (task.note && task.note.trim()) {
    parts.push(`\nNote: ${task.note.trim()}`);
  }
  if (task.checklist && task.checklist.length > 0) {
    parts.push(
      "\nSubtasks:\n" +
        task.checklist
          .map((item) => `  - [${item.done ? "x" : " "}] ${item.text}`)
          .join("\n"),
    );
  }
  return parts.join("");
}

export function getTaskStatusIcon(
  task: TweekTask,
  customColors: TweekCustomColor[] = [],
) {
  const colorOpt = resolveTaskColor(task.color, customColors);
  if (task.done) {
    return {
      source: Icon.CheckCircle,
      tintColor: Color.Green,
    };
  }
  return {
    source: Icon.Circle,
    tintColor:
      colorOpt.id !== "blank" ? colorOpt.raycastColor : Color.SecondaryText,
  };
}
