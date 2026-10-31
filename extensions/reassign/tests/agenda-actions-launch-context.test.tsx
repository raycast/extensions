import { beforeEach, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

// Fix site #1: the per-block AgendaActions "Add Block…" action launches `add`
// with the *viewed* day in `context.date`, so a block created while viewing a
// day other than today seeds that day, not today. `date` (the viewed day) is in
// scope inside AgendaActions and must reach the launch options.

const launchCommand = vi.hoisted(() => vi.fn());
vi.mock("@raycast/api", () => ({
  Action: Object.assign("Action", { Push: "Push", OpenInBrowser: "OpenInBrowser", Style: {} }),
  ActionPanel: Object.assign("ActionPanel", { Section: "ActionSection" }),
  Alert: { ActionStyle: {} },
  confirmAlert: vi.fn(),
  Icon: {},
  Keyboard: { Shortcut: { Common: { New: {}, Edit: {}, MoveDown: {}, MoveUp: {}, Refresh: {} } } },
  launchCommand,
  LaunchType: { UserInitiated: "userInitiated" },
  showToast: vi.fn(),
  Toast: { Style: {} },
}));
vi.mock("../src/lib/oauth", () => ({ signOut: vi.fn() }));
vi.mock("../src/lib/api", () => ({ writeEvents: vi.fn() }));
vi.mock("../src/lib/feedback", () => ({ applyUndoToast: vi.fn(), failToast: vi.fn() }));
vi.mock("../src/components/edit-form", () => ({ EditForm: "EditForm" }));
vi.mock("../src/components/feedback-form", () => ({ FeedbackForm: "FeedbackForm" }));
vi.mock("../src/components/move-form", () => ({ MoveForm: "MoveForm" }));

import { AgendaActions } from "../src/components/agenda-actions";
import type { ScheduleEvent } from "../src/lib/schedule-model";

type Node = ReactElement<{ children?: unknown; nav?: unknown; title?: string; onAction?: () => unknown }>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const node = value as Node;
  return [node, ...nodes(node.props.children), ...nodes(node.props.nav)];
}
const block = (id: string, start: string, end: string): ScheduleEvent => ({ id, start, end, name: "Deep work" });
const ADD = { name: "add", type: "userInitiated" };

function render(day: string) {
  const tree = nodes(
    AgendaActions({
      event: block("b1", `${day}T09:00`, `${day}T10:00`),
      date: day,
      todayIso: "2026-09-30",
      areas: [],
      activityTypes: [],
      mutate: vi.fn(async () => true),
      lastUndoToken: null,
      runUndo: async () => {},
      nav: null,
    }),
  );
  return tree.find((n) => n.props.title === "Add Block…")!;
}

beforeEach(() => launchCommand.mockReset());

it("passes the viewed day on the Add Block launch, not today", async () => {
  // 2026-10-08 is a week after the account today (2026-09-30).
  const action = render("2026-10-08");
  await action.props.onAction!();
  expect(launchCommand).toHaveBeenCalledWith({ ...ADD, context: { date: "2026-10-08" } });
  expect(launchCommand).not.toHaveBeenCalledWith(ADD);
});

it("passes the viewed day even when it is today", async () => {
  const action = render("2026-09-30");
  await action.props.onAction!();
  expect(launchCommand).toHaveBeenCalledWith({ ...ADD, context: { date: "2026-09-30" } });
});

it("a past day is passed through unchanged (the form seeds it, not today)", async () => {
  const action = render("2026-09-28");
  await action.props.onAction!();
  expect(launchCommand).toHaveBeenCalledWith({ ...ADD, context: { date: "2026-09-28" } });
});
