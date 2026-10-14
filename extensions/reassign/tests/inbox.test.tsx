import { beforeEach, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

const mock = vi.hoisted(() => ({
  data: {
    ok: true,
    data: {
      backlog: [{ id: "a", name: "Read paper", durationMinutes: 120, plannedDate: "2026-09-23" }],
      areas: [],
      activityTypes: [],
      now: "2026-09-22T10:00",
      timezone: "UTC",
    },
  } as {
    ok: boolean;
    code?: string;
    message?: string;
    data?: {
      backlog: {
        id: string;
        name: string;
        durationMinutes?: number;
        plannedDate?: string;
        projectId?: string | null;
        priority?: number;
      }[];
      areas: never[];
      activityTypes: never[];
      projects?: { id: string; name: string; areaId: string | null; archived?: true }[];
      now: string;
      timezone: string;
    };
  },
  // Overrides of the component state, by the order of the useState calls.
  states: {} as Record<number, unknown>,
  stateCall: 0,
  cacheArgs: [] as unknown[],
  revalidate: vi.fn(),
  manage: vi.fn(),
  toast: {} as { style?: string; title?: string; message?: string; primaryAction?: unknown },
  launch: vi.fn(),
  effects: [] as (() => void)[],
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: (v: unknown) => {
    const i = mock.stateCall++;
    return [i in mock.states ? mock.states[i] : v, vi.fn()];
  },
  useRef: (v: unknown) => ({ current: v }),
  useEffect: (fn: () => void) => {
    mock.effects.push(fn);
  },
}));

vi.mock("@raycast/api", () => ({
  Action: Object.assign("Action", {
    Push: "Action.Push",
    OpenInBrowser: "Action.OpenInBrowser",
    Style: { Destructive: "destructive" },
  }),
  ActionPanel: Object.assign("ActionPanel", { Section: "ActionPanel.Section", Submenu: "ActionPanel.Submenu" }),
  List: Object.assign("List", {
    EmptyView: "List.EmptyView",
    Dropdown: Object.assign("List.Dropdown", { Item: "List.Dropdown.Item" }),
    Item: Object.assign("ListItem", {
      Detail: Object.assign("ListItem.Detail", {
        Metadata: Object.assign("ListItem.Detail.Metadata", {
          Label: "ListItem.Detail.Metadata.Label",
          TagList: Object.assign("ListItem.Detail.Metadata.TagList", {
            Item: "ListItem.Detail.Metadata.TagList.Item",
          }),
        }),
      }),
    }),
  }),
  Icon: { Flag: "flag" },
  Color: { Blue: "blue", Yellow: "yellow", Orange: "orange", Red: "red" },
  Keyboard: { Shortcut: { Common: {} } },
  launchCommand: mock.launch,
  LaunchType: { UserInitiated: "user" },
  showToast: async () => mock.toast,
  Toast: { Style: { Failure: "failure", Success: "success", Animated: "animated" } },
}));

vi.mock("@raycast/utils", () => ({
  useCachedPromise: (_fn: unknown, args: unknown[]) => {
    mock.cacheArgs = args;
    return { data: mock.data, isLoading: false, revalidate: mock.revalidate };
  },
  withAccessToken: () => (component: unknown) => component,
}));

vi.mock("../src/lib/oauth", () => ({ reassignProvider: {}, signIn: vi.fn() }));
vi.mock("../src/lib/api", () => ({ getScheduleWithBacklog: vi.fn(), manageBacklog: mock.manage }));
vi.mock("../src/lib/wire", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/wire")>()),
  WEB_BASE: "https://reassign.app",
  PLAN_URL: "https://reassign.app/settings/plan",
}));
vi.mock("../src/components/agenda-actions", () => ({ AgendaNavActions: "AgendaNavActions" }));
vi.mock("../src/components/backlog-schedule-form", () => ({ BacklogScheduleForm: "BacklogScheduleForm" }));

import InboxCommand from "../src/inbox";

// The order of the useState calls in Command.
const SHOWING_DETAIL = 0;
const MIN_PRIORITY = 1;

/** Render the command once. Each render starts the useState call order again. */
function render() {
  mock.stateCall = 0;
  return InboxCommand({});
}

type Node = ReactElement<{
  title?: string;
  children?: unknown;
  actions?: unknown;
  onAction?: () => Promise<void>;
  target?: ReactElement<{ onSubmit?: (date: string, start: string) => Promise<boolean> }>;
}>;

