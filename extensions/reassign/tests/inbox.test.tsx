import { beforeEach, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

const mock = vi.hoisted(() => ({
  data: {
    ok: true,
    data: {
      backlog: [{ id: "a", name: "Read paper", durationHours: 2, plannedDate: "2026-09-23" }],
      areas: [],
      activityTypes: [],
      now: { todayIso: "2026-09-22" },
    },
  } as {
    ok: boolean;
    code?: string;
    message?: string;
    data?: {
      backlog: { id: string; name: string; durationHours?: number; plannedDate?: string }[];
      areas: never[];
      activityTypes: never[];
      now: { todayIso: string };
    };
  },
  revalidate: vi.fn(),
  manage: vi.fn(),
  toast: {} as { style?: string; title?: string; message?: string; primaryAction?: unknown },
  launch: vi.fn(),
  effects: [] as (() => void)[],
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: (v: unknown) => [v, vi.fn()],
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
  ActionPanel: Object.assign("ActionPanel", { Section: "ActionPanel.Section" }),
  List: Object.assign("List", {
    EmptyView: "List.EmptyView",
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
  Icon: {},
  Color: {},
  Keyboard: { Shortcut: { Common: {} } },
  launchCommand: mock.launch,
  LaunchType: { UserInitiated: "user" },
  showToast: async () => mock.toast,
  Toast: { Style: { Failure: "failure", Success: "success", Animated: "animated" } },
}));

vi.mock("@raycast/utils", () => ({
  useCachedPromise: () => ({ data: mock.data, isLoading: false, revalidate: mock.revalidate }),
  withAccessToken: () => (component: unknown) => component,
}));

vi.mock("../src/lib/oauth", () => ({ reassignProvider: {}, signIn: vi.fn() }));
vi.mock("../src/lib/api", () => ({ getScheduleWithBacklog: vi.fn(), manageBacklog: mock.manage }));
vi.mock("../src/lib/wire", () => ({ WEB_BASE: "https://reassign.app", BILLING_URL: "https://reassign.app/billing" }));
vi.mock("../src/components/agenda-actions", () => ({ AgendaNavActions: "AgendaNavActions" }));
vi.mock("../src/components/backlog-schedule-form", () => ({ BacklogScheduleForm: "BacklogScheduleForm" }));

import InboxCommand from "../src/inbox";

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
      backlog: [{ id: "a", name: "Read paper", durationHours: 2, plannedDate: "2026-09-23" }],
      areas: [],
      activityTypes: [],
      now: { todayIso: "2026-09-22" },
    },
  };
  mock.revalidate.mockReset();
  mock.manage.mockReset();
  mock.toast = {};
  mock.effects = [];
  mock.launch.mockReset();
});

it("Remove Idea revalidates after a successful remove", async () => {
  mock.manage.mockResolvedValueOnce({ ok: true, data: { failed: 0 } });
  const tree = InboxCommand();
  await findByTitle(tree, "Remove Idea")!.props.onAction!();
  expect(mock.revalidate).toHaveBeenCalledTimes(1);
});

it("Remove Idea keeps the inbox list visible after a failed network remove (fix)", async () => {
  mock.manage.mockResolvedValueOnce({ ok: false, code: "network", message: "offline" });
  const before = InboxCommand();
  expect(findByTitle(before, "Read paper")).toBeDefined();
  await findByTitle(before, "Remove Idea")!.props.onAction!();
  expect(mock.revalidate).not.toHaveBeenCalled();
  const after = InboxCommand();
  expect(findByTitle(after, "Read paper")).toBeDefined();
  expect(findByTitle(after, "Could not load your plan")).toBeUndefined();
});

it("Remove Idea does not revalidate when the server rejects the batch", async () => {
  mock.manage.mockResolvedValueOnce({ ok: true, data: { failed: 1 } });
  const tree = InboxCommand();
  await findByTitle(tree, "Remove Idea")!.props.onAction!();
  expect(mock.revalidate).not.toHaveBeenCalled();
});
