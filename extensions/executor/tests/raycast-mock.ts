import { mock } from "bun:test";

// One shared runtime stub prevents test files from replacing each other's app-only module.
export const raycastState = {
  preferences: { apiKey: "test-key", baseUrl: "https://executor.test", defaultOwner: "user" },
  inbox: new Map<string, string>(),
  failWrites: false,
  launches: [] as unknown[],
  preferencesOpened: 0,
  clipboard: "",
  revealedPaths: [] as string[],
  openedUrls: [] as string[],
};

mock.module("@raycast/api", () => ({
  Color: {},
  Icon: {},
  LaunchType: { UserInitiated: "userInitiated" },
  launchCommand: async (input: unknown) => {
    raycastState.launches.push(input);
  },
  openExtensionPreferences: async () => {
    raycastState.preferencesOpened++;
  },
  Clipboard: {
    copy: async (text: string) => {
      raycastState.clipboard = text;
    },
  },
  showInFinder: async (path: string) => {
    raycastState.revealedPaths.push(path);
  },
  open: async (url: string) => {
    raycastState.openedUrls.push(url);
  },
  environment: { supportPath: "/tmp/executor-raycast-test-support" },
  getPreferenceValues: () => raycastState.preferences,
  LocalStorage: {
    getItem: async (key: string) => raycastState.inbox.get(key),
    allItems: async () => Object.fromEntries(raycastState.inbox),
    setItem: async (key: string, value: string) => {
      if (raycastState.failWrites) throw new Error("Synthetic disk failure");
      raycastState.inbox.set(key, value);
    },
    removeItem: async (key: string) => {
      raycastState.inbox.delete(key);
    },
  },
}));
