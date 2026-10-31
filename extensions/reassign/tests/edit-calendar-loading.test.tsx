import { beforeEach, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

// Hooks keep their state across renders by call order, so a remount shows.
const mock = vi.hoisted(() => ({
  hookIndex: 0,
  hookValues: [] as unknown[],
  calendars: undefined as unknown,
  pop: vi.fn(),
}));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: (v: unknown) => {
    const index = mock.hookIndex++;
    if (!(index in mock.hookValues)) mock.hookValues[index] = v;
    return [
      mock.hookValues[index],
      (next: unknown) => {
        mock.hookValues[index] = typeof next === "function" ? next(mock.hookValues[index]) : next;
      },
    ];
  },
}));
vi.mock("@raycast/api", () => ({
  Action: Object.assign("Action", { SubmitForm: "SubmitForm" }),
  ActionPanel: "ActionPanel",
  Form: Object.assign("Form", {
    TextField: "TextField",
    TextArea: "TextArea",
    Checkbox: "Checkbox",
    TagPicker: Object.assign("TagPicker", { Item: "Item" }),
    Dropdown: Object.assign("Dropdown", { Item: "Item" }),
    DatePicker: Object.assign("DatePicker", { Type: { DateTime: "datetime" }, isFullDay: () => false }),
  }),
  Icon: {},
  useNavigation: () => ({ pop: mock.pop }),
  showToast: vi.fn(),
  Toast: { Style: { Failure: "failure" } },
}));
vi.mock("@raycast/utils", () => ({
  useCachedPromise: () => ({ data: mock.calendars, isLoading: mock.calendars === undefined }),
}));
vi.mock("../src/lib/api", () => ({ listCalendars: vi.fn(), rebaseOnSeries: vi.fn() }));
import { EditForm } from "../src/components/edit-form";

type Node = ReactElement<Record<string, unknown> & { children?: unknown }>;

// Render the form and the function components in it, in hook order.
function render(props: Parameters<typeof EditForm>[0]): Node[] {
  mock.hookIndex = 0;
  const nodes: Node[] = [];
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== "object" || !("props" in value)) return;
    const node = value as Node;
    if (typeof node.type === "function") return walk((node.type as (p: unknown) => unknown)(node.props));
    nodes.push(node);
    walk(node.props.actions);
    walk(node.props.children);
  };
  walk(EditForm(props));
  return nodes;
}

beforeEach(() => {
  mock.hookValues = [];
  mock.calendars = undefined;
  mock.pop.mockReset();
});

it("an edit made before the calendars load sends no calendarId", async () => {
  const onSubmit = vi.fn(async () => true);
  // No `calendarId`: the block follows the default calendar.
  const props = {
    event: { id: "id", name: "work", start: "2026-09-21T09:00", end: "2026-09-21T10:00" },
    areas: [],
    activityTypes: [],
    onSubmit,
  };
  const first = render(props);
  (first.find((n) => n.props.id === "showDetails")!.props.onChange as (v: boolean) => void)(true);
  render(props);
  mock.calendars = {
    ok: true,
    data: { calendars: [{ id: "work", name: "Work", writable: true }], defaultCalendarId: "work" },
  };
  const loaded = render(props);
  (loaded.find((n) => n.props.id === "notes")!.props.onChange as (v: string) => void)("New note");
  const nodes = render(props);
  // Raycast submits the value that each rendered field shows.
  const values = Object.fromEntries(
    nodes.filter((n) => typeof n.props.id === "string").map((n) => [n.props.id, n.props.value ?? n.props.defaultValue]),
  );
  const save = nodes.find((n) => n.type === "SubmitForm")!;
  await (save.props.onSubmit as (v: unknown) => Promise<void>)(values);
  expect(onSubmit).toHaveBeenCalledWith({ op: "update", id: "id", notes: "New note" });
});
