import { Preferences } from "~/types/preferences";

jest.mock(
  "@raycast/api",
  () => ({
    Alert: {
      ActionStyle: {
        Default: "DEFAULT",
        Cancel: "CANCEL",
        Destructive: "DESTRUCTIVE",
      },
    },
    environment: {
      raycastVersion: "1.0.0",
      extensionName: "bitwarden",
      commandName: "command-name",
      commandMode: "view",
      assetsPath: "/foo/bar",
      supportPath: "/foo/bar/baz",
      isDevelopment: true,
      theme: "dark",
      textSize: "medium",
      launchType: "userInitiated",
      launchContext: {},
    },
    getPreferenceValues: jest.fn(
      (): Preferences => ({
        cliPath: "/usr/local/bin/bw",
        clientId: "client-id",
        clientSecret: "client-secret",
        fetchFavicons: true,
        serverUrl: "https://bitwarden.example.com",
        serverCertsPath: "/foo/bar/baz",
        repromptIgnoreDuration: "0",
        generatePasswordQuickAction: "copyAndPaste",
        transientCopySearch: "always",
        transientCopyGeneratePassword: "always",
        transientCopyGeneratePasswordQuick: "always",
        shouldCacheVaultItems: true,
        windowActionOnCopy: "close",
      })
    ),
    LocalStorage: {
      allItems: jest.fn(),
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    Toast: {
      Style: {
        Success: "SUCCESS",
        Failure: "FAILURE",
        Animated: "ANIMATED",
      },
    },
    showToast: jest.fn(),
    Clipboard: {
      copy: jest.fn(),
      clear: jest.fn(),
      paste: jest.fn(),
      read: jest.fn(),
      readText: jest.fn(),
    },
    Cache: class MockCache {
      public allItems = jest.fn();
      public getItem = jest.fn();
      public setItem = jest.fn();
      public removeItem = jest.fn();
      public clear = jest.fn();
    },
    popToRoot: jest.fn(),
    closeMainWindow: jest.fn(),
    confirmAlert: jest.fn(),
    useNavigation: jest.fn(() => ({
      push: jest.fn(),
      pop: jest.fn(),
    })),
    showHUD: jest.fn(),
    Icon: {},
  }),
  { virtual: true }
);

jest.mock(
  "react",
  () => ({
    useEffect: jest.fn((fn) => fn()),
    useRef: jest.fn((current) => ({ current })),
    useState: jest.fn((initial) => {
      let state = typeof initial === "function" ? initial() : initial;
      const setState = jest.fn((newState) => {
        state = typeof newState === "function" ? newState(state) : newState;
      });
      return [state, setState];
    }),
    useMemo: jest.fn((fn) => fn()),
    useReducer: jest.fn((reducer, initialState) => {
      let state = initialState;
      const dispatch = jest.fn((action) => {
        state = reducer(state, action);
      });
      return [state, dispatch];
    }),
    useCallback: jest.fn((fn) => fn),
  }),
  { virtual: true }
);

jest.mock("~/utils/cache", () => {
  let cache: Record<string, any> = {};

  return {
    Cache: {
      get: jest.fn((key: string) => cache[key]),
      set: jest.fn((key: string, value: any) => (cache[key] = value)),
      clear: jest.fn(() => (cache = {})),
      isEmpty: Object.values(cache).length === 0,
    },
  };
});
