import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LearnCommandResult } from "./capture.js";
import SaveCurrentBrowserUrl from "./save-current-browser-url.js";

const mocks = vi.hoisted(() => ({
  getFrontmostApplication: vi.fn(),
  getTabs: vi.fn(),
  closeMainWindow: vi.fn(),
  launchCommand: vi.fn(),
  getItem: vi.fn(),
  setItem: vi.fn(),
  showHUD: vi.fn(),
  showToast: vi.fn(),
  listLearnWorkspaces: vi.fn(),
  runLearn: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  BrowserExtension: { getTabs: mocks.getTabs },
  closeMainWindow: mocks.closeMainWindow,
  getFrontmostApplication: mocks.getFrontmostApplication,
  launchCommand: mocks.launchCommand,
  LaunchType: { UserInitiated: "userInitiated" },
  LocalStorage: { getItem: mocks.getItem, setItem: mocks.setItem },
  PopToRootType: { Immediate: "immediate" },
  showHUD: mocks.showHUD,
  showToast: mocks.showToast,
  Toast: { Style: { Failure: "failure" } },
}));
vi.mock("./learn-cli.js", () => ({
  listLearnWorkspaces: mocks.listLearnWorkspaces,
  runLearn: mocks.runLearn,
}));
vi.mock("./preferences.js", () => ({
  getLearnExecutable: () => "/opt/homebrew/bin/learn",
}));

const tab = {
  id: 1,
  url: "https://example.com/article",
  title: "Article title",
  active: true,
};
const launchProps = { arguments: {}, launchType: "userInitiated" as const };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getFrontmostApplication.mockResolvedValue({ name: "Google Chrome" });
  mocks.getTabs.mockResolvedValue([tab]);
  mocks.listLearnWorkspaces.mockResolvedValue(["papers", "browser-agents"]);
  mocks.getItem.mockResolvedValue("papers");
  mocks.runLearn.mockResolvedValue({ stdout: "", stderr: "", code: 0 });
});

describe("Save Current Browser URL", () => {
  it("closes the window while saving is still pending and only notifies on completion", async () => {
    let finishSave!: (result: LearnCommandResult) => void;
    const pendingSave = new Promise<LearnCommandResult>((resolve) => {
      finishSave = resolve;
    });
    mocks.runLearn.mockReturnValue(pendingSave);

    const capture = SaveCurrentBrowserUrl(launchProps);
    await vi.waitFor(() => expect(mocks.runLearn).toHaveBeenCalledOnce());

    expect(mocks.closeMainWindow).toHaveBeenCalledWith({
      clearRootSearch: true,
      popToRootType: "immediate",
    });
    expect(mocks.closeMainWindow.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.getTabs.mock.invocationCallOrder[0],
    );
    expect(mocks.showHUD).not.toHaveBeenCalled();
    expect(mocks.launchCommand).not.toHaveBeenCalled();
    expect(mocks.runLearn).toHaveBeenCalledWith(
      ["add", tab.url, "--workspace", "papers", "--title", tab.title],
      "/opt/homebrew/bin/learn",
    );

    finishSave({ stdout: "", stderr: "", code: 0 });
    await capture;

    expect(mocks.setItem).toHaveBeenCalledWith(
      "learn.capture.workspace",
      "papers",
    );
    expect(mocks.setItem.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.showHUD.mock.invocationCallOrder[0],
    );
    expect(mocks.showHUD).toHaveBeenCalledWith(
      "Saved “Article title” to papers",
    );
    expect(mocks.showToast).not.toHaveBeenCalled();
  });

  it("opens the picker on first capture without saving or remembering a workspace", async () => {
    mocks.getItem.mockResolvedValue(undefined);

    await SaveCurrentBrowserUrl(launchProps);

    expect(mocks.launchCommand).toHaveBeenCalledWith({
      name: "choose-workspace",
      type: "userInitiated",
      context: {
        capture: {
          tabs: [tab],
          workspaces: ["papers", "browser-agents"],
          savedWorkspace: undefined,
        },
      },
    });
    expect(mocks.runLearn).not.toHaveBeenCalled();
    expect(mocks.setItem).not.toHaveBeenCalled();
  });

  it("asks which active browser window to save even with a remembered workspace", async () => {
    const secondTab = { ...tab, id: 2, url: "https://example.com/other" };
    mocks.getTabs.mockResolvedValue([tab, secondTab]);

    await SaveCurrentBrowserUrl(launchProps);

    expect(mocks.launchCommand).toHaveBeenCalledWith({
      name: "choose-workspace",
      type: "userInitiated",
      context: {
        capture: {
          tabs: [tab, secondTab],
          workspaces: ["papers", "browser-agents"],
          savedWorkspace: "papers",
        },
      },
    });
    expect(mocks.runLearn).not.toHaveBeenCalled();
  });

  it("saves the picker selection without reading the browser again", async () => {
    await SaveCurrentBrowserUrl({
      ...launchProps,
      launchContext: {
        capture: {
          url: tab.url,
          title: tab.title,
          workspace: "browser-agents",
        },
      },
    });

    expect(mocks.getFrontmostApplication).not.toHaveBeenCalled();
    expect(mocks.getTabs).not.toHaveBeenCalled();
    expect(mocks.listLearnWorkspaces).not.toHaveBeenCalled();
    expect(mocks.runLearn).toHaveBeenCalledWith(
      ["add", tab.url, "--workspace", "browser-agents", "--title", tab.title],
      "/opt/homebrew/bin/learn",
    );
    expect(mocks.showHUD).toHaveBeenCalledWith(
      "Saved “Article title” to browser-agents",
    );
  });

  it("reports an existing URL and remembers its workspace without a success HUD", async () => {
    mocks.runLearn.mockResolvedValue({
      stdout: "",
      stderr: `Resource "${tab.url}" already exists`,
      code: 1,
    });

    await SaveCurrentBrowserUrl(launchProps);

    expect(mocks.showToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Already saved",
      message: "This URL is already in papers",
    });
    expect(mocks.setItem).toHaveBeenCalledWith(
      "learn.capture.workspace",
      "papers",
    );
    expect(mocks.showHUD).not.toHaveBeenCalled();
  });

  it("reports save errors after closing and does not remember a failed capture", async () => {
    mocks.runLearn.mockResolvedValue({
      stdout: "",
      stderr: "Disk full",
      code: 1,
    });

    await SaveCurrentBrowserUrl(launchProps);

    expect(mocks.closeMainWindow).toHaveBeenCalledOnce();
    expect(mocks.showToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Could not save browser URL",
      message: "Disk full",
    });
    expect(mocks.setItem).not.toHaveBeenCalled();
    expect(mocks.showHUD).not.toHaveBeenCalled();
  });

  it("reports an unsupported foreground app without opening an empty error page", async () => {
    mocks.getFrontmostApplication.mockResolvedValue({ name: "Notes" });

    await SaveCurrentBrowserUrl(launchProps);

    expect(mocks.closeMainWindow).toHaveBeenCalledOnce();
    expect(mocks.showToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Could not save browser URL",
      message: "Switch to a supported browser before saving its URL",
    });
    expect(mocks.runLearn).not.toHaveBeenCalled();
    expect(mocks.launchCommand).not.toHaveBeenCalled();
  });
});
