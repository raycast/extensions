import { useState } from "react";
import AppShortcuts from "./app-shortcuts";
import { useApps } from "./load/apps-provider";
import { useAppShortcuts } from "./load/app-shortcuts-provider";
import { exitWithMessage } from "./view/exit-action";

jest.mock(
  "@raycast/api",
  () => ({
    getFrontmostApplication: jest.fn(),
    List: Object.assign(() => null, { Item: "Item" }),
    Action: "Action",
    ActionPanel: "ActionPanel",
    Icon: { AppWindow: "AppWindow" },
  }),
  { virtual: true }
);
jest.mock("@raycast/utils", () => ({
  usePromise: (fn: unknown) => ({
    isLoading: false,
    data:
      fn === jest.requireMock("@raycast/api").getFrontmostApplication
        ? { name: "Visual Studio Code", path: "C:\\Program Files\\Code.exe" }
        : undefined,
  }),
}));
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: jest.fn((value: unknown) => [value, jest.fn()]),
  useMemo: (fn: () => unknown) => fn(),
  useEffect: (fn: () => void) => fn(),
}));
jest.mock("./load/apps-provider", () => ({ useApps: jest.fn() }));
jest.mock("./load/app-shortcuts-provider", () => ({ useAppShortcuts: jest.fn() }));
jest.mock("./load/platform", () => ({ getPlatform: () => "windows" }));
jest.mock("./view/shortcuts-list", () => ({ ShortcutsList: "ShortcutsList" }));
jest.mock("./view/exit-action", () => ({ exitWithMessage: jest.fn() }));

const publicApp = { name: "Visual Studio Code", slug: "vscode", windowsProcessName: "Code", keymaps: ["Default"] };
const customApp = { ...publicApp, name: "My Editor", slug: "custom-my-editor", customAppId: "custom-app" };

beforeEach(() => {
  jest.mocked(useApps).mockReturnValue({
    data: [publicApp, customApp],
    isLoading: false,
    favorites: [],
    toggleFavorite: jest.fn(),
  });
  jest.mocked(useAppShortcuts).mockReturnValue({
    isLoading: false,
    data: undefined,
    favorites: [],
    toggleFavorite: jest.fn(),
  });
});

it.each(["vscode", "custom-my-editor"])(
  "offers matching collections and keeps the native target after choosing %s",
  (slug) => {
    const setSlug = jest.fn();
    jest.mocked(useState).mockImplementationOnce(() => [undefined, setSlug]);
    const choice = AppShortcuts() as React.JSX.Element;
    expect(choice.props.children.map((item: React.JSX.Element) => item.props.title)).toEqual([
      "Visual Studio Code",
      "My Editor",
    ]);
    expect(exitWithMessage).not.toHaveBeenCalled();
    expect(setSlug).not.toHaveBeenCalled();
    const item = choice.props.children.find((item: React.JSX.Element) => item.key === slug);
    item.props.actions.props.children.props.onAction();
    expect(setSlug).toHaveBeenCalledWith(slug);

    jest.mocked(useState).mockImplementationOnce(() => [slug, setSlug]);
    const shortcuts = AppShortcuts() as React.JSX.Element;
    expect(shortcuts.type).toBe("ShortcutsList");
    expect(useAppShortcuts).toHaveBeenLastCalledWith(slug);
    expect(shortcuts.props.executionTarget).toEqual({ kind: "desktop", windowsProcessName: "Code" });
    expect(exitWithMessage).not.toHaveBeenCalled();
  }
);

it("automatically opens a unique matching collection", () => {
  jest.mocked(useApps).mockReturnValueOnce({
    data: [customApp],
    isLoading: false,
    favorites: [],
    toggleFavorite: jest.fn(),
  });
  const setSlug = jest.fn();
  jest.mocked(useState).mockImplementationOnce(() => [undefined, setSlug]);
  AppShortcuts();
  expect(setSlug).toHaveBeenCalledWith("custom-my-editor");
  expect(exitWithMessage).not.toHaveBeenCalled();
});

it("reports an unavailable app only when no collection matches", () => {
  jest.mocked(useApps).mockReturnValueOnce({ data: [], isLoading: false, favorites: [], toggleFavorite: jest.fn() });
  AppShortcuts();
  expect(exitWithMessage).toHaveBeenCalledWith("Shortcuts not available for application Visual Studio Code");
});
