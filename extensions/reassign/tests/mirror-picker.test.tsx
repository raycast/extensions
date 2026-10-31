import { beforeEach, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import type { ScheduleEvent } from "../src/lib/schedule-model";

// The Edit form with the real calendar fields: hooks keep their state by call order.
const mock = vi.hoisted(() => ({
  hookIndex: 0,
  hookValues: [] as unknown[],
  calendars: undefined as unknown,
  pop: vi.fn(),
  toast: vi.fn(),
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
    TagPicker: Object.assign("TagPicker", { Item: "TagItem" }),
    Dropdown: Object.assign("Dropdown", { Item: "Item", Section: "Section" }),
    DatePicker: Object.assign("DatePicker", { Type: { DateTime: "datetime" }, isFullDay: () => false }),
  }),
  Icon: {},
  useNavigation: () => ({ pop: mock.pop }),
  showToast: mock.toast,
  Toast: { Style: { Failure: "failure" } },
}));
vi.mock("@raycast/utils", () => ({
  useCachedPromise: () => ({ data: mock.calendars, isLoading: false }),
}));
vi.mock("../src/lib/api", () => ({ listCalendars: vi.fn(), rebaseOnSeries: vi.fn() }));
import { EditForm } from "../src/components/edit-form";

type Node = ReactElement<Record<string, unknown> & { children?: unknown }>;

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

const field = (nodes: Node[], id: string) => nodes.find((n) => n.props.id === id);

// Open the details, apply `change`, then submit what each rendered field shows.
async function editAndSave(event: ScheduleEvent, overrides: Record<string, unknown>, change?: (nodes: Node[]) => void) {
  const onSubmit = vi.fn(async () => true);
  const props = { event, areas: [], activityTypes: [], onSubmit };
  (field(render(props), "showDetails")!.props.onChange as (v: boolean) => void)(true);
  if (change) change(render(props));
  const nodes = render(props);
  const values = Object.fromEntries(
    nodes.filter((n) => typeof n.props.id === "string").map((n) => [n.props.id, n.props.value ?? n.props.defaultValue]),
  );
  const save = nodes.find((n) => n.type === "SubmitForm")!;
  await (save.props.onSubmit as (v: unknown) => Promise<void>)({ ...values, ...overrides });
  return { onSubmit, nodes };
}

const at = { start: "2026-09-21T09:00", end: "2026-09-21T10:00" };

beforeEach(() => {
  mock.hookValues = [];
  mock.pop.mockReset();
  mock.toast.mockReset();
  mock.calendars = {
    ok: true,
    data: {
      calendars: [
        { id: "work", name: "Work", writable: true },
        { id: "home", name: "Home", writable: true },
      ],
      defaultCalendarId: "work",
    },
  };
});

it("keeps the copies of a Reassign-only one-off block on a rename", async () => {
  const event = { ...at, id: "id", name: "Gym", calendarId: null, mirrorCalendarIds: ["home"] };
  const { onSubmit, nodes } = await editAndSave(event, { name: "Gym class" });
  expect(field(nodes, "mirrorIds")?.props.value).toEqual(["home"]);
  expect(onSubmit).toHaveBeenCalledWith({ op: "update", id: "id", name: "Gym class" });
});

it("keeps the copies when the picker of a Reassign-only series is hidden", async () => {
  const event = { ...at, id: "series@2026-09-21", name: "Gym", calendarId: null, mirrorCalendarIds: ["home"] };
  const { onSubmit, nodes } = await editAndSave(event, { name: "Gym class", scope: "this" });
  expect(field(nodes, "mirrorIds")).toBeUndefined();
  // No false "calendar change covers the whole series" refusal.
  expect(mock.toast).not.toHaveBeenCalled();
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Gym class" }));
  expect(onSubmit).toHaveBeenCalledWith(expect.not.objectContaining({ mirrorCalendarIds: expect.anything() }));
});

it("hides the mirror picker for a Reassign-only series row with a plain id", async () => {
  const event = { ...at, id: "series", name: "Gym", calendarId: null, recurrence: "FREQ=DAILY" };
  const { nodes } = await editAndSave(event, {});
  expect(field(nodes, "mirrorIds")).toBeUndefined();
});

