// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pending: vi.fn(),
  execute: vi.fn(),
  getTimer: vi.fn(),
  getEntries: vi.fn(),
  showToast: vi.fn(),
}));
vi.mock("./session", () => ({
  session: () => ({
    ...mocks,
    api: mocks,
    cached: { timer: () => null, entries: () => undefined },
    baseUrl: "https://tracktimer.app",
  }),
}));
vi.mock("./timer-form", () => ({ default: () => null }));
vi.mock("@raycast/api", () => {
  const Container = ({ children }: { children?: ReactNode }) =>
    createElement("div", null, children);
  const Action = ({ title, onAction }: { title: string; onAction?: () => void }) =>
    createElement("button", { type: "button", onClick: onAction }, title);
  return {
    List: Object.assign(Container, {
      Section: Container,
      Item: ({
        title,
        subtitle,
        actions,
      }: {
        title: string;
        subtitle?: string;
        actions?: ReactNode;
      }) => createElement("section", { "aria-label": title }, title, subtitle, actions),
    }),
    ActionPanel: Container,
    Action: Object.assign(Action, { Push: Action, OpenInBrowser: Action }),
    Icon: {},
    Keyboard: { Shortcut: { Common: {} } },
    Toast: { Style: {} },
    showToast: mocks.showToast,
    openExtensionPreferences: vi.fn(),
  };
});

import Command from "./index";

const entry = {
  id: "recent",
  projectId: "project",
  projectName: "Recent project",
  clientName: "Client",
  note: null,
  billable: false,
  durationSeconds: 60,
  status: "completed",
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.pending.mockResolvedValue(null);
  mocks.getTimer.mockResolvedValue({
    ...entry,
    id: "running",
    projectName: "Running project",
    elapsedSeconds: 10,
  });
  mocks.getEntries.mockResolvedValue({ entries: [entry], nextCursor: null });
  mocks.execute.mockResolvedValue({ timer: null });
});
afterEach(cleanup);

it("keeps start and stop primary when a previous action is pending", async () => {
  mocks.pending.mockResolvedValue({ id: "pending" });
  render(createElement(Command));
  const recent = await screen.findByRole("region", { name: "Recent project" });
  const running = screen.getByRole("region", { name: "Running project" });
  expect(within(recent).getAllByRole("button")[0]?.textContent).toBe("Start Timer Again");
  expect(within(running).getAllByRole("button")[0]?.textContent).toBe("Stop Timer");
  expect(screen.getByText("Create Timer")).toBeTruthy();
  expect(screen.getByText("Retry Pending Timer Action")).toBeTruthy();
  fireEvent.click(within(recent).getByText("Start Timer Again"));
  await waitFor(() =>
    expect(mocks.execute).toHaveBeenCalledWith("/timers/start", {
      projectId: "project",
      billable: false,
    }),
  );
});

it("keeps the mutation failure visible after a successful refresh", async () => {
  mocks.execute.mockRejectedValue(new Error("Background command could not be launched"));
  render(createElement(Command));
  fireEvent.click(await screen.findByText("Start Timer Again"));
  await screen.findByRole("region", { name: "Timer action failed" });
  fireEvent.click(
    within(screen.getByRole("region", { name: "Recent project" })).getByText("Refresh"),
  );
  await waitFor(() => expect(mocks.getTimer.mock.calls.length).toBeGreaterThanOrEqual(3));
  expect(screen.getByRole("region", { name: "Timer action failed" }).textContent).toContain(
    "Background command could not be launched",
  );
});

it("keeps an explicit saving action primary during optimistic updates", async () => {
  mocks.execute.mockReturnValue(new Promise(() => {}));
  render(createElement(Command));
  fireEvent.click(await screen.findByText("Start Timer Again"));
  const saving = await screen.findAllByText("Timer Action Is Still Saving");
  fireEvent.click(saving[0]!);
  expect(mocks.execute).toHaveBeenCalledTimes(1);
  expect(mocks.showToast).toHaveBeenCalledWith(
    expect.objectContaining({ title: "Saving timer action" }),
  );
});
