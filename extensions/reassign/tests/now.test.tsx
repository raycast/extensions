import { beforeEach, expect, it, vi } from "vitest";

// `src/now.tsx`'s signed-in `reflectCurrent` path had no direct coverage: the
// only existing Now test (`tests/forms.test.tsx`) hardcodes a signed-out
// `useCachedPromise` and never reaches "Check off Kept" / "Check off Skipped".
// These tests render the signed-in menu bar against the real `buildMenuBarModel`
// and the real `batchFailure` / `rowError`, driving `writeEvents` through a
// configurable `mock.result` so every 2xx-batch / non-2xx outcome is exercised.
// The failing-is-a-row contract that `batchFailure` encodes is the exact
// footgun this guards against (a 2xx with an `error`-status row must not read
// as success even when the row's optional `error` object is absent).

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
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  // No React renderer commits, so a real useEffect would never flush; the only
  // effect here is the block-transition notification, which these tests skip.
  useEffect: () => {},
}));

vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({ showBlockName: false, notifyTransitions: false }),
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
vi.mock("../src/lib/notify", () => ({ maybeNotifyTransitions: vi.fn() }));

import { writeEvents } from "../src/lib/api";
import NowCommand from "../src/now";

// `envelope.ts`, `schedule-model.ts`, `format.ts`, and `wire.ts` stay real, so
// `buildMenuBarModel`, `nowWallClock`, `batchFailure`, and `rowError` are
// exercised by the same code path the menu bar runs.

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

beforeEach(() => {
  mock.data = { ok: true, data: mock.schedule };
  mock.isLoading = false;
  mock.result = { ok: true, data: { results: [{ index: 0, status: "ok" }] } };
  mock.hud.mockClear();
  mock.revalidate.mockClear();
  mock.launch.mockClear();
  mock.open.mockClear();
  (writeEvents as ReturnType<typeof vi.fn>).mockClear();
});

it.each([
  ["kept", "Checked off the block"],
  ["skipped", "Marked the block skipped"],
])(
  "on a 2xx with an ok row, %s shows the success HUD, sends the reflect op, and revalidates",
  async (status, successHud) => {
    mock.result = { ok: true, data: { results: [{ index: 0, status: "ok" }] } };
    const tree = NowCommand();
    await findByTitle(tree, status === "kept" ? "Check off Kept" : "Check off Skipped")!.props.onAction!();
    expect(writeEvents).toHaveBeenCalledWith([{ op: "reflect", id: "block-1", status }]);
    expect(mock.hud).toHaveBeenCalledWith(successHud);
    expect(mock.revalidate).toHaveBeenCalledTimes(1);
  },
);

it("on a 2xx with a rejected row carrying `error`, shows the server message and does not revalidate", async () => {
  mock.result = { ok: true, data: { results: [{ index: 0, status: "error", error: { code: "conflict", message: "Time occupied" } }] } };
  await findByTitle(NowCommand(), "Check off Kept")!.props.onAction!();
  expect(mock.hud).toHaveBeenCalledWith("Could not update the block: Time occupied");
  expect(mock.revalidate).not.toHaveBeenCalled();
});

it("on a 2xx with a rejected row MISSING `error`, does NOT report a false success and does not revalidate", async () => {
  // Regression: 7229304 narrowed on `row.error`, so `{ status: "error" }` read as success.
  mock.result = { ok: true, data: { results: [{ index: 0, status: "error" }] } };
  await findByTitle(NowCommand(), "Check off Kept")!.props.onAction!();
  expect(mock.hud).toHaveBeenCalledWith("Could not update the block: The server rejected the change.");
  expect(mock.hud).not.toHaveBeenCalledWith("Checked off the block");
  expect(mock.revalidate).not.toHaveBeenCalled();
});

it("on a non-2xx ApiError, shows the request message and does not revalidate", async () => {
  mock.result = { ok: false, code: "network", message: "offline" };
  await findByTitle(NowCommand(), "Check off Kept")!.props.onAction!();
  expect(mock.hud).toHaveBeenCalledWith("Could not update the block: offline");
  expect(mock.revalidate).not.toHaveBeenCalled();
});