/** Walk a synthetic Raycast element tree (resolving a function-component root once) and return the first node whose `props.title` equals `title`. */
function findByTitle(root: unknown, title: string): Node | undefined {
  const seen: Node[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object" || !("props" in value)) return;
    const node = value as Node;
    seen.push(node);
    visit(node.props.children);
    visit(node.props.actions);
  };
  const rootEl = root as { type?: unknown; props?: unknown } | null;
  const resolved =
    rootEl && typeof rootEl.type === "function" && rootEl.props
      ? (rootEl.type as (p: unknown) => unknown)(rootEl.props)
      : root;
  visit(resolved);
  return seen.find((n) => n.props?.title === title);
}

beforeEach(() => {
  mock.data = {
    ok: true,
    data: {
      backlog: [{ id: "a", name: "Read paper", durationMinutes: 120, plannedDate: "2026-09-23" }],
      areas: [],
      activityTypes: [],
      now: "2026-09-22T10:00",
      timezone: "UTC",
    },
  };
  mock.states = {};
  mock.cacheArgs = [];
  mock.revalidate.mockReset();
  mock.manage.mockReset();
  mock.toast = {};
  mock.effects = [];
  mock.launch.mockReset();
});

it("Remove Idea revalidates after a successful remove", async () => {
  mock.manage.mockResolvedValueOnce({ ok: true, data: { results: [{ index: 0, status: "ok" }] } });
  const tree = render();
  await findByTitle(tree, "Remove Idea")!.props.onAction!();
  expect(mock.revalidate).toHaveBeenCalledTimes(1);
});

it("Remove Idea keeps the inbox list visible after a failed network remove (fix)", async () => {
  mock.manage.mockResolvedValueOnce({ ok: false, code: "network", message: "offline" });
  const before = render();
  expect(findByTitle(before, "Read paper")).toBeDefined();
  await findByTitle(before, "Remove Idea")!.props.onAction!();
  expect(mock.revalidate).not.toHaveBeenCalled();
  const after = render();
  expect(findByTitle(after, "Read paper")).toBeDefined();
  expect(findByTitle(after, "Could not load your plan")).toBeUndefined();
});

it("Remove Idea does not revalidate when the server rejects the batch", async () => {
  mock.manage.mockResolvedValueOnce({
    ok: true,
    data: { results: [{ index: 0, status: "error", error: { code: "not_found", message: "Gone" } }] },
  });
  const tree = render();
  await findByTitle(tree, "Remove Idea")!.props.onAction!();
  expect(mock.revalidate).not.toHaveBeenCalled();
});

const PROJECTS = [
  { id: "p1", name: "Launch", areaId: "work" },
  { id: "p2", name: "Old site", areaId: null, archived: true as const },
];

/** Set the one Inbox item and the projects of the mock response. */
function withItem(item: Record<string, unknown>, projects?: typeof PROJECTS) {
  mock.data.data!.backlog = [{ id: "a", name: "Read paper", ...item }];
  if (projects) mock.data.data!.projects = projects;
}

/** The text of each metadata label in the detail pane of the "Read paper" row. */
function detailLabels(): Record<string, string> {
  const row = findByTitle(render(), "Read paper") as unknown as ReactElement<{ detail: ReactElement }>;
  const detail = row.props.detail as ReactElement<object> & { type: (p: object) => ReactElement };
  const pane = detail.type(detail.props) as ReactElement<{ metadata: ReactElement<{ children: unknown[] }> }>;
  const labels: Record<string, string> = {};
  for (const child of pane.props.metadata.props.children) {
    const node = child as ReactElement<{ title?: string; text?: string }> | null;
    if (node?.props.text !== undefined && node.props.title) labels[node.props.title] = node.props.text;
  }
  return labels;
}

it("shows the priority label and the project name of an item", () => {
  withItem({ priority: 3, projectId: "p1" }, PROJECTS);
  expect(detailLabels()).toMatchObject({ Priority: "High", Project: "Launch" });
});

it("marks an archived project", () => {
  withItem({ priority: 0, projectId: "p2" }, PROJECTS);
  expect(detailLabels()).toMatchObject({ Project: "Old site (archived)" });
});

it("shows no priority for 0 or an absent key, and renders an old response without the keys", () => {
  withItem({ priority: 0 }, PROJECTS);
  expect(detailLabels()).not.toHaveProperty("Priority");
  withItem({});
  delete mock.data.data!.projects;
  const labels = detailLabels();
  expect(labels).not.toHaveProperty("Priority");
  expect(labels).not.toHaveProperty("Project");
  expect(findByTitle(render(), "Read paper")).toBeDefined();
});

/** The accessories of the "Read paper" row, with the detail pane off. */
function rowAccessories(): { icon?: unknown; text?: string; tag?: unknown }[] {
  mock.states[SHOWING_DETAIL] = false;
  const row = findByTitle(render(), "Read paper") as unknown as ReactElement<{ accessories: [] }>;
  return row.props.accessories;
}

