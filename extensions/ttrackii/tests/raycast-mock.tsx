import { createElement, type ReactNode } from "react";
import { vi } from "vitest";
export const values: Record<string, string> = {};
export const credentials = new Map<
  string,
  { accessToken: string; expiresIn?: number; isExpired: () => boolean }
>();
export const preferences = { serverUrl: "https://app.ttrackii.com" };
export const getPreferenceValues = () => preferences;
export const cacheValues = new Map<string, string>();
export class Cache {
  get(key: string) {
    return cacheValues.get(key);
  }
  set(key: string, value: string) {
    cacheValues.set(key, value);
  }
  remove(key: string) {
    cacheValues.delete(key);
  }
}
export const LocalStorage = {
  getItem: vi.fn(async (key: string) => values[key]),
  setItem: vi.fn(async (key: string, value: string) => {
    values[key] = value;
  }),
  removeItem: vi.fn(async (key: string) => {
    delete values[key];
  }),
  allItems: vi.fn(async () => ({ ...values })),
};
export const OAuth = {
  RedirectMethod: { Web: "web" },
  PKCEClient: class {
    constructor(private options: { providerId: string }) {}
    async getTokens() {
      return credentials.get(this.options.providerId);
    }
    async setTokens(value: { accessToken: string; expiresIn?: number }) {
      credentials.set(this.options.providerId, {
        ...value,
        isExpired: () => false,
      });
    }
    async removeTokens() {
      credentials.delete(this.options.providerId);
    }
  },
};
export const LaunchType = { Background: "background", UserInitiated: "user" };
export const launchCommand = vi.fn(async () => undefined);
export const open = vi.fn(async () => undefined);
export const environment = { launchType: "background", isDevelopment: false };
export const showHUD = vi.fn(async () => undefined);
export const popToRoot = vi.fn(async () => undefined);
export const openExtensionPreferences = vi.fn(async () => undefined);
export const confirmAlert = vi.fn(async () => true);
export const navigation = { pop: vi.fn(), push: vi.fn() };
export const useNavigation = () => navigation;
export const Alert = { ActionStyle: { Destructive: "destructive" } };
export const Color = new Proxy({}, { get: (_, property) => String(property) });
const shortcut = { modifiers: ["cmd"], key: "x" };
export const Keyboard = {
  Shortcut: {
    Common: new Proxy({}, { get: () => shortcut }),
  },
};
export const Toast = {
  Style: { Success: "success", Failure: "failure", Animated: "animated" },
};
export const showToast = vi.fn(async (options: Record<string, unknown>) => ({
  ...options,
}));
export const Icon = new Proxy({}, { get: (_, property) => String(property) });
function component(name: string) {
  return function MockComponent(props: {
    children?: ReactNode;
    actions?: ReactNode;
    searchBarAccessory?: ReactNode;
  }) {
    return createElement(
      name,
      props,
      props.children,
      props.actions,
      props.searchBarAccessory,
    );
  };
}
export const Detail = Object.assign(component("detail"), {
  Metadata: Object.assign(component("metadata"), {
    Label: component("label"),
  }),
});
export const ActionPanel = Object.assign(component("actions"), {
  Section: component("action-section"),
  Submenu: component("action-submenu"),
});
export const Action = Object.assign(component("action"), {
  Style: { Destructive: "destructive" },
  Push: component("push"),
  OpenInBrowser: component("browser"),
  CopyToClipboard: component("clipboard"),
  SubmitForm: component("submit"),
});
const Dropdown = Object.assign(component("dropdown"), {
  Item: component("option"),
});
export const Form = Object.assign(component("form"), {
  TextField: component("field"),
  Dropdown,
  TagPicker: Object.assign(component("tag-picker"), {
    Item: component("tag-option"),
  }),
  Separator: component("form-separator"),
  Description: component("description"),
});
export const List = Object.assign(component("list"), {
  Dropdown,
  Item: component("item"),
  Section: component("section"),
  EmptyView: component("empty"),
});
export const MenuBarExtra = Object.assign(component("menu"), {
  Item: component("menu-item"),
  Section: component("menu-section"),
});
