import { Action, getPreferenceValues, List, open, showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { Children, useCallback, useEffect, useMemo, useState } from "react";
import Command from "./index";
import CallHandler from "./core/src/ts/modules/CallHandler";
import Env from "./core/src/ts/modules/Env";
import QueryParser from "./core/src/ts/modules/QueryParser";

jest.mock("react", () => {
  const actual = jest.requireActual("react");
  return {
    ...actual,
    useCallback: jest.fn((fn) => fn),
    useEffect: jest.fn(),
    useMemo: jest.fn((fn) => fn()),
    useState: jest.fn(),
  };
});

jest.mock(
  "@raycast/utils",
  () => ({
    useCachedState: jest.fn(),
  }),
  { virtual: true },
);

jest.mock("./core/src/ts/modules/CallHandler", () => ({
  __esModule: true,
  default: {
    getRedirectResponse: jest.fn(),
  },
}));

jest.mock("./core/src/ts/modules/QueryParser", () => ({
  __esModule: true,
  default: {
    parse: jest.fn(),
  },
}));

jest.mock("./core/src/ts/modules/SuggestionsGetter", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    getSuggestions: jest.fn(() => []),
  })),
}));

jest.mock(
  "@raycast/api",
  () => {
    const createComponent = (name) => {
      const Component = () => null;
      Component.displayName = name;
      return Component;
    };

    const Action = createComponent("Action");
    Action.OpenInBrowser = createComponent("Action.OpenInBrowser");

    const List = createComponent("List");
    List.EmptyView = createComponent("List.EmptyView");
    List.Section = createComponent("List.Section");
    List.Item = createComponent("List.Item");
    List.Item.Detail = createComponent("List.Item.Detail");
    List.Item.Detail.Metadata = createComponent("List.Item.Detail.Metadata");
    List.Item.Detail.Metadata.Label = createComponent("List.Item.Detail.Metadata.Label");
    List.Item.Detail.Metadata.TagList = createComponent("List.Item.Detail.Metadata.TagList");
    List.Item.Detail.Metadata.TagList.Item = createComponent("List.Item.Detail.Metadata.TagList.Item");
    List.Item.Detail.Metadata.Separator = createComponent("List.Item.Detail.Metadata.Separator");
    List.Item.Detail.Metadata.Link = createComponent("List.Item.Detail.Metadata.Link");

    return {
      Action,
      ActionPanel: createComponent("ActionPanel"),
      List,
      Toast: {
        Style: {
          Animated: "Animated",
          Failure: "Failure",
          Success: "Success",
        },
      },
      getPreferenceValues: jest.fn(),
      open: jest.fn(),
      showToast: jest.fn(),
    };
  },
  { virtual: true },
);

type MockElement = {
  type?: unknown;
  props?: {
    actions?: unknown;
    children?: unknown;
    onAction?: () => Promise<void>;
    title?: string;
  };
};

const mockGetPreferenceValues = getPreferenceValues as jest.Mock;
const mockUseCachedState = useCachedState as jest.Mock;
const mockUseCallback = useCallback as jest.Mock;
const mockUseEffect = useEffect as jest.Mock;
const mockUseMemo = useMemo as jest.Mock;
const mockUseState = useState as jest.Mock;
const mockShowToast = showToast as jest.Mock;
const mockOpen = open as jest.Mock;
const mockGetRedirectResponse = CallHandler.getRedirectResponse as jest.Mock;
const mockParse = QueryParser.parse as jest.Mock;

const defaultPrefs = { language: "en", country: "us" };

function flattenElements(node: unknown): MockElement[] {
  if (!node || typeof node !== "object") {
    return [];
  }
  const element = node as MockElement;
  const children = element.props ? Children.toArray(element.props.children) : [];
  return [element, ...children.flatMap((child) => flattenElements(child))];
}

function findElement(node: unknown, predicate: (element: MockElement) => boolean): MockElement | undefined {
  return flattenElements(node).find(predicate);
}

