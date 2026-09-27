// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTimer: vi.fn(),
  getSummary: vi.fn(),
  pending: vi.fn(),
  execute: vi.fn(),
  cachedTimer: vi.fn(),
  cachedSummary: vi.fn(),
  mode: "timer",
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}
vi.mock("./session", () => ({
  session: () => ({
    ...mocks,
    api: mocks,
    cached: { timer: mocks.cachedTimer, summary: mocks.cachedSummary },
    baseUrl: "https://tracktimer.app",
  }),
}));
vi.mock("@raycast/api", () => {
  const Container = ({ children }: { children?: ReactNode }) =>
    createElement("div", null, children);
  return {
    MenuBarExtra: Object.assign(
      ({ title, children }: { title: string; children?: ReactNode }) =>
        createElement("div", null, createElement("output", null, title), children),
      {
        Section: Container,
        Item: ({ title, onAction }: { title: string; onAction?: () => void }) =>
          createElement("button", { type: "button", onClick: onAction }, title),
      },
    ),
    Icon: {},
    LaunchType: {},
    Toast: { Style: {} },
    getPreferenceValues: () => ({ displayMode: mocks.mode }),
    LocalStorage: { setItem: vi.fn() },
    launchCommand: vi.fn(),
    open: vi.fn(),
    openCommandPreferences: vi.fn(),
    showToast: vi.fn(),
  };
});

import Command from "./menu-bar";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.mode = "timer";
  mocks.getTimer.mockResolvedValue({ id: "active", projectName: "Project", elapsedSeconds: 125 });
  mocks.getSummary.mockResolvedValue({
    trackedSeconds: 7200,
    earnings: [
      { currency: "USD", amount: "100.00" },
      { currency: "EUR", amount: "25.00" },
    ],
  });
  mocks.pending.mockResolvedValue(null);
  mocks.cachedTimer.mockReturnValue(undefined);
  mocks.cachedSummary.mockReturnValue(undefined);
});
afterEach(cleanup);
it("shows minute-level active time and stops the current timer", async () => {
  render(createElement(Command));
  await waitFor(() => expect(screen.getByRole("status").textContent).toBe("2m"));
  fireEvent.click(screen.getByText("Stop Timer"));
  await waitFor(() => expect(mocks.execute).toHaveBeenCalledWith("/timers/active/stop"));
});
it("falls back to today's time when idle", async () => {
  mocks.getTimer.mockResolvedValue(null);
  render(createElement(Command));
  await waitFor(() => expect(screen.getByRole("status").textContent).toBe("2h 0m"));
});
it("shows today's time even when a timer is active", async () => {
  mocks.mode = "today";
  render(createElement(Command));
  await waitFor(() => expect(screen.getByRole("status").textContent).toBe("2h 0m"));
});
it("keeps currencies separate in earnings mode", async () => {
  mocks.mode = "earnings";
  render(createElement(Command));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("100.00"));
  expect(screen.getByRole("status").textContent).toContain("25.00");
});
it("does not offer stop when an uncertain action needs resolution", async () => {
  mocks.pending.mockResolvedValue({ id: "pending" });
  render(createElement(Command));
  await screen.findByText("Resolve Pending Timer Action…");
  expect(screen.queryByText("Stop Timer")).toBeNull();
});
it("keeps the last known title during a transient refresh failure", async () => {
  render(createElement(Command));
  await screen.findByText("Stop Timer");
  mocks.getSummary.mockRejectedValue(new Error("Could not reach TrackTimer"));
  fireEvent.click(screen.getByText("Refresh"));
  await screen.findByText("Could not reach TrackTimer");
  expect(screen.getByRole("status").textContent).toBe("2m");
  expect(screen.queryByText("Stop Timer")).toBeNull();
});
it("renders cached state while the initial refresh is pending", () => {
  mocks.cachedTimer.mockReturnValue({ id: "active", projectName: "Project", elapsedSeconds: 125 });
  mocks.cachedSummary.mockReturnValue({ trackedSeconds: 7200, earnings: [] });
  mocks.getTimer.mockImplementation(() => new Promise(() => {}));
  render(createElement(Command));
  expect(screen.getByRole("status").textContent).toBe("2m");
});
it("ignores a refresh that started before the post-stop refresh", async () => {
  const active = { id: "active", projectName: "Project", elapsedSeconds: 125 };
  const staleTimer = deferred<typeof active>();
  mocks.getTimer
    .mockResolvedValueOnce(active)
    .mockImplementationOnce(() => staleTimer.promise)
    .mockResolvedValueOnce(null);

  render(createElement(Command));
  await screen.findByText("Stop Timer");

  fireEvent.click(screen.getByText("Refresh"));
  await waitFor(() => expect(mocks.getTimer).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByText("Stop Timer"));

  await waitFor(() => expect(mocks.getTimer).toHaveBeenCalledTimes(3));
  await waitFor(() => expect(screen.getByText("No running timer")).toBeTruthy());

  staleTimer.resolve(active);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(screen.queryByText("Stop Timer")).toBeNull();
});
