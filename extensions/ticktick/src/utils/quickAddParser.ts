import moment from "moment";
import type { Project } from "../service/project";

export interface ParsedQuickAdd {
  title: string;
  projectId?: string;
  dueDate?: Date;
  isAllDay: boolean;
  priority?: "0" | "1" | "3" | "5";
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cleanTitle = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;?])/g, "$1")
    .trim();

const parsePriority = (text: string) => {
  const match = text.match(/(?:^|\s)(!(?:none|low|medium|high|[1-3]))(?=\s|$)/i);
  if (!match || match.index === undefined) return { text };

  const token = match[1].toLowerCase();
  const priority: ParsedQuickAdd["priority"] =
    token === "!none"
      ? "0"
      : token === "!low" || token === "!3"
      ? "1"
      : token === "!medium" || token === "!2"
      ? "3"
      : "5";

  return { text: `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`, priority };
};

const parseProject = (text: string, projects: Project[]) => {
  let firstMatch: { match: RegExpExecArray; project: Project } | undefined;
  for (const project of [...projects].sort((a, b) => b.name.length - a.name.length)) {
    const pattern = new RegExp(`(?:^|\\s)[~^]${escapeRegExp(project.name)}(?=\\s|$)`, "i");
    const match = pattern.exec(text);
    if (match?.index !== undefined && (!firstMatch || match.index < firstMatch.match.index))
      firstMatch = { match, project };
  }
  if (firstMatch) {
    const { match, project } = firstMatch;
    return {
      text: `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`,
      projectId: project.id,
    };
  }
  return { text };
};

const DATE_SOURCE = [
  "day after tomorrow",
  "tomorrow",
  "today",
  "tonight",
  "next week",
  "next (?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)",
  "(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)",
  "in \\d+ (?:days?|weeks?)",
  "\\d{4}-\\d{1,2}-\\d{1,2}",
  "\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}",
  "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?) \\d{1,2}(?:st|nd|rd|th)?(?:,? \\d{4})?",
].join("|");

const EXPLICIT_DATE_SOURCE = `${DATE_SOURCE}|\\d{1,2}[/-]\\d{1,2}`;

const TIME_SOURCE = "(?:noon|midnight|\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?)";

const resolveDate = (dateText: string, timeText: string | undefined, now: Date) => {
  const normalized = dateText.toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, "$1");
  let date = moment(now);

  if (normalized === "today" || normalized === "tonight") date = moment(now);
  else if (normalized === "tomorrow") date = moment(now).add(1, "day");
  else if (normalized === "day after tomorrow") date = moment(now).add(2, "days");
  else if (normalized === "next week") date = moment(now).add(1, "week").startOf("isoWeek");
  else if (/^in \d+ (?:days?|weeks?)$/.test(normalized)) {
    const relative = normalized.match(/^in (\d+) (days?|weeks?)$/);
    if (!relative) return undefined;
    date = moment(now).add(Number(relative[1]), relative[2].startsWith("week") ? "weeks" : "days");
  } else if (/^(?:next )?(?:mon|tue|wed|thu|fri|sat|sun)/.test(normalized)) {
    const weekday = normalized.replace(/^next /, "").slice(0, 3);
    const weekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    let daysAhead = (weekdays.indexOf(weekday) - moment(now).day() + 7) % 7;
    if (daysAhead === 0) daysAhead += 7;
    date = moment(now).add(daysAhead, "days");
  } else {
    const formats = [
      "YYYY-MM-DD",
      "YYYY-M-D",
      "MM/DD/YYYY",
      "MM/D/YYYY",
      "M/DD/YYYY",
      "M/D/YYYY",
      "MM-DD-YYYY",
      "MM-D-YYYY",
      "M-DD-YYYY",
      "M-D-YYYY",
      "MM/DD/YY",
      "MM/D/YY",
      "M/DD/YY",
      "M/D/YY",
      "MM-DD-YY",
      "MM-D-YY",
      "M-DD-YY",
      "M-D-YY",
      "MM/DD",
      "MM/D",
      "M/DD",
      "M/D",
      "MM-DD",
      "MM-D",
      "M-DD",
      "M-D",
      "MMM D YYYY",
      "MMMM D YYYY",
      "MMM D",
      "MMMM D",
    ];
    const parsed = moment(normalized.replace(",", ""), formats, true);
    if (!parsed.isValid()) return undefined;
    if (!/\d{4}/.test(normalized) && parsed.isBefore(moment(now), "day")) parsed.add(1, "year");
    date = parsed;
  }

  date.startOf("day");
  if (timeText) {
    const time = timeText.toLowerCase().replace(/\s/g, "");
    if (time === "noon") date.hour(12);
    else if (time === "midnight") date.hour(0);
    else {
      const parsedTime = moment(time, ["H", "HH", "H:mm", "HH:mm", "ha", "hha", "h:mma", "hh:mma"], true);
      if (!parsedTime.isValid()) return undefined;
      date.hour(parsedTime.hour()).minute(parsedTime.minute());
    }
  }
  return date.toDate();
};