it("reads the copy style from the shown mirrors only", async () => {
  mock.calendars = {
    ok: true,
    data: {
      calendars: [
        { id: "work", name: "Work", writable: true },
        { id: "home", name: "Home", writable: true },
        { id: "shared", name: "Shared", writable: false },
      ],
      defaultCalendarId: "work",
    },
  };
  const event = {
    ...at,
    id: "id",
    name: "Gym",
    calendarId: "work",
    mirrorCalendarIds: ["home", "shared"],
    mirrorStyles: { home: "busy" as const },
  };
  const { nodes } = await editAndSave(event, {});
  expect(field(nodes, "mirrorStyle")?.props.value).toBe("busy");
});

it("hides the copy style without a picked mirror", async () => {
  const event = { ...at, id: "id", name: "Gym", calendarId: "work" };
  const { nodes } = await editAndSave(event, {});
  expect(field(nodes, "mirrorIds")).toBeDefined();
  expect(field(nodes, "mirrorStyle")).toBeUndefined();
});

it("offers Mixed only when the copy styles differ, and keeps them on a save", async () => {
  const calendars = [
    { id: "work", name: "Work", writable: true },
    { id: "home", name: "Home", writable: true },
    { id: "side", name: "Side", writable: true },
  ];
  mock.calendars = { ok: true, data: { calendars, defaultCalendarId: "work" } };
  const event = {
    ...at,
    id: "id",
    name: "Gym",
    calendarId: "work",
    mirrorCalendarIds: ["home", "side"],
    mirrorStyles: { home: "busy" as const },
  };
  const { onSubmit, nodes } = await editAndSave(event, { name: "Gym class" });
  const style = field(nodes, "mirrorStyle")!;
  expect(style.props.value).toBe("__mixed");
  const items = [style.props.children].flat(2).filter(Boolean) as Node[];
  expect(items.map((i) => i.props.title)).toEqual(["Mixed", "Calendar default", "Full details", "Private", "Busy"]);
  expect(onSubmit).toHaveBeenCalledWith({ op: "update", id: "id", name: "Gym class" });

  mock.hookValues = [];
  const shared = await editAndSave({ ...event, mirrorStyles: { home: "busy", side: "busy" } }, {});
  const sharedStyle = field(shared.nodes, "mirrorStyle")!;
  expect(sharedStyle.props.value).toBe("busy");
  expect(([sharedStyle.props.children].flat(2).filter(Boolean) as Node[]).map((i) => i.props.title)).not.toContain(
    "Mixed",
  );
});

it("clears the styles with {} when the user picks the calendar default", async () => {
  const event = {
    ...at,
    id: "id",
    name: "Gym",
    calendarId: "work",
    mirrorCalendarIds: ["home", "gone"],
    mirrorStyles: { home: "busy" as const, gone: "private" as const },
  };
  const { onSubmit } = await editAndSave(event, {}, (nodes) =>
    (field(nodes, "mirrorStyle")!.props.onChange as (v: string) => void)(""),
  );
  // "gone" is not writable, so the picker cannot show it; its style stays.
  expect(onSubmit).toHaveBeenCalledWith({ op: "update", id: "id", mirrorStyles: { gone: "private" } });
});

it("asks for the whole series before a style change on a recurring block", async () => {
  const event = {
    ...at,
    id: "series@2026-09-21",
    name: "Gym",
    calendarId: "work",
    mirrorCalendarIds: ["home"],
  };
  const { onSubmit } = await editAndSave(event, { scope: "this" }, (nodes) =>
    (field(nodes, "mirrorStyle")!.props.onChange as (v: string) => void)("busy"),
  );
  expect(onSubmit).not.toHaveBeenCalled();
  expect(mock.toast).toHaveBeenCalledWith(
    expect.objectContaining({ title: "A calendar change covers the whole series" }),
  );

  mock.hookValues = [];
  mock.toast.mockReset();
  const all = await editAndSave(event, { scope: "all" }, (nodes) =>
    (field(nodes, "mirrorStyle")!.props.onChange as (v: string) => void)("busy"),
  );
  expect(mock.toast).not.toHaveBeenCalled();
  expect(all.onSubmit).toHaveBeenCalledWith({ op: "update", id: "series", mirrorStyles: { home: "busy" } });
});

it("sends no style with an unlink", async () => {
  const event = {
    ...at,
    id: "id",
    name: "Gym",
    calendarId: "work",
    mirrorCalendarIds: ["home"],
    mirrorStyles: { home: "busy" as const },
  };
  const { onSubmit } = await editAndSave(event, {}, (nodes) =>
    (field(nodes, "calendarId")!.props.onChange as (v: string) => void)("__none"),
  );
  expect(onSubmit).toHaveBeenCalledWith({ op: "update", id: "id", calendarId: null });
});
