import { useState } from "react";
import AppShortcuts from "./app-shortcuts";
import { useApps } from "./load/apps-provider";
import { useAppShortcuts } from "./load/app-shortcuts-provider";
import { exitWithMessage } from "./view/exit-action";
import { getPlatform } from "./load/platform";
import { getApplications } from "@raycast/api";
import { getDesktopTarget } from "./engine/desktop-target";
import type { ExecutionTarget } from "./engine/execution-target";

const mockNative = {
  name: "Visual Studio Code",
  path: "C:\\Program Files\\Code.exe",
  bundleId: "com.microsoft.VSCode",
  windowsAppId: undefined as string | undefined,
};
let mockSelectedTarget: ExecutionTarget | undefined;
let mockTargetLoading = false;

jest.mock(
  "@raycast/api",
  () => ({
    getFrontmostApplication: jest.fn(),
    getApplications: jest.fn(),
    List: Object.assign(() => null, { Item: "Item" }),
    Action: "Action",
    ActionPanel: "ActionPanel",
    Icon: { AppWindow: "AppWindow" },
  }),
  { virtual: true }
);
jest.mock("@raycast/utils", () => ({
  usePromise: (fn: unknown) =>
    fn === jest.requireMock("@raycast/api").getFrontmostApplication
      ? { isLoading: false, data: mockNative }
      : { isLoading: mockTargetLoading, data: mockSelectedTarget },
}));
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: jest.fn((value: unknown) => [value, jest.fn()]),
  useMemo: (fn: () => unknown) => fn(),
  useEffect: (fn: () => void) => fn(),
}));
jest.mock("./load/apps-provider", () => ({ useApps: jest.fn() }));
jest.mock("./load/app-shortcuts-provider", () => ({ useAppShortcuts: jest.fn() }));
jest.mock("./load/platform", () => ({ getPlatform: jest.fn() }));
jest.mock("./view/shortcuts-list", () => ({ ShortcutsList: "ShortcutsList" }));
jest.mock("./view/exit-action", () => ({ exitWithMessage: jest.fn() }));

const publicApp = { name: "Visual Studio Code", slug: "vscode", windowsProcessName: "Code", keymaps: ["Default"] };
const customApp = { ...publicApp, name: "My Editor", slug: "custom-my-editor", customAppId: "custom-app" };

beforeEach(() => {
  mockNative.windowsAppId = undefined;
  mockSelectedTarget = { kind: "desktop", windowsProcessName: "Code" };
  mockTargetLoading = false;
  jest.mocked(getPlatform).mockReturnValue("windows");
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

    jest.mocked(useAppShortcuts).mockReturnValueOnce({
      isLoading: false,
      data: { ...(slug === "vscode" ? publicApp : customApp), keymaps: [] },
      favorites: [],
      toggleFavorite: jest.fn(),
    });
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

it.each([
  { name: "missing ID", installed: [] },
  {
    name: "ambiguous ID",
    installed: [
      { name: "Code", path: "C:\\Code.exe", windowsAppId: "Vendor.Editor" },
      { name: "Code", path: "C:\\Other\\Code.exe", windowsAppId: "Vendor.Editor" },
    ],
  },
  {
    name: "changed executable",
    installed: [{ name: "New Code", path: "C:\\NewCode.exe", windowsAppId: "Vendor.Editor" }],
  },
])(
  "does not apply Current Shortcuts through a stale process when Raycast omits the ID: $name",
  async ({ installed }) => {
    const collection = { ...customApp, windowsAppId: "Vendor.Editor", keymaps: [] };
    jest.mocked(getApplications).mockResolvedValue(installed);
    mockSelectedTarget = await getDesktopTarget(collection);
    jest.mocked(useAppShortcuts).mockReturnValueOnce({
      isLoading: false,
      data: collection,
      favorites: [],
      toggleFavorite: jest.fn(),
    });
    jest.mocked(useState).mockImplementationOnce(() => [collection.slug, jest.fn()]);
    const shortcuts = AppShortcuts() as React.JSX.Element;
    expect(shortcuts.props.executionTarget).toBeUndefined();
  }
);

it.each([
  { nativeId: undefined, loading: true, expected: undefined },
  { nativeId: undefined, loading: false, expected: { kind: "desktop", windowsProcessName: "Code" } },
  { nativeId: "Vendor.Editor", loading: true, expected: { kind: "desktop", windowsProcessName: "Code" } },
  { nativeId: "Other.Editor", loading: false, expected: undefined },
])("verifies an explicit-ID collection before using the detected process: %j", ({ nativeId, loading, expected }) => {
  mockNative.windowsAppId = nativeId;
  mockTargetLoading = loading;
  const collection = { ...customApp, windowsAppId: "Vendor.Editor", keymaps: [] };
  jest.mocked(useAppShortcuts).mockReturnValueOnce({
    isLoading: false,
    data: collection,
    favorites: [],
    toggleFavorite: jest.fn(),
  });
  jest.mocked(useState).mockImplementationOnce(() => [collection.slug, jest.fn()]);
  const shortcuts = AppShortcuts() as React.JSX.Element;
  expect(shortcuts.props.executionTarget).toEqual(expected);
});

it("reports an unavailable app only when no collection matches", () => {
  jest.mocked(useApps).mockReturnValueOnce({ data: [], isLoading: false, favorites: [], toggleFavorite: jest.fn() });
  AppShortcuts();
  expect(exitWithMessage).toHaveBeenCalledWith("Shortcuts not available for application Visual Studio Code");
});

it("offers the collection picker for matching public and custom macOS apps", () => {
  jest.mocked(getPlatform).mockReturnValue("macos");
  jest.mocked(useApps).mockReturnValueOnce({
    data: [publicApp, customApp].map((app) => ({ ...app, bundleId: "com.microsoft.VSCode" })),
    isLoading: false,
    favorites: [],
    toggleFavorite: jest.fn(),
  });
  const setSlug = jest.fn();
  jest.mocked(useState).mockImplementationOnce(() => [undefined, setSlug]);
  const choice = AppShortcuts() as React.JSX.Element;
  expect(choice.props.children.map((item: React.JSX.Element) => item.props.title)).toEqual([
    "Visual Studio Code",
    "My Editor",
  ]);
  expect(setSlug).not.toHaveBeenCalled();
  expect(exitWithMessage).not.toHaveBeenCalled();
});