it("shows a flag in the priority color and the project tag in the row", () => {
  withItem({ priority: 3, projectId: "p1" }, PROJECTS);
  expect(rowAccessories()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ icon: { source: "flag", tintColor: "orange" }, text: "High" }),
      expect.objectContaining({ tag: "Launch" }),
    ]),
  );
});

it("shows no flag in the row for priority 0 or an absent key", () => {
  const hasFlag = () => rowAccessories().some((a) => JSON.stringify(a.icon ?? null).includes("flag"));
  withItem({ priority: 0 }, PROJECTS);
  expect(hasFlag()).toBe(false);
  withItem({}, PROJECTS);
  expect(hasFlag()).toBe(false);
});

it("passes the priority filter value to the Inbox read", () => {
  render();
  expect(mock.cacheArgs[1]).toBe(0);
  mock.states[MIN_PRIORITY] = "3";
  const list = render() as ReactElement<{ searchBarAccessory: unknown }>;
  expect(mock.cacheArgs[1]).toBe(3);
  expect(findByTitle(list.props.searchBarAccessory, "High+")).toBeDefined();
  expect(findByTitle(list.props.searchBarAccessory, "All")).toBeDefined();
});

it("No Priority sends priority 0 and no other key", async () => {
  withItem({ priority: 2 }, PROJECTS);
  mock.manage.mockResolvedValueOnce({ ok: true, data: { results: [{ index: 0, status: "ok" }] } });
  await findByTitle(render(), "No Priority")!.props.onAction!();
  expect(mock.manage).toHaveBeenCalledWith([{ op: "update", id: "a", priority: 0 }]);
  expect(mock.revalidate).toHaveBeenCalledTimes(1);
});

it("No Project sends projectId null", async () => {
  withItem({ projectId: "p1" }, PROJECTS);
  mock.manage.mockResolvedValueOnce({ ok: true, data: { results: [{ index: 0, status: "ok" }] } });
  await findByTitle(render(), "No Project")!.props.onAction!();
  expect(mock.manage).toHaveBeenCalledWith([{ op: "update", id: "a", projectId: null }]);
});

it("a new project sends no areaId, and an archived project is not offered", async () => {
  withItem({}, PROJECTS);
  mock.manage.mockResolvedValueOnce({ ok: true, data: { results: [{ index: 0, status: "ok" }] } });
  const tree = render();
  expect(findByTitle(tree, "Old site")).toBeUndefined();
  await findByTitle(tree, "Launch")!.props.onAction!();
  expect(mock.manage).toHaveBeenCalledWith([{ op: "update", id: "a", projectId: "p1" }]);
});

it("a not_found row shows a failure toast and does not revalidate", async () => {
  withItem({}, PROJECTS);
  mock.manage.mockResolvedValueOnce({
    ok: true,
    data: {
      results: [{ index: 0, status: "error", error: { code: "not_found", message: 'No live project with id "p1".' } }],
    },
  });
  await findByTitle(render(), "Launch")!.props.onAction!();
  expect(mock.toast).toMatchObject({ style: "failure", message: 'No live project with id "p1".' });
  expect(mock.revalidate).not.toHaveBeenCalled();
});

it("a read_only row on Set Project shows the server reason", async () => {
  withItem({}, PROJECTS);
  const reason = 'This project has 2 or more Todoist lists. Set "New tasks go to" in project settings.';
  mock.manage.mockResolvedValueOnce({
    ok: true,
    data: { results: [{ index: 0, status: "error", error: { code: "read_only", message: reason } }] },
  });
  await findByTitle(render(), "Launch")!.props.onAction!();
  expect(mock.toast).toMatchObject({ style: "failure", message: reason });
  expect(mock.revalidate).not.toHaveBeenCalled();
});

it("does not write when the chosen priority is the current one", async () => {
  withItem({ priority: 4 }, PROJECTS);
  await findByTitle(render(), "Urgent")!.props.onAction?.();
  expect(mock.manage).not.toHaveBeenCalled();
});

it("offers Show All Ideas when a filtered read fails, and not without a filter", () => {
  mock.data = { ok: false, code: "internal", message: "Boom" };
  const plain = render() as ReactElement<{ extraActions?: unknown }>;
  expect(plain.props.extraActions).toBeUndefined();
  mock.states[MIN_PRIORITY] = "3";
  const filtered = render() as ReactElement<{ extraActions?: ReactElement<{ title?: string }> }>;
  expect(filtered.props.extraActions?.props.title).toBe("Show All Ideas");
});
