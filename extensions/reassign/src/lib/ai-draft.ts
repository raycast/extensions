import { shiftWallMinutes } from "./block-timing";
import { humanDuration, isLocalDateTime, localMinutesBetween, localToDate, toLocalDateTime } from "./format";

export interface AiPreview {
  intents: Record<string, unknown>[];
  questions?: unknown[];
  notices?: string[];
  // Only an applied change carries an undo. A preview never has one.
  undoToken?: string;
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
  // The home calendar that the AI named ("... >Work"); absent = the default.
  calendarId?: string;
}

/** Accept only a single new block that this form can represent completely. */
export function blockDraft(preview: AiPreview): BlockDraft {
  if (preview.undoToken) throw new Error("The AI response was not a preview.");
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
    "start",
    "end",
    "durationMinutes",
    "notes",
    "kind",
    "areaId",
    "activityTypeId",
    "calendarId",
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
  if (intent.calendarId != null) {
    // An Inbox idea has no calendar; a new block takes it as its home.
    if (intent.op === "park" || typeof intent.calendarId !== "string")
      throw new Error(
        "This suggestion includes details this form cannot represent. Try a simpler block or use Reassign.",
      );
    draft.calendarId = intent.calendarId;
  }
  if (!["blocking", "non_blocking", "reference"].includes(draft.kind))
    throw new Error("The suggested block type is invalid.");
  if (intent.op === "park") {
    if (intent.start != null || intent.end != null)
      throw new Error("The Inbox suggestion includes a time. Ask for a scheduled block instead.");
    if (intent.durationMinutes != null) {
      if (
        typeof intent.durationMinutes !== "number" ||
        !Number.isInteger(intent.durationMinutes) ||
        intent.durationMinutes < 5 ||
        intent.durationMinutes > 1440
      )
        throw new Error("The suggested duration is invalid.");
      draft.duration = humanDuration(intent.durationMinutes);
    }
    return draft;
  }
  // The span is two local datetimes; the end must be after the start.
  if (!isLocalDateTime(intent.start) || !isLocalDateTime(intent.end))
    throw new Error("The suggestion needs a valid date and time range.");
  const duration = localMinutesBetween(intent.start, intent.end) ?? 0;
  // The server stores a span of 5 minutes to one day from this form.
  if (duration < 5 || duration > 1440) throw new Error("The suggested duration must be between 5 minutes and one day.");
  draft.start = localToDate(intent.start);
  if (Number.isNaN(draft.start.getTime()) || toLocalDateTime(draft.start) !== intent.start)
    throw new Error("The suggested local time does not exist. Choose another time.");
  shiftWallMinutes(draft.start, duration);
  draft.duration = humanDuration(duration);
  return draft;
}