const parseDate = (text: string, now: Date) => {
  const patterns = [
    new RegExp(`(?:^|\\s)\\*\\s*(${EXPLICIT_DATE_SOURCE})(?:\\s+(?:at\\s+)?(${TIME_SOURCE}))?(?=\\s|$|[,.;!?])`, "i"),
    new RegExp(`(?:^|\\s)(?:at\\s+)?(${TIME_SOURCE})\\s+(${DATE_SOURCE})(?=\\s|$|[,.;!?])`, "i"),
    new RegExp(`(?:^|\\s)(${DATE_SOURCE})(?:\\s+(?:at\\s+)?(${TIME_SOURCE}))?(?=\\s|$|[,.;!?])`, "i"),
  ];

  for (const [index, pattern] of patterns.entries()) {
    const match = pattern.exec(text);
    if (!match || match.index === undefined) continue;
    const dateText = index === 1 ? match[2] : match[1];
    const timeText = index === 1 ? match[1] : match[2];
    const dueDate = resolveDate(dateText, timeText, now);
    if (!dueDate) continue;
    return {
      text: `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`,
      dueDate,
      isAllDay: !timeText,
    };
  }

  // TickTick treats a time without a date as a task due today.
  const unambiguousTimeSource = "(?:noon|midnight|\\d{1,2}(?::\\d{2})?\\s*(?:am|pm))";
  const timeOnlyPattern = new RegExp(
    `(?:^|\\s)(?:(?:\\*|at)\\s*(${TIME_SOURCE})|(${unambiguousTimeSource}))(?=\\s|$|[,.;!?])`,
    "i"
  );
  const timeOnlyMatch = timeOnlyPattern.exec(text);
  if (timeOnlyMatch?.index !== undefined) {
    const timeText = timeOnlyMatch[1] || timeOnlyMatch[2];
    const dueDate = resolveDate("today", timeText, now);
    if (dueDate) {
      return {
        text: `${text.slice(0, timeOnlyMatch.index)} ${text.slice(timeOnlyMatch.index + timeOnlyMatch[0].length)}`,
        dueDate,
        isAllDay: false,
      };
    }
  }

  return { text, isAllDay: false };
};

/** Parse the subset of TickTick quick-add syntax supported by the macOS AppleScript API. */
export const parseQuickAdd = (input: string, projects: Project[], now = new Date()): ParsedQuickAdd => {
  let remainingText = input;
  const project = parseProject(remainingText, projects);
  const projectId = project.projectId;
  remainingText = project.text;

  let priorityValue: ParsedQuickAdd["priority"];
  let priority = parsePriority(remainingText);
  while (priority.priority) {
    // TickTick applies the last recognized priority when several are entered.
    priorityValue = priority.priority;
    remainingText = priority.text;
    priority = parsePriority(remainingText);
  }

  const date = parseDate(remainingText, now);
  remainingText = date.text;

  return {
    title: cleanTitle(remainingText),
    projectId,
    dueDate: date.dueDate,
    isAllDay: date.isAllDay,
    priority: priorityValue,
  };
};
