import { beforeEach, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

const mock = vi.hoisted(() => ({ data: undefined as unknown, loading: false }));
vi.mock("react", () => ({ useState: (initial: unknown) => [initial, vi.fn()] }));
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
  useLocalStorage: (_key: string, initial: unknown) => ({ value: initial, setValue: vi.fn() }),
  useCachedPromise: () => ({ data: mock.data, isLoading: mock.loading, revalidate: vi.fn(), mutate: vi.fn() }),
}));
vi.mock("../src/components/agenda-actions", () => ({
  AgendaActions: "AgendaActions",
  AgendaNavActions: "AgendaNavActions",
  useAgendaMutations: () => ({}),
}));
vi.mock("../src/components/agenda-item", () => ({ AgendaItem: "AgendaItem" }));
vi.mock("../src/components/calendar-fields", () => ({ useCalendars: () => ({ calendars: [] }) }));
vi.mock("../src/components/search-view", () => ({ SearchView: "SearchView" }));
vi.mock("../src/components/states", () => ({ refusalView: () => null }));
vi.mock("../src/lib/oauth", () => ({ reassignProvider: {} }));
vi.mock("../src/lib/api", () => ({ getSchedule: vi.fn(), getScheduleRange: vi.fn() }));

import { List } from "@raycast/api";
import Agenda from "../src/agenda";
import { toLocalDateTime } from "../src/lib/format";

type Node = ReactElement<{ children?: unknown; actions?: unknown; title?: string; isLoading?: boolean }>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const node = value as Node;
  return [node, ...nodes(node.props.children), ...nodes(node.props.actions)];
}
function render() {
  const element = Agenda() as ReactElement;
  return nodes((element.type as (props: unknown) => unknown)(element.props));
}
beforeEach(() => {
  mock.loading = false;
  mock.data = {
    ok: true,
    data: {
      now: toLocalDateTime(new Date()),
      timezone: "UTC",
      days: [],
      areas: [],
      activityTypes: [],
    },
  };
});

it("keeps empty-day navigation and Add available when the response omits the requested date", () => {
  const tree = render();
  expect(tree.find((node) => node.type === "EmptyView")?.props.title).toBe("Nothing planned");
  expect(tree.some((node) => node.props.title === "Add Block…")).toBe(true);
  expect(tree.some((node) => node.props.title === "Next Day")).toBe(true);
});

it("shows only loading while an absent date is still being fetched", () => {
  mock.loading = true;
  const tree = render();
  expect(tree.find((node) => node.type === List)?.props.isLoading).toBe(true);
  expect(tree.some((node) => node.type === "EmptyView")).toBe(false);
  expect(tree.some((node) => node.type === "AgendaItem")).toBe(false);
});
