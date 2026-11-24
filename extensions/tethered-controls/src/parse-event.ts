import { durationActions, eventParameters, nextOccurrence, EventValues } from "./events";

export type ParsedEvent = { values: EventValues; repeating: boolean; nextDate: Date };
const aliases: [RegExp, string][] = [
  [/^(?:wake or power on|wakeorpoweron)\b/, "wakeorpoweron"],
  [/^(?:shut down|shutdown)\b/, "shutdown"],
  [/^power on\b/, "poweron"],
  [/^(?:low power mode|low power)\b/, "modeLow"],
  [/^(?:auto power mode|auto power)\b/, "modeAuto"],
  [/^(?:high power mode|high power)\b/, "modeHigh"],
  [/^(?:disable topup|topup off|stop topup)\b/, "topupOff"],
  [/^(?:enable topup|topup on|start topup|topup)\b/, "topupOn"],
  [/^(?:stop caffeinate|caffeinate off)\b/, "caffeinateOff"],
  [/^(?:start caffeinate|caffeinate on|caffeinate)\b/, "caffeinateOn"],
  [/^sleep\b/, "sleep"],
  [/^wake\b/, "wake"],
  [/^brightness\b/, "brightness"],
  [/^fans?\b/, "fans"],
];
const weekdayTokens: Record<string, string> = {
  monday: "M",
  tuesday: "T",
  wednesday: "W",
  thursday: "R",
  friday: "F",
  saturday: "S",
  sunday: "U",
};

function minutes(amount: string, unit: string): string {
  const value = Number(amount) * (unit.startsWith("h") ? 60 : unit.startsWith("d") ? 1440 : 1);
  if (!Number.isFinite(value) || value <= 0 || value > 525600)
    throw new Error("Use a duration greater than zero and no longer than one year.");
  return String(value);
}

function clock(text: string): string {
  const match = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) throw new Error("Use a time such as 9am, 5:30pm, or 17:30.");
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  if (minute > 59 || (match[3] ? hour < 1 || hour > 12 : hour > 23)) throw new Error("Enter a valid time.");
  if (match[3]) hour = (hour % 12) + (match[3] === "pm" ? 12 : 0);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function weekdayList(text: string): string[] {
  const normalized = text.replace(/^every\s+/, "");
  if (["daily", "day", "every day"].includes(normalized)) return ["M", "T", "W", "R", "F", "S", "U"];
  if (["weekday", "weekdays"].includes(normalized)) return ["M", "T", "W", "R", "F"];
  if (["weekend", "weekends"].includes(normalized)) return ["S", "U"];
  const names = normalized.split(/\s*(?:,|\band\b)\s*/).filter(Boolean);
  const tokens = names.map((name) => weekdayTokens[name.replace(/s$/, "")]);
  if (!tokens.length || tokens.some((token) => !token))
    throw new Error("Use weekdays, weekends, daily, or named days such as every Monday and Friday.");
  return [...new Set(tokens)];
}

export function parseEvent(input: string, now = new Date()): ParsedEvent {
  let text = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^set\s+/, "");
  const matched = aliases
    .map(([pattern, action]) => ({ match: text.match(pattern), action }))
    .find(({ match }) => match);
  if (!matched?.match)
    throw new Error("Start with an event such as sleep, low power, topup on, caffeinate, brightness, or fans.");
  const values: EventValues = { action: matched.action };
  text = text.slice(matched.match[0].length).trim();
  if (values.action === "brightness" || values.action === "fans") {
    const control = text.match(/^(?:to\s+)?(system|\d{1,3}%)\s*/);
    if (!control) throw new Error("Specify a percentage or System, such as brightness 50% tomorrow at 9am.");
    if (control[1] === "system") values.mode = "system";
    else {
      values.mode = "fixed";
      values.percent = control[1].slice(0, -1);
      if (Number(values.percent) > 100) throw new Error("Percentage must be between 0 and 100.");
    }
    text = text.slice(control[0].length).trim();
  }
  const wait = text.match(/\s+wait for ac (\d+(?:\.\d+)?)\s*(minutes?|mins?|hours?|hrs?|days?)$/);
  if (wait) {
    if (values.action !== "topupOn") throw new Error("Wait for AC is only available for enabling Topup.");
    values.wait = minutes(wait[1], wait[2]);
    text = text.slice(0, wait.index).trim();
  }
  const duration = text.match(/\s+for (\d+(?:\.\d+)?)\s*(minutes?|mins?|hours?|hrs?|days?)$/);
  if (duration) {
    if (!durationActions.has(values.action)) throw new Error("This event does not support an expiration duration.");
    values.duration = minutes(duration[1], duration[2]);
    text = text.slice(0, duration.index).trim();
  }
  const relative = text.match(/^in (\d+(?:\.\d+)?)\s*(minutes?|mins?|hours?|hrs?|days?)$/);
  if (relative) {
    values.date = new Date(now.getTime() + Number(minutes(relative[1], relative[2])) * 60000);
    eventParameters(values, false, now.getTime());
    return { values, repeating: false, nextDate: values.date };
  }
  const schedule = text.match(/^(?:(.+?)\s+)?at\s+(.+)$/);
  if (!schedule) throw new Error("Add a schedule: in 30 minutes, tomorrow at 9am, or weekdays at 09:00.");
  const day = schedule[1] ?? "";
  const time = clock(schedule[2]);
  const repeating =
    /^(?:every\s+|daily$|weekdays$|weekends$)/.test(day) ||
    Object.keys(weekdayTokens).some((name) => day === `${name}s`);
  if (repeating) {
    values.weekdays = weekdayList(day);
    values.time = time;
    const nextDate = nextOccurrence(values.weekdays, time, now);
    if (!nextDate) throw new Error("Could not calculate the next occurrence.");
    eventParameters(values, true, now.getTime());
    return { values, repeating: true, nextDate };
  }
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date(now);
  date.setHours(12, 0, 0, 0);
  const clockHasPassed = hour * 60 + minute <= now.getHours() * 60 + now.getMinutes();
  if (day === "tomorrow") date.setDate(date.getDate() + 1);
  else if (day === "today") {
    date.setDate(now.getDate());
  } else if (!day) {
    if (clockHasPassed) date.setDate(date.getDate() + 1);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const [year, month, dayOfMonth] = day.split("-").map(Number);
    date.setFullYear(year, month - 1, dayOfMonth);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== dayOfMonth)
      throw new Error("Enter a valid calendar date.");
  } else {
    const token = weekdayTokens[day.replace(/^next /, "")];
    if (!token) throw new Error("Use today, tomorrow, YYYY-MM-DD, or a weekday. Prefix every for weekly repetition.");
    const target = ["U", "M", "T", "W", "R", "F", "S"].indexOf(token);
    let offset = (target - now.getDay() + 7) % 7;
    if (offset === 0 && (clockHasPassed || day.startsWith("next "))) offset = 7;
    date.setDate(date.getDate() + offset);
  }
  date.setHours(hour, minute, 0, 0);
  const rolloverDays = !day ? 1 : weekdayTokens[day.replace(/^next /, "")] ? 7 : 0;
  if (date <= now && rolloverDays > 0) {
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + rolloverDays);
    date.setHours(hour, minute, 0, 0);
  }
  if (date.getHours() !== hour || date.getMinutes() !== minute)
    throw new Error("That local time does not exist on this date because of a clock change. Choose another time.");
  values.date = date;
  eventParameters(values, false, now.getTime());
  return { values, repeating: false, nextDate: date };
}
