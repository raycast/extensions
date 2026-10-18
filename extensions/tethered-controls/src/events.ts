import { readStoredData } from "./read-stored-items";
import { isTetheredRunning, sendToTethered } from "./send-to-tethered";

export const actions = [
  ["sleep", "Sleep"],
  ["wake", "Wake"],
  ["shutdown", "Shut Down"],
  ["poweron", "Power On"],
  ["wakeorpoweron", "Wake or Power On"],
  ["modeLow", "Low Power"],
  ["modeAuto", "Auto Power"],
  ["modeHigh", "High Power"],
  ["topupOn", "Enable Topup"],
  ["topupOff", "Disable Topup"],
  ["caffeinateOn", "Start Caffeinate"],
  ["caffeinateOff", "Stop Caffeinate"],
  ["brightness", "Brightness"],
  ["fans", "Fans"],
];
export const days = [
  ["M", "Monday"],
  ["T", "Tuesday"],
  ["W", "Wednesday"],
  ["R", "Thursday"],
  ["F", "Friday"],
  ["S", "Saturday"],
  ["U", "Sunday"],
];
export const powerActions = new Set(["sleep", "wake", "shutdown", "poweron", "wakeorpoweron"]);
export const durationActions = new Set(["modeLow", "modeAuto", "modeHigh", "caffeinateOn", "brightness", "fans"]);
export const actionTitle = (action: string) => actions.find(([value]) => value === action)?.[1] ?? action;
export type EventValues = {
  action: string;
  date?: Date | null;
  weekdays?: string[];
  time?: string;
  duration?: string;
  wait?: string;
  mode?: string;
  percent?: string;
  replace?: boolean;
};
export type TetheredEvent = {
  id: string;
  source: "app" | "power";
  action: string;
  date: number;
  repeating: boolean;
  enabled: boolean;
  weekdays?: string;
  time?: string;
  duration?: number;
  wait?: number;
  mode?: string;
  percent?: number;
  pending?: boolean;
};
type EventResponse = { success: boolean; message: string; events?: unknown };

export async function eventRequest(path: "create" | "manage", values: Record<string, string>): Promise<EventResponse> {
  if (!(await isTetheredRunning())) throw new Error("Open the updated Tethered app to manage events.");
  const query = new URLSearchParams({ ...values, request: crypto.randomUUID() });
  await sendToTethered(`tethered://control/events/${path}?${query}`);
  const deadline = Date.now() + (values.operation === "list" ? 12000 : 120000);
  while (Date.now() < deadline) {
    const responses = await readStoredData("raycastEventResponses").catch(() => undefined);
    const result =
      typeof responses === "object" && responses !== null
        ? (responses as Record<string, unknown>)[query.get("request")!]
        : undefined;
    if (
      typeof result === "object" &&
      result !== null &&
      "request" in result &&
      result.request === query.get("request") &&
      "success" in result &&
      typeof result.success === "boolean" &&
      "message" in result &&
      typeof result.message === "string"
    ) {
      if (!result.success) throw new Error(result.message);
      return result as EventResponse;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(
    "No confirmation received. Refresh Events or check Tethered’s Schedule settings before retrying. The request may have succeeded. Make sure Tethered is updated.",
  );
}

function isEvent(value: unknown): value is TetheredEvent {
  if (typeof value !== "object" || value === null) return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.id === "string" &&
    (event.source === "app" || event.source === "power") &&
    typeof event.action === "string" &&
    actions.some(([action]) => action === event.action) &&
    typeof event.date === "number" &&
    Number.isFinite(event.date) &&
    typeof event.repeating === "boolean" &&
    typeof event.enabled === "boolean" &&
    (!event.repeating ||
      (typeof event.weekdays === "string" &&
        /^[MTWRFSU]{1,7}$/.test(event.weekdays) &&
        typeof event.time === "string" &&
        /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(event.time))) &&
    ["duration", "wait", "percent"].every(
      (key) =>
        event[key] === undefined || (typeof event[key] === "number" && Number.isFinite(event[key]) && event[key] >= 0),
    ) &&
    (event.mode === undefined || event.mode === "system" || event.mode === "fixed") &&
    (event.pending === undefined || typeof event.pending === "boolean")
  );
}

export async function listEvents(): Promise<TetheredEvent[]> {
  const response = await eventRequest("manage", { operation: "list" });
  if (!Array.isArray(response.events) || !response.events.every(isEvent))
    throw new Error("Unexpected event data from Tethered. Update the app and extension together.");
  return response.events.sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.date - b.date);
}

