import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import ConnectionCommand from "../src/connection";
import { NotificationActions } from "../src/notification-actions";
import type { KatoNotification } from "../src/types";

const mocks = vi.hoisted(() => ({
  whoami: vi.fn(),
  dismiss: vi.fn(),
  clearCache: vi.fn(),
  switchWorkspace: vi.fn(),
  showToast: vi.fn(),
  confirmAlert: vi.fn(),
  state: [] as unknown[],
  stateIndex: 0,
  effect: undefined as (() => void) | undefined,
}));

// Keep Raycast's native host out of these action/error-path tests.
vi.mock("@raycast/api", () => ({
  Action: Object.assign("Action", {
    Push: "Push",
    Style: { Destructive: "destructive" },
  }),
  ActionPanel: Object.assign("ActionPanel", { Section: "Section" }),
  Detail: Object.assign("Detail", {
    Metadata: Object.assign("Metadata", { Label: "Label" }),
  }),
  Icon: {},
  Keyboard: { Shortcut: { Common: { Refresh: {} } } },
  Toast: {
    Style: { Animated: "animated", Success: "success", Failure: "failure" },
  },
  showToast: mocks.showToast,
  confirmAlert: mocks.confirmAlert,
}));
vi.mock("@raycast/utils", () => ({
  withAccessToken: () => (component: unknown) => component,
}));
vi.mock("../src/api", () => ({
  katoApi: { whoami: mocks.whoami, dismissNotification: mocks.dismiss },
  clearKatoCache: mocks.clearCache,
}));
vi.mock("../src/oauth", () => ({
  accessTokenOptions: {},
  switchWorkspace: mocks.switchWorkspace,
}));
vi.mock("../src/create-task", () => ({ CreateTaskForm: "CreateTaskForm" }));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = mocks.stateIndex++;
    if (!(index in mocks.state)) mocks.state[index] = initial;
    return [
      mocks.state[index],
      (value: unknown) => {
        mocks.state[index] = value;
      },
    ];
  },
  useEffect: (effect: () => void) => {
    mocks.effect = effect;
  },
}));

function renderConnection() {
  mocks.stateIndex = 0;
  return ConnectionCommand({}) as ReactElement<{
    isLoading: boolean;
    markdown: string;
    actions: ReactNode;
  }>;
}

function findAction(node: ReactNode, title: string): (() => void) | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const action = findAction(child, title);
      if (action) return action;
    }
  }
  if (
    isValidElement<{
      title?: string;
      onAction?: () => void;
      children?: ReactNode;
    }>(node)
  ) {
    if (node.props.title === title) return node.props.onAction;
    return findAction(node.props.children, title);
  }
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.state = [];
  mocks.stateIndex = 0;
  mocks.effect = undefined;
  mocks.showToast.mockImplementation(async (options) => ({ ...options }));
  mocks.confirmAlert.mockResolvedValue(true);
});

describe("notification dismissal", () => {
  function actions() {
    const onDismissed = vi.fn();
    const onUnread = vi.fn();
    const tree = NotificationActions({
      notification: { id: "notification-1", isRead: true } as KatoNotification,
      onDismissed,
      onUnread,
    });
    return {
      onDismissed,
      onUnread,
      dismiss: findAction(tree, "Dismiss Notification")!,
    };
  }

  it("preserves the read notification when dismissal fails", async () => {
    mocks.dismiss.mockRejectedValue(new Error("Offline"));
    const { dismiss, onDismissed, onUnread } = actions();
    dismiss();
    await vi.waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ style: "failure" }),
      ),
    );
    expect(onDismissed).not.toHaveBeenCalled();
    expect(onUnread).not.toHaveBeenCalled();
  });

  it("removes the notification only after the server accepts dismissal", async () => {
    let resolve!: () => void;
    mocks.dismiss.mockReturnValue(
      new Promise<void>((done) => {
        resolve = done;
      }),
    );
    const { dismiss, onDismissed, onUnread } = actions();
    dismiss();
    expect(mocks.dismiss).toHaveBeenCalledWith("notification-1");
    expect(onDismissed).not.toHaveBeenCalled();
    resolve();
    await vi.waitFor(() => expect(onDismissed).toHaveBeenCalledOnce());
    expect(onUnread).not.toHaveBeenCalled();
  });
});

describe("connection recovery", () => {
  it.each(["Kato is unreachable", "Access rejected"])(
    "handles %s and supports a successful retry",
    async (message) => {
      mocks.whoami.mockRejectedValueOnce(new Error(message));
      renderConnection();
      mocks.effect!();
      await vi.waitFor(() =>
        expect(mocks.showToast).toHaveBeenCalledWith(
          expect.objectContaining({ message, style: "failure" }),
        ),
      );
      const failed = renderConnection();
      expect(failed.props.isLoading).toBe(false);
      expect(failed.props.markdown).toContain(message);
      expect(
        findAction(failed.props.actions, "Reconnect to Kato"),
      ).toBeDefined();

      mocks.whoami.mockResolvedValue({
        workspace: { name: "Recovered", plan: "free" },
        member: { name: "Member" },
      });
      findAction(failed.props.actions, "Retry Connection")!();
      await vi.waitFor(() =>
        expect(renderConnection().props.markdown).toContain("# Recovered"),
      );
      expect(mocks.clearCache).toHaveBeenCalledOnce();
      expect(renderConnection().props.isLoading).toBe(false);
    },
  );

  it("does not report a successful workspace switch when the reload fails", async () => {
    mocks.switchWorkspace.mockResolvedValue("token");
    mocks.whoami.mockRejectedValue(new Error("Access rejected"));
    const toast = { style: "animated", title: "Opening Kato…", message: "" };
    mocks.showToast.mockResolvedValue(toast);
    const tree = renderConnection();
    findAction(tree.props.actions, "Switch Workspace")!();
    await vi.waitFor(() => expect(toast.style).toBe("failure"));
    expect(toast.title).toBe("Could not load Kato connection");
    expect(renderConnection().props.markdown).toContain("Access rejected");
  });
});
