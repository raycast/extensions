import { describe, expect, test, vi } from "vitest";

import type { Calendar, ScheduleEvent } from "../src/lib/schedule-model";
import { AgendaItem, BlockDetail } from "../src/components/agenda-item";

// The Calendar label, keywords, and accessory of a row for each calendar state.
// The mock keeps the element props readable on the rendered tree.
vi.mock("@raycast/api", () => {
  const passthrough = (name: string) =>
    Object.assign(
      function Passthrough(): null {
        return null;
      },
      { displayName: name },
    );
  return {
    Color: { SecondaryText: "SecondaryText", Green: "Green", PrimaryText: "PrimaryText" },
    Icon: {
      Calendar: "Calendar",
      Repeat: "Repeat",
      Video: "Video",
      Lock: "Lock",
      CheckCircle: "CheckCircle",
      Dot: "Dot",
    },
    List: {
      Item: Object.assign(passthrough("List.Item"), {
        Detail: Object.assign(passthrough("List.Item.Detail"), {
          Metadata: Object.assign(passthrough("List.Item.Detail.Metadata"), {
            Label: passthrough("Metadata.Label"),
            Separator: passthrough("Metadata.Separator"),
            Link: passthrough("Metadata.Link"),
            TagList: Object.assign(passthrough("Metadata.TagList"), {
              Item: passthrough("Metadata.TagList.Item"),
            }),
          }),
        }),
      }),
    },
  };
});

type AnyProps = { children?: unknown; [key: string]: unknown };
type AnyNode = { props: AnyProps };

function isNode(value: unknown): value is AnyNode {
  return !!value && typeof value === "object" && "props" in value;
}

// Walks every element node in the tree, recursing into *all* prop values (so it
// reaches `metadata`, which is a prop on `List.Item.Detail`, not a child).
function walk(node: unknown, visit: (n: AnyNode) => void): void {
  if (node == null) return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  if (!isNode(node)) return;
  visit(node);
  for (const value of Object.values(node.props)) walk(value, visit);
}

function propsOf(el: unknown): AnyProps {
  if (!isNode(el)) throw new Error("expected a React element");
  return el.props;
}

function calendarLabelFor(
  event: ScheduleEvent,
  calendars: Calendar[],
  defaultCalendarId?: string | null,
): string | undefined {
  const labels: string[] = [];
  walk(BlockDetail({ event, areas: [], activityTypes: [], calendars, defaultCalendarId }), (n) => {
    if (n.props.title === "Calendar") labels.push(n.props.text as string);
  });
  return labels[0];
}

function agendaRowFor(
  event: ScheduleEvent,
  calendars: Calendar[],
): { keywords: string[]; accessories: Array<Record<string, unknown>> } {
  const props = propsOf(
    AgendaItem({ event, areas: [], actions: null, activityTypes: [], calendars, isShowingDetail: false }),
  );
  return {
    keywords: (props.keywords as string[] | undefined) ?? [],
    accessories: (props.accessories as Array<Record<string, unknown>> | undefined) ?? [],
  };
}

const at = { start: "2026-09-23T09:00", end: "2026-09-23T10:00" };
const nativeEvent = { ...at, id: "e1", name: "Standup", calendarId: "work" } as ScheduleEvent;
const reassignOnlyEvent = { ...at, id: "e2", name: "Idea", calendarId: null } as ScheduleEvent;
const syncedEvent = { ...at, id: "e3", name: "Synced", calendarId: null, source: "google" } as ScheduleEvent;
const defaultFollowingEvent = { ...at, id: "e4", name: "Default" } as ScheduleEvent;
const workCalendar = { id: "work", name: "Work" } as Calendar;

describe("the Calendar label", () => {
  test("names the home calendar once the list has it", () => {
    expect(calendarLabelFor(nativeEvent, [workCalendar])).toBe("Work");
    expect(calendarLabelFor(defaultFollowingEvent, [workCalendar], "work")).toBe("Work");
  });

  test("does not call a block with a home Reassign-only while the list is empty or misses it", () => {
    expect(calendarLabelFor(nativeEvent, [])).toBe("Connected calendar");
    expect(calendarLabelFor(nativeEvent, [{ id: "other", name: "Other" } as Calendar])).toBe("Connected calendar");
  });

  test("keeps Reassign for a Reassign-only block and the origin for a synced block", () => {
    expect(calendarLabelFor(reassignOnlyEvent, [workCalendar])).toBe("Reassign");
    expect(calendarLabelFor(syncedEvent, [])).toBe("google");
  });
});

describe("the row keywords and accessory", () => {
  test("use the home calendar name", () => {
    const { keywords, accessories } = agendaRowFor(nativeEvent, [workCalendar]);
    expect(keywords).toContain("Work");
    expect(accessories.some((a) => a.icon === "Calendar" && a.tooltip === "Work")).toBe(true);
  });

  test("have no calendar for a Reassign-only block", () => {
    const { keywords, accessories } = agendaRowFor(reassignOnlyEvent, []);
    expect(keywords).toEqual([]);
    expect(accessories.some((a) => a.icon === "Calendar")).toBe(false);
  });

  test("do not leak the placeholder into keywords while the calendar list is empty", () => {
    const { keywords } = agendaRowFor(nativeEvent, []);
    expect(keywords).not.toContain("Connected calendar");
  });

  test("do not leak the placeholder into keywords when the list loads but misses the home id", () => {
    const { keywords } = agendaRowFor(nativeEvent, [{ id: "other", name: "Other" } as Calendar]);
    expect(keywords).not.toContain("Connected calendar");
    expect(keywords).toEqual([]);
  });

  test("keep the placeholder in the accessory tooltip while the calendar list is empty", () => {
    const { accessories } = agendaRowFor(nativeEvent, []);
    expect(accessories.some((a) => a.icon === "Calendar" && a.tooltip === "Connected calendar")).toBe(true);
  });

  test("still index a calendar literally named 'Connected calendar' once it resolves", () => {
    const namedCalendar = { id: "work", name: "Connected calendar" } as Calendar;
    const { keywords, accessories } = agendaRowFor(nativeEvent, [namedCalendar]);
    expect(keywords).toContain("Connected calendar");
    expect(accessories.some((a) => a.icon === "Calendar" && a.tooltip === "Connected calendar")).toBe(true);
  });
});
