import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

// The persisted kind-toggle scenario is the gap that let the bug ship: the
// sibling agenda-day suite mocks useLocalStorage with its initial value, so
// hideNonBlocking / hideReference are always false there. Seed them per key.
const mock = vi.hoisted(() => ({ data: undefined as unknown as { ok: true; data: ScheduleResponse }, loading: false }));
const storage = vi.hoisted(() => ({ hideNonBlocking: false, hideReference: false }));
vi.mock("react", () => ({
  useState: (initial: unknown) => [initial, vi.fn()],
  useRef: (initial: unknown) => ({ current: initial }),
  useEffect: () => {},
}));
vi.mock("@raycast/api", () => ({
  Action: Object.assign(() => null, { Push: "Push", OpenInBrowser: "OpenInBrowser" }),
  ActionPanel: Object.assign(() => null, { Section: "ActionSection" }),
  List: Object.assign(() => null, { Section: "Section", EmptyView: "EmptyView" }),
  Icon: {},
  LaunchType: {},
  launchCommand: vi.fn(),
}));
vi.mock("@raycast/utils", () => ({
  withAccessToken: () => (component: unknown) => component,
  useLocalStorage: (key: string, initial: unknown) => {
    if (key === "agenda.hideNonBlocking") return { value: storage.hideNonBlocking, setValue: vi.fn() };
    if (key === "agenda.hideReference") return { value: storage.hideReference, setValue: vi.fn() };
    return { value: initial, setValue: vi.fn() };
  },
  useCachedPromise: () => ({ data: mock.data, isLoading: mock.loading, revalidate: vi.fn(), mutate: vi.fn() }),
}));
vi.mock("../src/components/agenda-actions", () => ({
  AgendaActions: "AgendaActions",
  AgendaNavActions: "AgendaNavActions",
  useAgendaMutations: () => ({}),
}));
vi.mock("../src/components/agenda-item", () => ({ AgendaItem: "AgendaItem" }));
vi.mock("../src/components/calendar-fields", () => ({ useCalendars: () => ({ calendars: [], defaultId: undefined }) }));
vi.mock("../src/components/search-view", () => ({ SearchView: "SearchView" }));
vi.mock("../src/components/states", () => ({ refusalView: () => null }));
vi.mock("../src/lib/oauth", () => ({ reassignProvider: {} }));
vi.mock("../src/lib/api", () => ({ getSchedule: vi.fn(), getScheduleRange: vi.fn() }));

import Agenda from "../src/agenda";
import { todayISO, toLocalDateTime } from "../src/lib/format";
import type { ScheduleResponse } from "../src/lib/schedule-model";

const today = () => todayISO();

type Node = ReactElement<{
  children?: unknown;
  actions?: unknown;
  title?: string;
  description?: string;
  isLoading?: boolean;
}>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const node = value as Node;
  return [node, ...nodes(node.props.children), ...nodes(node.props.actions)];
}
function render() {
  const element = Agenda({}) as ReactElement;
  return nodes((element.type as (props: unknown) => unknown)(element.props));
}
function emptyView(tree: Node[]) {
  return tree.find((node) => node.type === "EmptyView");
}
function hasAction(tree: Node[], title: string) {
  return tree.some(
    (node) => typeof node === "object" && node !== null && "props" in node && node.props?.title === title,
  );
}

// Pin the device clock, so a run across local midnight cannot split "today".
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 22, 10, 0));
  mock.loading = false;
  storage.hideNonBlocking = false;
  storage.hideReference = false;
  mock.data = {
    ok: true,
    data: { now: toLocalDateTime(new Date()), timezone: "UTC", days: [], areas: [], activityTypes: [] },
  };
});
afterEach(() => {
  vi.useRealTimers();
});

it("empty day with a persisted kind toggle shows 'Nothing planned', not 'No blocks match'", () => {
  mock.data.data.days = [{ date: today(), events: [] }];
  storage.hideNonBlocking = true;
  const tree = render();
  expect(emptyView(tree)?.props.title).toBe("Nothing planned");
  expect(emptyView(tree)?.props.description).toBe("You have no blocks for today.");
  expect(hasAction(tree, "Clear Filter")).toBe(false);
});

it("a day whose only event is hidden by the toggle still shows 'No blocks match'", () => {
  mock.data.data.days = [
    {
      date: today(),
      events: [{ id: "e1", start: `${today()}T09:00`, end: `${today()}T10:00`, kind: "non_blocking", name: "Lunch" }],
    },
  ];
  storage.hideNonBlocking = true;
  const tree = render();
  expect(emptyView(tree)?.props.title).toBe("No blocks match");
  expect(hasAction(tree, "Clear Filter")).toBe(true);
});

it("absent date with a persisted kind toggle shows 'Nothing planned'", () => {
  mock.data.data.days = [];
  storage.hideNonBlocking = true;
  const tree = render();
  expect(emptyView(tree)?.props.title).toBe("Nothing planned");
  expect(hasAction(tree, "Clear Filter")).toBe(false);
});

it("a present day with a visible blocking event renders no EmptyView", () => {
  mock.data.data.days = [
    {
      date: today(),
      events: [{ id: "e1", start: `${today()}T09:00`, end: `${today()}T10:00`, kind: "blocking", name: "Standup" }],
    },
  ];
  const tree = render();
  expect(emptyView(tree)).toBeUndefined();
});
