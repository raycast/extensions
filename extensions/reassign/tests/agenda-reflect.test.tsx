import { expect, it, vi } from "vitest";
import type { ReactElement } from "react";

// Reassign refuses a reflect on the account day or later (#1330). The server
// checks the original date of an occurrence id, else the date part of the start.
vi.mock("@raycast/api", () => ({
  Action: Object.assign("Action", { Push: "Push", OpenInBrowser: "OpenInBrowser", Style: {} }),
  ActionPanel: Object.assign("ActionPanel", { Section: "ActionSection" }),
  Alert: { ActionStyle: {} },
  confirmAlert: vi.fn(),
  Icon: {},
  Keyboard: { Shortcut: { Common: {} } },
  launchCommand: vi.fn(),
  LaunchType: {},
  showToast: vi.fn(),
  Toast: { Style: {} },
}));
vi.mock("../src/lib/oauth", () => ({ signOut: vi.fn() }));
vi.mock("../src/lib/api", () => ({ writeEvents: vi.fn() }));
vi.mock("../src/lib/feedback", () => ({ applyUndoToast: vi.fn(), failToast: vi.fn() }));
vi.mock("../src/components/edit-form", () => ({ EditForm: "EditForm" }));
vi.mock("../src/components/feedback-form", () => ({ FeedbackForm: "FeedbackForm" }));
vi.mock("../src/components/move-form", () => ({ MoveForm: "MoveForm" }));

import { AgendaActions, reflectDay } from "../src/components/agenda-actions";
import type { ScheduleEvent } from "../src/lib/schedule-model";

type Node = ReactElement<{ children?: unknown; title?: string; onAction?: () => unknown }>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const node = value as Node;
  return [node, ...nodes(node.props.children)];
}

const TODAY = "2026-10-07";
function render(event: ScheduleEvent, mutate = vi.fn(async () => true)) {
  const tree = nodes(
    AgendaActions({
      event,
      date: event.start.slice(0, 10),
      todayIso: TODAY,
      areas: [],
      activityTypes: [],
      mutate,
      lastUndoToken: null,
      runUndo: async () => {},
      nav: null,
    }),
  );
  return { titles: tree.map((node) => node.props.title), tree, mutate };
}
const block = (id: string, start: string, end: string): ScheduleEvent => ({ id, start, end, name: "Deep work" });

it("hides the check-off actions for a block today", () => {
  const { titles } = render(block("b1", `${TODAY}T09:00`, `${TODAY}T10:00`));
  expect(titles).not.toContain("Check off Kept");
  expect(titles).not.toContain("Check off Skipped");
  // The other actions stay.
  expect(titles).toContain("Edit Details…");
  expect(titles).toContain("Shift 15 Min Later");
});

it("hides the check-off actions for a block after today", () => {
  const { titles } = render(block("b1", "2026-10-08T09:00", "2026-10-08T10:00"));
  expect(titles).not.toContain("Check off Kept");
});

it("shows the check-off actions for a block yesterday and sends the reflect op", async () => {
  const { titles, tree, mutate } = render(block("b1", "2026-10-06T09:00", "2026-10-06T10:00"));
  expect(titles).toContain("Check off Kept");
  expect(titles).toContain("Check off Skipped");
  await tree.find((node) => node.props.title === "Check off Kept")!.props.onAction!();
  expect(mutate).toHaveBeenCalledWith("Marking as kept…", "Marked as kept", [
    { op: "reflect", id: "b1", status: "kept" },
  ]);
});

it("shows the check-off actions for a block that starts yesterday and runs into today", () => {
  const { titles } = render(block("b1", "2026-10-06T23:00", `${TODAY}T01:00`));
  expect(titles).toContain("Check off Kept");
});

it("uses the original date of an occurrence id, not the moved start", () => {
  // The occurrence moved from yesterday to today; the server checks yesterday.
  const moved = block("series-1@2026-10-06", `${TODAY}T09:00`, `${TODAY}T10:00`);
  expect(reflectDay(moved)).toBe("2026-10-06");
  expect(render(moved).titles).toContain("Check off Kept");
  // The occurrence moved from today to yesterday; the server checks today.
  const back = block(`series-1@${TODAY}`, "2026-10-06T09:00", "2026-10-06T10:00");
  expect(reflectDay(back)).toBe(TODAY);
  expect(render(back).titles).not.toContain("Check off Kept");
});

it("hides the check-off actions for a read-only block", () => {
  const { titles } = render({ ...block("b1", "2026-10-06T09:00", "2026-10-06T10:00"), readOnly: true });
  expect(titles).not.toContain("Check off Kept");
});
