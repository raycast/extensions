import { beforeEach, expect, it, vi } from "vitest";

// These tests render the signed-in menu bar against the real `buildMenuBarModel`.
// The menu bar shows only today, and the server refuses a reflect on today
// (Reassign #1330), so the bar must not offer a check-off.

const mock = vi.hoisted(() => ({
  schedule: {
    timezone: "UTC",
    now: "2026-09-22T10:30",
    days: [
      {
        date: "2026-09-22",
        events: [{ id: "block-1", start: "2026-09-22T10:00", end: "2026-09-22T11:00", name: "Deep work" }],
      },
    ],
    areas: [],
    activityTypes: [],
  },
  data: undefined as unknown,
  isLoading: false,
  revalidate: vi.fn(),
  hud: vi.fn(),
  result: { ok: true, data: { results: [{ index: 0, status: "ok" }] } } as unknown,
  launch: vi.fn(),
  open: vi.fn(),
  openCommandPreferences: vi.fn(),
  prefs: { showBlockName: false, notifyTransitions: false },
  slots: [] as unknown[],
  cursor: 0,
  effects: [] as (() => void)[],
  notify: vi.fn(async () => {}),
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  // No React renderer commits. State keeps its slot across calls, and a test
  // flushes the collected effects when it needs them.
  useState: (initial: unknown) => {
    const slot = mock.cursor++;
    if (!(slot in mock.slots)) mock.slots[slot] = initial;
    return [
      mock.slots[slot],
      (next: unknown) => {
        mock.slots[slot] = next;
      },
    ];
  },
  useEffect: (fn: () => void) => {
    mock.effects.push(fn);
  },
}));

vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => mock.prefs,
  MenuBarExtra: Object.assign("MenuBarExtra", { Item: "MenuItem", Section: "MenuSection" }),
  launchCommand: mock.launch,
  LaunchType: { UserInitiated: "user" },
  showHUD: mock.hud,
  open: mock.open,
  openCommandPreferences: mock.openCommandPreferences,
  Icon: {},
  Color: {},
}));

vi.mock("@raycast/utils", () => ({
  useCachedPromise: () => ({ data: mock.data, isLoading: mock.isLoading, revalidate: mock.revalidate }),
}));

vi.mock("../src/lib/api", () => ({
  getScheduleRange: vi.fn(),
  writeEvents: vi.fn(async () => mock.result),
}));

vi.mock("../src/lib/oauth", () => ({ signOut: vi.fn() }));
vi.mock("../src/lib/notify", () => ({ maybeNotifyTransitions: mock.notify }));

import { writeEvents } from "../src/lib/api";
import NowCommand from "../src/now";

// `envelope.ts`, `schedule-model.ts`, `format.ts`, and `wire.ts` stay real, so
// `buildMenuBarModel` and `nowWallClock` run the same code path as the menu bar.

/** Find an element by its `title` prop, recursing through fragments/sections. */
function findByTitle(node: unknown, title: string): { props: { onAction?: () => unknown } } | undefined {
  if (node === null || node === undefined || typeof node !== "object") return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByTitle(child, title);
      if (found) return found;
    }
    return undefined;
  }
  const n = node as { props?: { title?: string; children?: unknown } };
  if (n.props?.title === title) return n as { props: { onAction?: () => unknown } };
  if (n.props?.children !== undefined) return findByTitle(n.props.children, title);
  return undefined;
}

/** Render the command with fresh hook slots for this call, then flush its effects. */
function renderNow() {
  mock.cursor = 0;
  mock.effects = [];
  const tree = NowCommand() as unknown as { props: { isLoading?: boolean } };
  mock.effects.forEach((fn) => fn());
  return tree;
}

beforeEach(() => {
  mock.prefs = { showBlockName: false, notifyTransitions: false };
  mock.slots = [];
  mock.cursor = 0;
  mock.effects = [];
  mock.notify.mockReset();
  mock.notify.mockImplementation(async () => {});
  mock.data = { ok: true, data: mock.schedule };
  mock.isLoading = false;
  mock.result = { ok: true, data: { results: [{ index: 0, status: "ok" }] } };
  mock.hud.mockClear();
  mock.revalidate.mockClear();
  mock.launch.mockClear();
  mock.open.mockClear();
  (writeEvents as ReturnType<typeof vi.fn>).mockClear();
});

/** Collect every `title` prop in the tree, through fragments and sections. */
function allTitles(node: unknown, out: string[] = []): string[] {
  if (node === null || node === undefined || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    node.forEach((child) => allTitles(child, out));
    return out;
  }
  const n = node as { props?: { title?: string; children?: unknown } };
  if (typeof n.props?.title === "string") out.push(n.props.title);
  if (n.props?.children !== undefined) allTitles(n.props.children, out);
  return out;
}

it("shows the current block without check-off items", () => {
  const titles = allTitles(renderNow());
  expect(titles).toContain("Deep work");
  expect(titles).toContain("Open in Reassign");
  expect(titles).not.toContain("Check off Kept");
  expect(titles).not.toContain("Check off Skipped");
});

it("does not send a reflect from any menu item", async () => {
  const tree = renderNow();
  // Run every item. The mocks keep each side effect local.
  for (const title of allTitles(tree)) {
    await findByTitle(tree, title)?.props.onAction?.();
  }
  expect(writeEvents).not.toHaveBeenCalled();
});

it("keeps the menu bar loading until the notify work completes", async () => {
  mock.prefs.notifyTransitions = true;
  let finish!: () => void;
  mock.notify.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
  // Raycast unloads a menu-bar command when isLoading is false, so it must stay true here.
  expect(renderNow().props.isLoading).toBe(true);
  expect(mock.notify).toHaveBeenCalledWith(mock.schedule);
  finish();
  await Promise.resolve();
  await Promise.resolve();
  expect(renderNow().props.isLoading).toBe(false);
  expect(mock.notify).toHaveBeenCalledTimes(1);
});

it("does not notify on the cached payload while the fetch runs", () => {
  mock.prefs.notifyTransitions = true;
  mock.isLoading = true;
  renderNow();
  expect(mock.notify).not.toHaveBeenCalled();
});
