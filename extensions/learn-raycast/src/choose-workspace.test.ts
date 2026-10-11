import { beforeEach, describe, expect, it, vi } from "vitest";
import ChooseWorkspace from "./choose-workspace.js";

const mocks = vi.hoisted(() => ({
  launchCommand: vi.fn(),
  setItem: vi.fn(),
  showToast: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  Action: "Action",
  ActionPanel: "ActionPanel",
  List: Object.assign(() => null, {
    Item: "List.Item",
    EmptyView: "List.EmptyView",
  }),
  Icon: { Plus: "plus" },
  Keyboard: { Shortcut: { Common: { New: { modifiers: ["cmd"], key: "n" } } } },
  useNavigation: () => ({ push: mocks.push }),
  launchCommand: mocks.launchCommand,
  LaunchType: { UserInitiated: "userInitiated" },
  LocalStorage: { setItem: mocks.setItem },
  showToast: mocks.showToast,
  Toast: { Style: { Failure: "failure" } },
}));
vi.mock("@raycast/utils", () => ({ usePromise: vi.fn() }));
vi.mock("react", () => ({
  useState: (initial: unknown) => [initial, vi.fn()],
  useRef: (initial: unknown) => ({ current: initial }),
  useEffect: vi.fn(),
}));
vi.mock("./preferences.js", () => ({ getLearnExecutable: () => "learn" }));
vi.mock("./create-workspace.js", () => ({
  CreateWorkspaceForm: "CreateWorkspaceForm",
}));

type Element = {
  type: string | ((props: Record<string, unknown>) => Element);
  props: {
    children?: Element | Element[];
    actions?: Element;
    onAction?: () => Promise<void>;
    title?: string;
    onCreated?: (workspace: string) => Promise<void>;
  };
};

function findAction(element: Element, title?: string): () => Promise<void> {
  function search(
    node: Element | Element[] | undefined,
  ): (() => Promise<void>) | undefined {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const child of node) {
        const action = search(child);
        if (action) return action;
      }
      return;
    }
    if (typeof node.type === "function" && !node.props.children) {
      return search(node.type(node.props));
    }
    if (
      node.props.onAction &&
      (title
        ? node.props.title === title
        : node.props.title?.startsWith("Save"))
    ) {
      return node.props.onAction;
    }
    return search(node.props.actions) || search(node.props.children);
  }
  const action = search(element);
  if (!action) throw new Error("No action found");
  return action;
}

const tab = { id: 1, title: "Article", url: "https://example.com/article" };
const launchProps = { arguments: {}, launchType: "userInitiated" as const };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.setItem.mockResolvedValue(undefined);
  mocks.launchCommand.mockResolvedValue(undefined);
});

describe("capture workspace picker", () => {
  it("offers creation with no workspaces and saves the original tab after creation", async () => {
    const action = findAction(
      ChooseWorkspace({
        ...launchProps,
        launchContext: { capture: { tabs: [tab], workspaces: [] } },
      }) as Element,
      "Create Workspace and Save Tab",
    );

    await action();
    const form = mocks.push.mock.calls[0][0] as Element;
    await form.props.onCreated!("new-topic");

    expect(mocks.launchCommand).toHaveBeenCalledWith({
      name: "save-current-browser-url",
      type: "userInitiated",
      context: {
        capture: { url: tab.url, title: tab.title, workspace: "new-topic" },
      },
    });
  });

  it("remembers an explicit workspace choice before starting the capture", async () => {
    let finishRemembering!: () => void;
    mocks.setItem.mockReturnValue(
      new Promise<void>((resolve) => {
        finishRemembering = resolve;
      }),
    );
    const action = findAction(
      ChooseWorkspace({
        ...launchProps,
        launchContext: { capture: { tabs: [tab], workspaces: ["papers"] } },
      }) as Element,
    );

    const saving = action();
    expect(mocks.setItem).toHaveBeenCalledWith(
      "learn.capture.workspace",
      "papers",
    );
    expect(mocks.launchCommand).not.toHaveBeenCalled();
    finishRemembering();
    await saving;

    expect(mocks.launchCommand).toHaveBeenCalledWith({
      name: "save-current-browser-url",
      type: "userInitiated",
      context: {
        capture: { url: tab.url, title: tab.title, workspace: "papers" },
      },
    });
  });

  it("does not rewrite the remembered workspace when choosing only a browser tab", async () => {
    const action = findAction(
      ChooseWorkspace({
        ...launchProps,
        launchContext: {
          capture: {
            tabs: [tab, { ...tab, id: 2 }],
            workspaces: ["papers"],
            savedWorkspace: "papers",
          },
        },
      }) as Element,
    );

    await action();

    expect(mocks.setItem).not.toHaveBeenCalled();
    expect(mocks.launchCommand).toHaveBeenCalledOnce();
  });

  it("reports a storage failure without launching and permits retry", async () => {
    mocks.setItem.mockRejectedValueOnce(new Error("Storage unavailable"));
    const action = findAction(
      ChooseWorkspace({
        ...launchProps,
        launchContext: { capture: { tabs: [tab], workspaces: ["papers"] } },
      }) as Element,
    );

    await action();

    expect(mocks.launchCommand).not.toHaveBeenCalled();
    expect(mocks.showToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Could not save browser URL",
      message: "Storage unavailable",
    });
    await action();
    expect(mocks.launchCommand).toHaveBeenCalledOnce();
  });
});
