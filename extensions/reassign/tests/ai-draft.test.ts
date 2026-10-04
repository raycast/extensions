import { expect, it } from "vitest";
import { AiPreview, blockDraft } from "../src/lib/ai-draft";
const event = { op: "create", name: "Deep work", start: "2026-09-22T09:00", end: "2026-09-22T11:00", areaId: "work" };
const preview = (intent: Record<string, unknown>): AiPreview => ({ intents: [intent] });
it("fills an editable scheduled draft", () => {
  expect(blockDraft(preview(event))).toMatchObject({
    name: "Deep work",
    start: new Date(2026, 8, 22, 9),
    duration: "2h",
    destination: "schedule",
    areaId: "work",
  });
});
it("keeps an overnight span that ends on the next day", () => {
  expect(blockDraft(preview({ ...event, start: "2026-09-22T23:00", end: "2026-09-23T01:00" }))).toMatchObject({
    duration: "2h",
  });
});
it("reads the same clock on the next day as a 24-hour span", () => {
  expect(blockDraft(preview({ ...event, end: "2026-09-23T09:00" }))).toMatchObject({ duration: "24h" });
});
it("keeps a suggested home calendar on a new block", () => {
  expect(blockDraft(preview({ ...event, calendarId: "work" }))).toMatchObject({ calendarId: "work" });
});
it("fills an Inbox draft with its duration", () => {
  expect(blockDraft(preview({ op: "park", name: "Research", durationMinutes: 90 }))).toMatchObject({
    destination: "inbox",
    start: null,
    duration: "1h30",
  });
});
it.each([
  { ...event, op: "delete", id: "existing" },
  { ...event, recurrence: "daily" },
  { ...event, checklist: [{ text: "step" }] },
  { op: "park", name: "Research", calendarId: "calendar" },
  { ...event, calendarId: 7 },
  { ...event, endNextDay: true },
  { op: "park", name: "Research", durationHours: 1.5 },
  { ...event, start: 23, end: 25 },
  { ...event, end: "24:00" },
  { ...event, start: "2026-02-30T09:00" },
  { ...event, start: "2026-09-22T09:99" },
  { ...event, end: "2026-09-22T10:99" },
  { ...event, start: "2026-09-22T25:00" },
  { ...event, start: "09:00", end: "11:00" },
  { ...event, date: "2026-09-22" },
  { ...event, end: "2026-09-22T09:00" },
  { ...event, end: "2026-09-22T08:00" },
  { ...event, end: "2026-09-24T09:00" },
  { ...event, end: "2026-09-22T09:04" },
  { op: "park", name: "Quick", durationMinutes: 4 },
  { op: "park", id: "existing", name: "Existing" },
])("refuses unsupported or invalid suggestions without silently dropping fields: %j", (intent) => {
  expect(() => blockDraft(preview(intent))).toThrow();
});
it("refuses multi-block, applied or ambiguous responses", () => {
  expect(() => blockDraft({ intents: [event, event] })).toThrow();
  expect(() => blockDraft({ intents: [event], undoToken: "undo" })).toThrow();
  expect(() => blockDraft({ intents: [event], questions: ["Which day?"] })).toThrow();
});
