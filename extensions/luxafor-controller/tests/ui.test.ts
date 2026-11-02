import { createElement, type ReactElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { emptyState, type SavedState } from "../src/luxafor-state";
import type { Result } from "../src/luxafor-service";
const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  send: vi.fn(),
  clearRecent: vi.fn(),
  reportResult: vi.fn(),
  refreshMenu: vi.fn(),
  confirm: vi.fn(),
  preferences: { menubarMode: "simple" },
}));
vi.mock("../src/runtime", () => ({
  createService: () => ({ read: mocks.read, send: mocks.send, clearRecent: mocks.clearRecent }),
  refreshMenu: mocks.refreshMenu,
  reportResult: mocks.reportResult,
}));
vi.mock("@raycast/api", async () => {
  const { createElement } = await import("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactElement, props.actions as ReactElement);
  return {
    List: Object.assign(component("List"), { Item: component("List.Item"), Section: component("List.Section") }),
    MenuBarExtra: Object.assign(component("MenuBarExtra"), {
      Item: component("MenuBarExtra.Item"),
      Section: component("MenuBarExtra.Section"),
    }),
    Action: Object.assign(component("Action"), {
      Push: component("Action.Push"),
      SubmitForm: component("Action.SubmitForm"),
      Style: { Destructive: "destructive" },
    }),
    Alert: { ActionStyle: { Destructive: "destructive" } },
    ActionPanel: component("ActionPanel"),
    Detail: component("Detail"),
    Form: Object.assign(component("Form"), {
      TextField: component("Form.TextField"),
      Description: component("Form.Description"),
    }),
    Icon: new Proxy({}, { get: (_target, key) => String(key) }),
    Keyboard: { Shortcut: { Common: { Refresh: { key: "r" }, RemoveAll: { key: "x" } } } },
    confirmAlert: mocks.confirm,
    getPreferenceValues: () => mocks.preferences,
    showToast: vi.fn(),
    Toast: { Style: { Failure: "failure" } },
    openExtensionPreferences: vi.fn(),
  };
});
import Control from "../src/control-luxafor";
import Menu from "../src/luxafor-status";
import CustomColour from "../src/custom-colour";
let tree: ReactTestRenderer;
async function render(component: ReactElement) {
  await act(async () => {
    tree = create(component);
  });
}
function action(title: string) {
  return tree.root.findAllByType("Action" as never).find((node) => node.props.title === title)!;
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mocks.read.mockResolvedValue(emptyState());
  mocks.send.mockResolvedValue({ ok: true, persisted: true });
  mocks.refreshMenu.mockResolvedValue(true);
  mocks.preferences.menubarMode = "simple";
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});
it("main view opens and refreshes without sending, and actual red-test action honours cancellation", async () => {
  await render(createElement(Control));
  expect(mocks.send).not.toHaveBeenCalled();
  await act(async () => {
    await action("Refresh History").props.onAction();
  });
  mocks.confirm.mockResolvedValue(false);
  await act(async () => {
    await action("Send Red Test…").props.onAction();
  });
  expect(mocks.send).not.toHaveBeenCalled();
  mocks.confirm.mockResolvedValue(true);
  await act(async () => {
    await action("Send Red Test…").props.onAction();
  });
  expect(mocks.send).toHaveBeenCalledTimes(1);
  expect(mocks.send.mock.calls[0][0]).toEqual({ kind: "solid", colour: "red" });
});
it("menu loads and refreshes without controls, and keeps non-colour status text", async () => {
  await render(createElement(Menu));
  const menu = tree.root.findByType("MenuBarExtra" as never);
  expect(menu.props.isLoading).toBe(false);
  expect(menu.props.tooltip).toContain("physical state unknown");
  const refresh = tree.root
    .findAllByType("MenuBarExtra.Item" as never)
    .find((node) => node.props.title === "Refresh History")!;
  await act(async () => {
    await refresh.props.onAction();
  });
  expect(mocks.send).not.toHaveBeenCalled();
});
it("custom form rejects invalid input without sending, then normalises short hex", async () => {
  await render(createElement(CustomColour));
  const submit = () => tree.root.findByType("Action.SubmitForm" as never);
  await act(async () => {
    await submit().props.onSubmit({ colour: "#12zzzz" });
  });
  expect(mocks.send).not.toHaveBeenCalled();
  expect(tree.root.findByType("Form.TextField" as never).props.error).toContain("#RGB");
  await act(async () => {
    await submit().props.onSubmit({ colour: "#3A7" });
  });
  expect(mocks.send).toHaveBeenCalledTimes(1);
  expect(mocks.send.mock.calls[0][0]).toEqual({ kind: "solid", colour: "33aa77" });
});
it("teardown cancels the active request and does not update the unmounted view", async () => {
  let finish!: (value: Result) => void;
  mocks.send.mockImplementation(
    (_command, signal: AbortSignal) =>
      new Promise((resolve) => {
        finish = resolve;
        signal.addEventListener("abort", () => resolve({ ok: false, reason: "cancelled", uncertain: true }));
      }),
  );
  await render(createElement(Control));
  let sending!: Promise<void>;
  await act(async () => {
    sending = action("Set Red").props.onAction();
  });
  const signal = mocks.send.mock.calls[0][1] as AbortSignal;
  await act(async () => {
    tree.unmount();
  });
  expect(signal.aborted).toBe(true);
  finish({ ok: true, persisted: true });
  await sending;
  expect(mocks.reportResult).not.toHaveBeenCalled();
});
it("two rapid actions send only once while pending", async () => {
  let finish!: (value: Result) => void;
  mocks.send.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await render(createElement(Control));
  let first!: Promise<void>;
  await act(async () => {
    first = action("Set Red").props.onAction();
  });
  await act(async () => {
    await action("Set Green").props.onAction();
  });
  expect(mocks.send).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish({ ok: true, persisted: true });
    await first;
  });
});
it("an older refresh cannot overwrite a later completed refresh", async () => {
  await render(createElement(Control));
  let oldRead!: (value: SavedState) => void;
  mocks.read.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        oldRead = resolve;
      }),
  );
  let older!: Promise<void>;
  await act(async () => {
    older = action("Refresh History").props.onAction();
  });
  const newer: SavedState = {
    version: 2,
    recent: [],
    accepted: { command: { kind: "solid", colour: "green" }, acceptedAt: Date.now() },
  };
  mocks.read.mockResolvedValueOnce(newer);
  await act(async () => {
    await action("Refresh History").props.onAction();
  });
  await act(async () => {
    oldRead(emptyState());
    await older;
  });
  expect(tree.root.findAllByType("List.Item" as never).map((item) => item.props.title)).toEqual(
    expect.arrayContaining([expect.stringContaining("Last API-accepted: Green")]),
  );
});
it("confirmation resolving after unmount cannot send a light command", async () => {
  let confirm!: (value: boolean) => void;
  mocks.confirm.mockImplementation(
    () =>
      new Promise((resolve) => {
        confirm = resolve;
      }),
  );
  await render(createElement(Control));
  let testing!: Promise<void>;
  await act(async () => {
    testing = action("Send Red Test…").props.onAction();
  });
  await act(async () => tree.unmount());
  confirm(true);
  await testing;
  expect(mocks.send).not.toHaveBeenCalled();
});
it("a read started before sending cannot erase pending request feedback", async () => {
  let finishRead!: (value: SavedState) => void;
  mocks.read.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishRead = resolve;
      }),
  );
  let finishSend!: (value: Result) => void;
  mocks.send.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishSend = resolve;
      }),
  );
  await render(createElement(Control));
  let sending!: Promise<void>;
  await act(async () => {
    sending = action("Set Red").props.onAction();
  });
  try {
    await act(async () => {
      finishRead(emptyState());
    });
    const history = tree.root
      .findAllByType("List.Item" as never)
      .find((item) => item.props.title === "No API-accepted command")!;
    expect(history.props.subtitle).toContain("Request pending");
  } finally {
    await act(async () => {
      finishSend({ ok: true, persisted: true });
      await sending;
    });
  }
});
it("keeps the mutation guard through history reload and feedback", async () => {
  await render(createElement(Control));
  let finishRead!: (value: SavedState) => void;
  mocks.read.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishRead = resolve;
      }),
  );
  let first!: Promise<void>;
  await act(async () => {
    first = action("Set Red").props.onAction();
  });
  await act(async () => {
    await action("Set Green").props.onAction();
  });
  expect(mocks.send).toHaveBeenCalledTimes(1);
  await act(async () => {
    finishRead(emptyState());
    await first;
  });
  await act(async () => {
    await action("Set Green").props.onAction();
  });
  expect(mocks.send).toHaveBeenCalledTimes(2);
});
it("manual refresh during a send retains pending feedback", async () => {
  await render(createElement(Control));
  let finish!: (result: Result) => void;
  mocks.send.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  let sending!: Promise<void>;
  await act(async () => {
    sending = action("Set Red").props.onAction();
  });
  await act(async () => {
    await action("Refresh History").props.onAction();
  });
  const history = tree.root
    .findAllByType("List.Item" as never)
    .find((item) => item.props.title === "No API-accepted command")!;
  expect(history.props.subtitle).toContain("Request pending");
  await act(async () => {
    finish({ ok: true, persisted: true });
    await sending;
  });
});

it("canceling recent-history clearing preserves the list and sends nothing", async () => {
  mocks.read.mockResolvedValue({ version: 2, recent: ["ff0000"] });
  await render(createElement(Control));
  mocks.confirm.mockResolvedValue(false);
  await act(async () => {
    await action("Clear Recent Colors").props.onAction();
  });
  expect(mocks.clearRecent).not.toHaveBeenCalled();
  expect(mocks.send).not.toHaveBeenCalled();
  mocks.confirm.mockResolvedValue(true);
  await act(async () => {
    await action("Clear Recent Colors").props.onAction();
  });
  expect(mocks.clearRecent).toHaveBeenCalledTimes(1);
  expect(mocks.send).not.toHaveBeenCalled();
});
