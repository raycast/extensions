import { expect, it } from "vitest";
import { AiPreview, blockDraft } from "../src/lib/ai-draft";
const event = { op: "create", name: "Deep work", date: "2026-09-22", start: "09:00", end: "11:00", areaId: "work" };
const preview = (intent: Record<string, unknown>): AiPreview => ({ applied: false, intents: [intent] });
it("fills an editable scheduled draft", () => {
  expect(blockDraft(preview(event))).toMatchObject({
    name: "Deep work",
    start: new Date(2026, 8, 22, 9),
    duration: "2h",
    destination: "schedule",
    areaId: "work",
  });
});
it.each([
  ["23:00", "01:00"],
  [23, 25],
])("keeps overnight durations %s to %s", (start, end) => {
  expect(blockDraft(preview({ ...event, start, end }))).toMatchObject({ duration: "2h" });
});
it("fills an Inbox draft with its duration", () => {
  expect(blockDraft(preview({ op: "park", name: "Research", durationHours: 1.5 }))).toMatchObject({
    destination: "inbox",
    start: null,
    duration: "1h30",
  });
});
it.each([
  { ...event, op: "delete", id: "existing" },
  { ...event, recurrence: "daily" },
  { ...event, checklist: [{ text: "step" }] },
  { ...event, syncTo: "calendar" },
  { ...event, date: "2026-02-30" },
  { ...event, start: "09:99" },
  { ...event, end: "10:99" },
  { ...event, start: "25:00" },
  { ...event, end: "09:00" },
  { op: "park", id: "existing", name: "Existing" },
])("refuses unsupported or invalid suggestions without silently dropping fields: %j", (intent) => {
  expect(() => blockDraft(preview(intent))).toThrow();
});
it("refuses multi-block, applied or ambiguous responses", () => {
  expect(() => blockDraft({ applied: false, intents: [event, event] })).toThrow();
  expect(() => blockDraft({ applied: true, intents: [event] })).toThrow();
  expect(() => blockDraft({ applied: false, intents: [event], questions: ["Which day?"] })).toThrow();
});
