// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pending: vi.fn(),
  execute: vi.fn(),
  getClients: vi.fn(),
  getProjects: vi.fn(),
  cachedClients: vi.fn(),
  cachedProjects: vi.fn(),
  closeMainWindow: vi.fn(),
}));
vi.mock("./session", () => ({
  session: () => ({
    ...mocks,
    api: mocks,
    cached: { clients: mocks.cachedClients, projects: mocks.cachedProjects },
    baseUrl: "https://tracktimer.app",
  }),
}));
vi.mock("@raycast/api", () => {
  const Container = ({ children, actions }: { children?: ReactNode; actions?: ReactNode }) =>
    createElement("div", null, children, actions);
  const Action = ({ title, onAction }: { title: string; onAction?: () => void }) =>
    createElement("button", { type: "button", onClick: onAction }, title);
  return {
    Form: Object.assign(Container, {
      Description: ({ text }: { text: string }) => createElement("p", null, text),
      Dropdown: Object.assign(
        ({
          title,
          value,
          onChange,
          children,
        }: {
          title: string;
          value: string;
          onChange: (value: string) => void;
          children?: ReactNode;
        }) =>
          createElement(
            "select",
            {
              "aria-label": title,
              value,
              onChange: (event: { target: { value: string } }) => onChange(event.target.value),
            },
            children,
          ),
        {
          Item: ({ title, value }: { title: string; value: string }) =>
            createElement("option", { value }, title),
        },
      ),
      TextArea: ({
        title,
        value,
        onChange,
      }: {
        title: string;
        value: string;
        onChange: (value: string) => void;
      }) =>
        createElement("textarea", {
          "aria-label": title,
          value,
          onChange: (event: { target: { value: string } }) => onChange(event.target.value),
        }),
      Checkbox: () => null,
    }),
    ActionPanel: Container,
    Action: Object.assign(Action, {
      OpenInBrowser: Action,
      SubmitForm: ({ title, onSubmit }: { title: string; onSubmit: () => void }) =>
        createElement("button", { type: "button", onClick: onSubmit }, title),
    }),
    Icon: {},
    Toast: { Style: {} },
    showToast: vi.fn(),
    openExtensionPreferences: vi.fn(),
    closeMainWindow: mocks.closeMainWindow,
    useNavigation: () => ({ pop: vi.fn() }),
  };
});

import TimerForm from "./timer-form";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.pending.mockResolvedValue({ id: "old" });
  mocks.getClients.mockResolvedValue([{ id: "client", name: "Client" }]);
  mocks.getProjects.mockResolvedValue([{ id: "project", name: "Selected project" }]);
  mocks.cachedClients.mockReturnValue([]);
  mocks.cachedProjects.mockReturnValue([]);
  mocks.execute.mockResolvedValue({ timer: null });
});
afterEach(cleanup);
it("starts the selected project and description instead of retrying a pending action", async () => {
  render(createElement(TimerForm));
  await screen.findByRole("option", { name: "Selected project" });
  fireEvent.change(screen.getByLabelText("Description"), { target: { value: "New work" } });
  fireEvent.click(screen.getByRole("button", { name: "Start Timer" }));
  await waitFor(() =>
    expect(mocks.execute).toHaveBeenCalledWith("/timers/start", {
      projectId: "project",
      billable: true,
      note: "New work",
    }),
  );
  expect(screen.queryByRole("button", { name: "Retry Pending Action" })).toBeNull();
});
it("still validates the selected project when a previous action is pending", async () => {
  mocks.getProjects.mockResolvedValue([]);
  render(createElement(TimerForm));
  await screen.findByText(/No assigned projects/);
  fireEvent.click(screen.getByRole("button", { name: "Start Timer" }));
  await screen.findByText("Choose a project and keep the note within 500 characters.");
  expect(mocks.execute).not.toHaveBeenCalled();
});
it("keeps submission blocked until client and project reloads both finish", async () => {
  mocks.cachedClients.mockReturnValue([{ id: "client", name: "Client" }]);
  mocks.cachedProjects.mockReturnValue([{ id: "cached-project", name: "Cached project" }]);
  let resolveProjects!: (projects: { id: string; name: string }[]) => void;
  mocks.getProjects.mockImplementation(
    () =>
      new Promise<{ id: string; name: string }[]>((resolve) => {
        resolveProjects = resolve;
      }),
  );

  render(createElement(TimerForm));
  await waitFor(() => expect(mocks.getProjects).toHaveBeenCalledWith("client", true));

  fireEvent.click(screen.getByRole("button", { name: "Start Timer" }));
  expect(mocks.execute).not.toHaveBeenCalled();

  resolveProjects([{ id: "project", name: "Selected project" }]);
  await screen.findByRole("option", { name: "Selected project" });
  fireEvent.click(screen.getByRole("button", { name: "Start Timer" }));
  await waitFor(() => expect(mocks.execute).toHaveBeenCalled());
});