function seconds(value: string | undefined, title: string): string {
  if (!value?.trim()) return "0";
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 525600)
    throw new Error(`${title} must be between 0 and 525600 minutes.`);
  return String(minutes * 60);
}

export function eventParameters(values: EventValues, repeating: boolean, now = Date.now()): Record<string, string> {
  const query: Record<string, string> = { action: values.action };
  if (!actions.some(([action]) => action === values.action)) throw new Error("Choose an event action.");
  if (repeating) {
    if (!values.weekdays?.length || values.weekdays.some((value) => !days.some(([day]) => day === value)))
      throw new Error("Select at least one weekday.");
    const time = values.time?.trim() ?? "";
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Use HH:MM in 24-hour time, such as 09:30.");
    query.weekdays = days
      .filter(([day]) => values.weekdays?.includes(day))
      .map(([day]) => day)
      .join("");
    query.time = `${time}:00`;
    if (powerActions.has(values.action) && values.replace) query.replace = "true";
  } else {
    if (!values.date || !Number.isFinite(values.date.getTime()) || values.date.getTime() <= now)
      throw new Error("Choose a future date and time.");
    query.date = String(values.date.getTime() / 1000);
  }
  if (durationActions.has(values.action)) query.duration = seconds(values.duration, "Duration");
  if (values.action === "topupOn") query.wait = seconds(values.wait, "Wait for AC");
  if (values.action === "brightness" || values.action === "fans") {
    query.mode = values.mode ?? "system";
    const percent = query.mode === "fixed" ? Number(values.percent) : 50;
    if (
      !Number.isInteger(percent) ||
      percent < 0 ||
      percent > 100 ||
      (query.mode === "fixed" && !values.percent?.trim())
    )
      throw new Error("Enter a percentage from 0 to 100.");
    query.percent = String(percent);
  }
  return query;
}

export function nextOccurrence(weekdays: string[], time: string, now = new Date()): Date | undefined {
  const [hour, minute] = time.split(":").map(Number);
  const tokens = ["U", "M", "T", "W", "R", "F", "S"];
  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + offset);
    candidate.setHours(hour, minute, 0, 0);
    if (Number.isFinite(hour) && candidate.getHours() !== hour) candidate.setMinutes(0, 0, 0);
    if (weekdays.includes(tokens[candidate.getDay()]) && candidate > now) return candidate;
  }
}

export function eventSummary(values: EventValues, repeating: boolean, now = new Date()): string {
  const date = repeating ? nextOccurrence(values.weekdays ?? [], values.time ?? "", now) : values.date;
  const lines = [
    `**${actionTitle(values.action)}**`,
    repeating
      ? `Repeats: ${days
          .filter(([day]) => values.weekdays?.includes(day))
          .map(([, name]) => name)
          .join(", ")} at ${values.time || "…"}`
      : "One-time event",
    `Next: ${date && Number.isFinite(date.getTime()) ? date.toLocaleString() : "Choose a valid date and time"}`,
  ];
  if ((values.action === "brightness" || values.action === "fans") && values.mode)
    lines.push(`Control: ${values.mode === "fixed" ? `${values.percent || "…"}%` : "System"}`);
  if (durationActions.has(values.action))
    lines.push(`Duration: ${Number(values.duration) > 0 ? `${values.duration} minutes` : "Until stopped"}`);
  if (values.action === "topupOn")
    lines.push(`Wait for AC: ${Number(values.wait) > 0 ? `${values.wait} minutes` : "Run only if connected"}`);
  lines.push(`Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  return lines.join("\n\n");
}

export function valuesForEvent(event: TetheredEvent): EventValues {
  return {
    action: event.action,
    date: new Date(event.date * 1000),
    weekdays: event.weekdays?.split(""),
    time: event.time?.slice(0, 5),
    duration: String((event.duration ?? 0) / 60),
    wait: String((event.wait ?? 0) / 60),
    mode: event.mode ?? "system",
    percent: String(event.percent ?? 50),
  };
}
