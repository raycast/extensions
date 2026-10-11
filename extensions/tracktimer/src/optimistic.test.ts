// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveTimer, MutationResult, TimeEntry } from "./api";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  getTimer: vi.fn(),
  getEntries: vi.fn(),
  pending: vi.fn(),
  showToast: vi.fn(),
  cachedTimer: vi.fn(),
  cachedEntries: vi.fn(),
}));
vi.mock("./session", () => ({
  session: () => ({
    ...mocks,
    baseUrl: "http://localhost:3001",
    api: mocks,
    cached: { timer: mocks.cachedTimer, entries: mocks.cachedEntries },
  }),
}));
vi.mock("./timer-form", () => ({ default: () => null }));
vi.mock("@raycast/api", () => {
  const Container = ({ children }: { children?: ReactNode }) =>
    createElement("div", null, children);
  const Action = Object.assign(
    ({ title, onAction }: { title: string; onAction?: () => void }) =>
      createElement("button", { type: "button", onClick: onAction }, title),
    { OpenInBrowser: () => null, Push: () => null },
  );
  return {
    Action,
    ActionPanel: Container,
    List: Object.assign(Container, {
      Section: ({ title, children }: { title: string; children?: ReactNode }) =>
        createElement("section", { "aria-label": title }, children),
      Item: ({
        title,
        actions,
        accessories,
      }: {
        title: string;
        actions?: ReactNode;
        accessories?: { text?: string }[];
      }) =>
        createElement("div", null, title, accessories?.map((item) => item.text).join(" "), actions),
    }),
    Icon: {},
    Color: {},
    Keyboard: { Shortcut: { Common: {} } },
    openExtensionPreferences: vi.fn(),
    showToast: mocks.showToast,
    Toast: { Style: { Success: "success", Failure: "failure" } },
  };
});

import Command from "./index";

const entry: TimeEntry = {
  id: "old",
  clientId: "client",
  clientName: "Client",
  projectId: "project",
  projectName: "Project",
  billable: true,
  note: "Recent work",
  startedAt: "2026-09-10T10:00:00.000Z",
  payRateCents: 0,
  currency: "USD",
  status: "completed",
  endedAt: "2026-09-10T11:00:00.000Z",
  durationSeconds: 3600,
  earnings: "0",
};
const active: ActiveTimer = {
  ...entry,
  id: "active",
  note: "Existing work",
  serverNow: "2026-09-10T11:00:00.000Z",
  elapsedSeconds: 60,
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.pending.mockResolvedValue(null);
  mocks.getTimer.mockResolvedValue(null);
  mocks.getEntries.mockResolvedValue({ entries: [entry], nextCursor: null });
  mocks.showToast.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe("optimistic timer actions", () => {
  it("shows a recent timer immediately, prevents duplicate starts, and reconciles the server result", async () => {
    const request = deferred<MutationResult>();
    mocks.execute.mockReturnValue(request.promise);
    render(createElement(Command));
    const start = await screen.findByRole("button", { name: "Start Timer Again" });
    act(() => {
      start.click();
      start.click();
    });
    expect(screen.getByRole("region", { name: "Running" }).textContent).toContain("Recent work");
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Stop Timer" })).toBeNull();
    const confirmed = { ...active, note: "Confirmed work", elapsedSeconds: 7 };
    mocks.getTimer.mockResolvedValue(confirmed);
    await act(async () => request.resolve({ timer: confirmed, stoppedTimerId: null }));
    expect(screen.getByRole("region", { name: "Running" }).textContent).toContain("Confirmed work");
    expect(screen.queryByRole("region", { name: "Starting…" })).toBeNull();
  });

  it("restores the previous running timer if starting fails", async () => {
    mocks.getTimer.mockResolvedValue(active);
    const request = deferred<MutationResult>();
    mocks.execute.mockReturnValue(request.promise);
    render(createElement(Command));
    fireEvent.click(await screen.findByRole("button", { name: "Start Timer Again" }));
    expect(screen.queryByText("Existing work")).toBeNull();
    await act(async () => request.reject(new Error("Start rejected")));
    expect(screen.getByRole("region", { name: "Running" }).textContent).toContain("Existing work");
    expect(mocks.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ style: "failure", message: "Start rejected" }),
    );
  });

  it("removes a stopping timer immediately and restores it on failure", async () => {
    mocks.getTimer.mockResolvedValue(active);
    const request = deferred<MutationResult>();
    mocks.execute.mockReturnValue(request.promise);
    render(createElement(Command));
    fireEvent.click(await screen.findByRole("button", { name: "Stop Timer" }));
    expect(screen.queryByRole("region", { name: "Running" })).toBeNull();
    expect(mocks.execute).toHaveBeenCalledWith("/timers/active/stop", undefined);
    await act(async () => request.reject(new Error("Stop rejected")));
    await waitFor(() =>
      expect(screen.getByRole("region", { name: "Running" }).textContent).toContain(
        "Existing work",
      ),
    );
  });
});

it("renders cached timers immediately while server requests are unresolved", () => {
  mocks.cachedTimer.mockReturnValue(active);
  mocks.cachedEntries.mockReturnValue({ entries: [entry], nextCursor: null });
  mocks.getTimer.mockReturnValue(new Promise(() => {}));
  mocks.getEntries.mockReturnValue(new Promise(() => {}));
  render(createElement(Command));
  expect(screen.getByRole("region", { name: "Running" }).textContent).toContain("Existing work");
  expect(screen.getByRole("button", { name: "Start Timer Again" })).toBeTruthy();
});

it("enables confirmed timer controls without waiting for slow history refresh", async () => {
  const request = deferred<MutationResult>();
  mocks.execute.mockReturnValue(request.promise);
  render(createElement(Command));
  fireEvent.click(await screen.findByRole("button", { name: "Start Timer Again" }));
  mocks.getEntries.mockReturnValue(new Promise(() => {}));
  mocks.getTimer.mockReturnValue(new Promise(() => {}));
  await act(async () => request.resolve({ timer: active, stoppedTimerId: null }));
  expect(screen.getByRole("button", { name: "Stop Timer" })).toBeTruthy();
  expect(screen.getByRole("region", { name: "Running" }).textContent).toContain("Existing work");
});
