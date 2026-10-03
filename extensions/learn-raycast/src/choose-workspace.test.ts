import { beforeEach, describe, expect, it, vi } from "vitest";
import ChooseWorkspace from "./choose-workspace.js";

const mocks = vi.hoisted(() => ({
  launchCommand: vi.fn(),
  setItem: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  Action: "Action",
  ActionPanel: "ActionPanel",
  List: Object.assign(() => null, { Item: "List.Item" }),
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

type Element = {
  type: string | ((props: Record<string, unknown>) => Element);
  props: {
    children?: Element | Element[];
    actions?: Element;
    onAction?: () => Promise<void>;
  };
};

function findAction(element: Element): () => Promise<void> {
  if (typeof element.type === "function" && !element.props.children) {
    return findAction(element.type(element.props));
  }
  if (element.props.onAction) return element.props.onAction;
  if (element.props.actions) return findAction(element.props.actions);
  const children = element.props.children;
  if (Array.isArray(children)) return findAction(children[0]);
  if (children) return findAction(children);
  throw new Error("No action found");
}

const tab = { id: 1, title: "Article", url: "https://example.com/article" };
const launchProps = { arguments: {}, launchType: "userInitiated" as const };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.setItem.mockResolvedValue(undefined);
  mocks.launchCommand.mockResolvedValue(undefined);
});

describe("capture workspace picker", () => {
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
