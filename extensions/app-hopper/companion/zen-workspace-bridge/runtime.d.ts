/* eslint-disable no-var -- Ambient var declarations describe browser properties on globalThis. */
// Narrow contracts for privileged Zen APIs used by the local bridge and probes.
interface ZenNativeTab {
  label: string;
  isConnected: boolean;
  linkedBrowser?: { currentURI: { spec: string } };
  hasAttribute(name: string): boolean;
  getAttribute(name: string): string;
}
interface ZenWorkspaceManager {
  activeWorkspace: string;
  allStoredTabs: Iterable<ZenNativeTab>;
  promiseInitialized: Promise<void>;
  changeWorkspaceWithID(id: string): Promise<void>;
  createAndSaveWorkspace(name: string): Promise<{ uuid: string } | null>;
}
interface ZenWindowWrapper {
  getTabs?: () => Iterable<unknown>;
}
interface ZenExtension {
  canAccessWindow(window: ZenBrowserWindow): boolean;
  windowManager: { getWrapper(window: ZenBrowserWindow): ZenWindowWrapper };
  tabManager: { getWrapper(tab: ZenNativeTab): unknown };
}
interface ZenPolicyRegistry {
  getByID(id: string): { extension?: ZenExtension } | undefined;
}
interface ZenBrowserWindow {
  closed: boolean;
  gZenWorkspaces?: ZenWorkspaceManager;
  gBrowserInit?: { delayedStartupFinished: boolean };
  WebExtensionPolicy?: ZenPolicyRegistry;
  gBrowser: {
    selectedTab: ZenNativeTab;
    selectedBrowser: { currentURI: { spec: string } };
    addTab(url: string, options: { triggeringPrincipal: unknown }): ZenNativeTab;
  };
  focus(): void;
}
interface ZenObserver {
  observe(subject: ZenBrowserWindow): void;
}
interface ZenServices {
  console: { logStringMessage(message: string): void };
  obs: {
    addObserver(observer: ZenObserver, topic: string): void;
    removeObserver(observer: ZenObserver, topic: string): void;
  };
  wm: {
    getEnumerator(type: string): Iterable<ZenBrowserWindow>;
    getMostRecentWindow(type: string): ZenBrowserWindow | null;
  };
  prefs: { setStringPref(name: string, value: string): void; savePrefFile(file: null): void };
  scriptSecurityManager: { getSystemPrincipal(): unknown };
}
interface ZenTabPatch {
  wrapper: ZenWindowWrapper;
  previous: PropertyDescriptor | undefined;
  replacement: () => Generator<unknown>;
}
interface ZenFile {
  initWithPath(path: string): void;
}
interface ZenTimerModule {
  setInterval(callback: () => void, delay: number): number;
  clearInterval(timer: number): void;
}
declare var Services: ZenServices;
declare var WebExtensionPolicy: ZenPolicyRegistry;
declare var ChromeUtils: {
  importESModule(uri: "resource://gre/modules/Timer.sys.mjs"): ZenTimerModule;
  importESModule(uri: "resource://gre/modules/AddonManager.sys.mjs"): {
    AddonManager: { installTemporaryAddon(file: ZenFile): Promise<unknown> };
  };
};
declare var Components: {
  classes: { "@mozilla.org/file/local;1": { createInstance(type: unknown): ZenFile } };
  interfaces: { nsIFile: unknown };
};
declare var appHopperZenBridge: { stop(): void } | undefined;
declare var appHopperZenProbe:
  | {
      rows: { index: number; title: string; workspace: string; current: boolean }[];
      focus(index: number): Promise<{ workspace: string; selected: boolean }>;
    }
  | undefined;
declare const APP_HOPPER_TEST_TOKEN: string;
declare const APP_HOPPER_TEST_EXTENSION: string;