function mockHooks({
  cachedPrefs = defaultPrefs,
  env = null,
  searchText = "",
  suggestions = [],
  isShowingDetail = true,
}: {
  cachedPrefs?: typeof defaultPrefs;
  env?: Record<string, unknown> | null;
  searchText?: string;
  suggestions?: unknown[];
  isShowingDetail?: boolean;
}) {
  const setCachedPrefs = jest.fn();
  const setEnv = jest.fn();
  const setSearchText = jest.fn();
  const setSuggestions = jest.fn();
  const setIsShowingDetail = jest.fn();

  mockUseCachedState.mockReset();
  mockUseCachedState
    .mockImplementationOnce(() => [cachedPrefs, setCachedPrefs])
    .mockImplementationOnce(() => [env, setEnv]);

  mockUseState.mockReset();
  mockUseState
    .mockImplementationOnce(() => [searchText, setSearchText])
    .mockImplementationOnce(() => [suggestions, setSuggestions])
    .mockImplementationOnce(() => [isShowingDetail, setIsShowingDetail]);

  return {
    setCachedPrefs,
    setEnv,
    setSearchText,
    setSuggestions,
    setIsShowingDetail,
  };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("Raycast command integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPreferenceValues.mockReturnValue(defaultPrefs);
    mockUseCallback.mockImplementation((fn) => fn);
    mockUseEffect.mockImplementation(() => undefined);
    mockUseMemo.mockImplementation((fn) => fn());
    mockShowToast.mockResolvedValue({ style: null, title: "", message: "" });
    mockParse.mockReturnValue({ query: "g cats", keyword: "g", arguments: ["cats"] });
  });

  it("renders the loading view when no environment is cached", () => {
    mockHooks({ env: null });

    const tree = Command();
    const emptyView = findElement(tree, (element) => element.type === (List as typeof List).EmptyView);

    expect(emptyView?.props?.title).toBe("Loading environment...");
  });

  it("submits a query with the existing environment and opens the redirect", async () => {
    const cachedEnv = {
      context: "raycast",
      country: "us",
      data: { config: {}, shortcuts: {} },
      language: "en",
      logger: { logs: [] },
    };
    const suggestion = {
      argumentCount: "1",
      argumentString: "<query>",
      keyword: "g",
      namespace: "web",
      title: "Google",
      url: "https://google.com/search?q=%s",
    };

    mockHooks({
      env: cachedEnv,
      searchText: "g cats",
      suggestions: [suggestion],
    });

    mockGetRedirectResponse.mockImplementation((envQuery) => {
      expect(envQuery).toBeInstanceOf(Env);
      expect(typeof envQuery.logger.info).toBe("function");
      expect(envQuery.query).toBe("g cats");
      return { status: "found", redirectUrl: "https://example.com/cats" };
    });

    const tree = Command();
    const item = findElement(
      tree,
      (element) => element.type === (List as typeof List).Item && element.props?.title === "g",
    );
    const submitAction = findElement(item?.props?.actions, (element) => element.type === Action);

    expect(submitAction?.props?.onAction).toBeDefined();

    await submitAction?.props?.onAction?.();

    expect(mockGetRedirectResponse).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenNthCalledWith(1, Toast.Style.Animated, "Searching shortcut for", "g cats");
    expect(mockShowToast).toHaveBeenNthCalledWith(2, Toast.Style.Success, "Redirecting to", "https://example.com/cats");
    expect(mockOpen).toHaveBeenCalledWith("https://example.com/cats");
  });

  it("loads the environment from github preferences on first render", async () => {
    const prefs = { github: "octocat", language: "en", country: "us" };
    const populateSpy = jest.spyOn(Env.prototype, "populate").mockImplementation(async function (params) {
      Object.assign(this, params, {
        data: { config: {}, shortcuts: {} },
        namespaceInfos: [],
        namespaces: ["web"],
      });
    });

    mockGetPreferenceValues.mockReturnValue(prefs);
    const { setCachedPrefs, setEnv } = mockHooks({
      cachedPrefs: defaultPrefs,
      env: null,
    });
    mockUseEffect.mockImplementation((effect) => {
      effect();
    });

    Command();
    await flushMicrotasks();

    expect(setCachedPrefs).toHaveBeenCalledWith(prefs);
    expect(populateSpy).toHaveBeenCalledWith({ github: "octocat" }, { removeNamespaces: ["dpl", "dcm"] });
    expect(setEnv).toHaveBeenCalledTimes(1);
    expect(setEnv.mock.calls[0][0]).toBeInstanceOf(Env);
    expect(setEnv.mock.calls[0][0].github).toBe("octocat");

    populateSpy.mockRestore();
  });

  it("reloads the environment with reload=true and updates the success toast", async () => {
    const cachedEnv = {
      context: "raycast",
      country: "us",
      data: { config: {}, shortcuts: {} },
      language: "en",
      logger: { logs: [] },
    };
    const reloadToast = { style: null, title: "", message: "" };
    const populateSpy = jest.spyOn(Env.prototype, "populate").mockImplementation(async function (params) {
      Object.assign(this, params, {
        data: { config: {}, shortcuts: {} },
        namespaceInfos: [],
        namespaces: ["web"],
      });
    });

    mockShowToast.mockResolvedValue(reloadToast);
    const { setEnv } = mockHooks({
      env: cachedEnv,
      searchText: "reload",
    });

    const tree = Command();
    const submitItem = findElement(
      tree,
      (element) =>
        element.type === (List as typeof List).Item && element.props?.title === "Press Enter to submit the query",
    );
    const submitAction = findElement(submitItem?.props?.actions, (element) => element.type === Action);

    await submitAction?.props?.onAction?.();

    expect(populateSpy).toHaveBeenCalledWith({ language: "en", country: "us" }, { removeNamespaces: ["dpl", "dcm"] });
    expect(setEnv).toHaveBeenCalledTimes(1);
    expect(setEnv.mock.calls[0][0]).toBeInstanceOf(Env);
    expect(setEnv.mock.calls[0][0].reload).toBe(true);
    expect(reloadToast.style).toBe(Toast.Style.Success);
    expect(reloadToast.title).toBe("Reload successful");
    expect(reloadToast.message).toContain("Updated at");

    populateSpy.mockRestore();
  });

  it("builds example links with github preferences in suggestion details", () => {
    const prefs = { github: "octocat", language: "en", country: "us" };
    const cachedEnv = {
      context: "raycast",
      data: { config: {}, shortcuts: {} },
      github: "octocat",
      logger: { logs: [] },
    };
    const suggestion = {
      argumentCount: "1",
      argumentString: "<query>",
      description: "Searches the web",
      examples: [{ arguments: "cats", description: "Find cats" }],
      keyword: "g",
      namespace: "web",
      reachable: true,
      title: "Google",
      url: "https://google.com/search?q=%s",
    };

    mockGetPreferenceValues.mockReturnValue(prefs);
    mockHooks({
      env: cachedEnv,
      searchText: "g",
      suggestions: [suggestion],
    });

    const tree = Command();
    const item = findElement(
      tree,
      (element) => element.type === (List as typeof List).Item && element.props?.title === "g",
    );
    const detail = findElement(item?.props?.detail, (element) => element.type === (List as typeof List).Item.Detail);

    expect(detail?.props).toMatchObject({
      markdown: expect.stringContaining("github=octocat&query=g%20cats"),
    });
  });
});
