import { shiftWallMinutes } from "./block-timing";
import { combineDateTime, humanDuration, isIsoDate, todayISO } from "./format";
import { minutesFromTime } from "./schedule-model";

export interface AiPreview {
  date?: string;
  applied: boolean;
  intents: Record<string, unknown>[];
  questions?: unknown[];
  notices?: string[];
}

export interface BlockDraft {
  name: string;
  start: Date | null;
  duration: string;
  destination: "schedule" | "inbox";
  notes: string;
  kind: string;
  areaId: string;
  activityTypeId: string;
}

/** Accept only a single new block that this form can represent completely. */
export function blockDraft(preview: AiPreview): BlockDraft {
  if (preview.applied !== false) throw new Error("The AI response was not a preview.");
  if (preview.questions?.length) throw new Error("Add more detail to your description and try again.");
  if (!Array.isArray(preview.intents) || preview.intents.length !== 1) {
    throw new Error("Describe one new block at a time. Use Reassign for changes to several blocks.");
  }
  const intent = preview.intents[0];
  if (!intent || !["create", "park"].includes(String(intent.op)) || intent.id) {
    throw new Error("Describe a new block. Use Agenda to change existing blocks.");
  }
  // Do not silently discard a repeat rule, checklist or calendar instruction.
  const supported = new Set([
    "op",
    "name",
    "date",
    "start",
    "end",
    "endNextDay",
    "durationHours",
    "notes",
    "kind",
    "areaId",
    "activityTypeId",
  ]);
  if (Object.entries(intent).some(([key, value]) => !supported.has(key) && value != null)) {
    throw new Error(
      "This suggestion includes details this form cannot represent. Try a simpler block or use Reassign.",
    );
  }
  if (typeof intent.name !== "string" || !intent.name.trim()) throw new Error("The suggestion needs a block name.");
  const draft: BlockDraft = {
    name: intent.name,
    start: null,
    duration: "",
    destination: intent.op === "park" ? "inbox" : "schedule",
    notes: typeof intent.notes === "string" ? intent.notes : "",
    kind: typeof intent.kind === "string" ? intent.kind : "blocking",
    areaId: typeof intent.areaId === "string" ? intent.areaId : "",
    activityTypeId: typeof intent.activityTypeId === "string" ? intent.activityTypeId : "",
  };
  if (!["blocking", "non-blocking", "reference"].includes(draft.kind))
    throw new Error("The suggested block type is invalid.");
  if (intent.op === "park") {
    if (intent.date != null || intent.start != null || intent.end != null)
      throw new Error("The Inbox suggestion includes a time. Ask for a scheduled block instead.");
    if (intent.durationHours != null) {
      if (
        typeof intent.durationHours !== "number" ||
        !Number.isFinite(intent.durationHours) ||
        intent.durationHours <= 0 ||
        intent.durationHours > 24
      )
        throw new Error("The suggested duration is invalid.");
      draft.duration = humanDuration(Math.round(intent.durationHours * 60));
    }
    return draft;
  }
  const date = intent.date ?? preview.date;
  const start = aiMinutes(intent.start);
  let end = aiMinutes(intent.end);
  if (
    typeof date !== "string" ||
    !isIsoDate(date) ||
    start === null ||
    end === null ||
    start < 0 ||
    start >= 1440 ||
    end < 0 ||
    end > 2880
  )
    throw new Error("The suggestion needs a valid date and time range.");
  if (end < 1440 && (intent.endNextDay === true || end < start)) end += 1440;
  const duration = end - start;
  if (duration <= 0 || duration > 1440)
    throw new Error("The suggested duration must be between one minute and one day.");
  const clock = `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`;
  draft.start = combineDateTime(date, clock);
  if (
    !draft.start ||
    Number.isNaN(draft.start.getTime()) ||
    todayISO(draft.start) !== date ||
    draft.start.getHours() * 60 + draft.start.getMinutes() !== start
  )
    throw new Error("The suggested local time does not exist. Choose another time.");
  shiftWallMinutes(draft.start, duration);
  draft.duration = humanDuration(duration);
  return draft;
}

function aiMinutes(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "string" && value.includes(":")) {
    const clock = /^(\d{1,2}):(\d{2})$/.exec(value);
    if (!clock || Number(clock[1]) > 24 || Number(clock[2]) > 59 || (Number(clock[1]) === 24 && Number(clock[2]) !== 0))
      return null;
  }
  return minutesFromTime(value);
}
