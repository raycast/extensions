"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/utils/kittyAPI.ts
var kittyAPI_exports = {};
__export(kittyAPI_exports, {
  activateTab: () => activateTab,
  checkKittyAvailability: () => checkKittyAvailability,
  focusWindow: () => focusWindow,
  getActiveInstance: () => getActiveInstance,
  getActiveTab: () => getActiveTab,
  getDefaultSocketPath: () => getDefaultSocketPath,
  getKittySocketPath: () => getKittySocketPath,
  getTotalTabCount: () => getTotalTabCount,
  listKittyInstances: () => listKittyInstances,
  searchTabs: () => searchTabs
});
var import_child_process, import_util, execFileAsync, checkKittyAvailability, getDefaultSocketPath, getKittySocketPath, parseKittyListOutput, listKittyInstances, getActiveInstance, activateTab, focusWindow, getActiveTab, searchTabs, getTotalTabCount;
var init_kittyAPI = __esm({
  "src/utils/kittyAPI.ts"() {
    "use strict";
    import_child_process = require("child_process");
    import_util = require("util");
    execFileAsync = (0, import_util.promisify)(import_child_process.execFile);
    checkKittyAvailability = async () => {
      try {
        await execFileAsync("which", ["kitty"]);
        return true;
      } catch (error) {
        return false;
      }
    };
    getDefaultSocketPath = () => {
      const homeDir = process.env.HOME || process.env.USERPROFILE || "/tmp";
      return `${homeDir}/.local/share/kitty/kitty-socket`;
    };
    getKittySocketPath = () => {
      return process.env.KITTY_SOCKET_PATH || getDefaultSocketPath();
    };
    parseKittyListOutput = (output) => {
      try {
        const data = JSON.parse(output);
        const windows = Array.isArray(data) ? data : [data];
        const instancesMap = /* @__PURE__ */ new Map();
        for (const window of windows) {
          const instanceId = window.platform_window_id || 1;
          if (!instancesMap.has(instanceId)) {
            instancesMap.set(instanceId, {
              pid: instanceId,
              title: `Kitty Instance ${instanceId}`,
              windows: []
            });
          }
          const instance = instancesMap.get(instanceId);
          const windowObj = {
            id: window.id,
            tabs: [],
            isActive: window.is_active || false,
            platformWindowId: window.platform_window_id,
            title: `Window ${window.id}`
          };
          if (window.tabs && Array.isArray(window.tabs)) {
            for (const tab of window.tabs) {
              const activeWindow = tab.windows?.find((w) => w.is_active) || tab.windows?.[0];
              if (activeWindow) {
                const tabObj = {
                  id: activeWindow.id,
                  title: activeWindow.title || "Untitled",
                  workingDirectory: activeWindow.cwd || "",
                  pid: activeWindow.pid,
                  windowId: window.id,
                  isActive: activeWindow.is_active || false,
                  foregroundProcessName: activeWindow.foreground_processes?.[0]?.cmdline?.[0]
                };
                windowObj.tabs.push(tabObj);
              }
            }
          }
          instance.windows.push(windowObj);
        }
        return Array.from(instancesMap.values());
      } catch (error) {
        console.error("Failed to parse kitty list output:", error);
        return [];
      }
    };
    listKittyInstances = async () => {
      try {
        const { stdout } = await execFileAsync("kitty", ["@", "ls"], {
          timeout: 5e3
        });
        return parseKittyListOutput(stdout);
      } catch (error) {
        console.error("Failed to list kitty instances:", error);
        throw new Error(
          `Failed to list kitty instances: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    };
    getActiveInstance = async () => {
      try {
        const instances = await listKittyInstances();
        return instances.find((inst) => inst.windows.some((win) => win.isActive)) || null;
      } catch (error) {
        console.error("Failed to get active instance:", error);
        return null;
      }
    };
    activateTab = async (windowId) => {
      try {
        const args = ["@", "focus-window", "--match", `id:${windowId}`];
        await execFileAsync("kitty", args, {
          timeout: 5e3
        });
      } catch (error) {
        console.error("Failed to activate tab:", error);
        throw new Error(
          `Failed to activate tab (window ${windowId}): ${error instanceof Error ? error.message : String(error)}`
        );
      }
    };
    focusWindow = async (windowId) => {
      try {
        await execFileAsync("kitty", ["@", "focus-window", "--match", `id:${windowId}`], {
          timeout: 5e3
        });
      } catch (error) {
        console.error("Failed to focus window:", error);
        throw new Error(
          `Failed to focus window ${windowId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    };
    getActiveTab = async () => {
      try {
        const { stdout } = await execFileAsync("kitty", ["+kitten", "get-active-tab"], {
          timeout: 5e3
        });
        const lines = stdout.trim().split("\n");
        if (lines.length === 0) return null;
        const firstLine = lines[0];
        if (!firstLine) return null;
        const parts = firstLine.split("|");
        if (parts.length < 6) return null;
        const [, windowIdStr, tabId, title, cwd, processName] = parts;
        return {
          id: parseInt(tabId ?? "0", 10),
          title: title ?? "Untitled",
          workingDirectory: cwd ?? "",
          pid: parseInt(processName ?? tabId ?? "0", 10),
          windowId: parseInt(windowIdStr ?? "0", 10),
          isActive: true,
          foregroundProcessName: processName ?? void 0
        };
      } catch (error) {
        console.error("Failed to get active tab:", error);
        return null;
      }
    };
    searchTabs = async (query) => {
      try {
        const instances = await listKittyInstances();
        const allTabs = instances.flatMap((instance) => instance.windows.flatMap((window) => window.tabs));
        if (!query.trim()) {
          return allTabs;
        }
        const lowerQuery = query.toLowerCase();
        return allTabs.filter(
          (tab) => tab.title.toLowerCase().includes(lowerQuery) || tab.workingDirectory.toLowerCase().includes(lowerQuery) || tab.foregroundProcessName?.toLowerCase().includes(lowerQuery)
        );
      } catch (error) {
        console.error("Failed to search tabs:", error);
        throw error;
      }
    };
    getTotalTabCount = async () => {
      try {
        const instances = await listKittyInstances();
        return instances.reduce((total, instance) => {
          return total + instance.windows.reduce((winTotal, window) => {
            return winTotal + window.tabs.length;
          }, 0);
        }, 0);
      } catch (error) {
        console.error("Failed to get total tab count:", error);
        return 0;
      }
    };
  }
});

// src/list-tabs.tsx
var list_tabs_exports = {};
__export(list_tabs_exports, {
  default: () => list_tabs_default
});
module.exports = __toCommonJS(list_tabs_exports);

// src/commands/listTabs.tsx
var import_react = require("react");
var import_api4 = require("@raycast/api");

// src/components/TabList.tsx
var import_api2 = require("@raycast/api");

// src/components/TabItem.tsx
var import_api = require("@raycast/api");
init_kittyAPI();
var import_jsx_runtime = (
  // @ts-expect-error - Raycast API type compatibility with React 18
  require("react/jsx-runtime")
);
function TabItem({ tab, onActivate }) {
  const handleActivate = async () => {
    try {
      await activateTab(tab.windowId);
      onActivate();
    } catch (error) {
      await (0, import_api.showToast)({
        style: import_api.Toast.Style.Failure,
        title: "Failed to activate tab",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  };
  const handleFocusWindow = async () => {
    try {
      await focusWindow(tab.windowId);
      onActivate();
    } catch (error) {
      await (0, import_api.showToast)({
        style: import_api.Toast.Style.Failure,
        title: "Failed to focus window",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  };
  const icon = tab.isActive ? "\u2705" : "\u{1F4C4}";
  const subtitle = tab.foregroundProcessName ? `${tab.workingDirectory} \u2022 ${tab.foregroundProcessName}` : tab.workingDirectory;
  return (
    // @ts-expect-error - Raycast API type compatibility with React 18
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      import_api.List.Item,
      {
        id: `${tab.windowId}-${tab.id}`,
        title: tab.title || "Untitled",
        subtitle,
        icon,
        keywords: [tab.workingDirectory, tab.foregroundProcessName || "", tab.title],
        actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_api.ActionPanel, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api.Action, { title: "Activate Tab", onAction: handleActivate }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api.Action, { title: "Focus Window", onAction: handleFocusWindow }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api.Action.CopyToClipboard, { title: "Copy Working Directory", content: tab.workingDirectory }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api.Action.CopyToClipboard, { title: "Copy Tab Title", content: tab.title })
        ] })
      }
    )
  );
}

// src/components/TabList.tsx
var import_jsx_runtime2 = (
  // @ts-expect-error - Raycast API type compatibility with React 18
  require("react/jsx-runtime")
);
function TabList({ tabs, isLoading, onActivate }) {
  const windows = tabs.reduce(
    (acc, tab) => {
      const windowId = tab.windowId;
      if (!acc[windowId]) {
        acc[windowId] = {
          id: windowId,
          tabs: [],
          isActive: tab.isActive
        };
      }
      acc[windowId].tabs.push(tab);
      return acc;
    },
    {}
  );
  const sortedWindows = Object.values(windows).sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    return a.id - b.id;
  });
  return (
    // @ts-expect-error - Raycast API type compatibility with React 18
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_api2.List, { isLoading, searchBarPlaceholder: "Search tabs...", children: sortedWindows.length === 0 && !isLoading ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      import_api2.List.EmptyView,
      {
        title: "No tabs found",
        description: "Make sure Kitty terminal is running",
        icon: "\u{1F50D}"
      }
    ) : sortedWindows.map((window) => (
      // @ts-expect-error - Raycast API type compatibility with React 18
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        import_api2.List.Section,
        {
          title: `Window ${window.id}`,
          subtitle: `${window.tabs.length} tab${window.tabs.length !== 1 ? "s" : ""}${window.isActive ? " \u2022 Active" : ""}`,
          children: window.tabs.map((tab) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(TabItem, { tab, onActivate }, tab.id))
        },
        window.id
      )
    )) })
  );
}

// src/commands/listTabs.tsx
init_kittyAPI();

// src/utils/errorHandler.ts
var import_api3 = require("@raycast/api");
var handleError = async ({
  operation,
  error,
  showToast: shouldShowToast = true
}) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const fullMessage = `${operation} failed: ${errorMessage}`;
  console.error(`[ERROR] ${operation}:`, error);
  if (shouldShowToast) {
    await (0, import_api3.showToast)({
      style: import_api3.Toast.Style.Failure,
      title: operation,
      message: errorMessage
    });
  }
  return fullMessage;
};
var validateKittyAvailability = async () => {
  try {
    const { checkKittyAvailability: checkKittyAvailability2 } = await Promise.resolve().then(() => (init_kittyAPI(), kittyAPI_exports));
    const isAvailable = await checkKittyAvailability2();
    if (!isAvailable) {
      await (0, import_api3.showToast)({
        style: import_api3.Toast.Style.Failure,
        title: "Kitty not found",
        message: "Please install Kitty terminal emulator from https://sw.kovidgoyal.net/kitty/"
      });
      return false;
    }
    return true;
  } catch (error) {
    await handleError({
      operation: "Validate Kitty availability",
      error
    });
    return false;
  }
};

// src/utils/cache.ts
var KittyCache = class {
  instances = null;
  tabs = null;
  DEFAULT_DURATION = 1e3;
  // 1 second
  setInstances(instances) {
    this.instances = {
      data: instances,
      timestamp: Date.now()
    };
  }
  getInstances() {
    if (!this.instances) return null;
    const age = Date.now() - this.instances.timestamp;
    if (age > this.DEFAULT_DURATION) {
      this.instances = null;
      return null;
    }
    return this.instances.data;
  }
  setTabs(tabs) {
    this.tabs = {
      data: tabs,
      timestamp: Date.now()
    };
  }
  getTabs() {
    if (!this.tabs) return null;
    const age = Date.now() - this.tabs.timestamp;
    if (age > this.DEFAULT_DURATION) {
      this.tabs = null;
      return null;
    }
    return this.tabs.data;
  }
  clear() {
    this.instances = null;
    this.tabs = null;
  }
  clearInstances() {
    this.instances = null;
  }
  clearTabs() {
    this.tabs = null;
  }
};
var kittyCache = new KittyCache();

// src/commands/listTabs.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
function ListTabs() {
  const [tabs, setTabs] = (0, import_react.useState)([]);
  const [isLoading, setIsLoading] = (0, import_react.useState)(true);
  const [searchText] = (0, import_react.useState)("");
  const [, setError] = (0, import_react.useState)(null);
  const loadTabs = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);
      if (!forceRefresh) {
        const cachedTabs = kittyCache.getTabs();
        if (cachedTabs) {
          setTabs(cachedTabs);
          setIsLoading(false);
          return;
        }
      }
      const isKittyAvailable = await validateKittyAvailability();
      if (!isKittyAvailable) {
        setError("Kitty terminal not found");
        setIsLoading(false);
        return;
      }
      const instances = await listKittyInstances();
      if (instances.length === 0) {
        setTabs([]);
        setIsLoading(false);
        return;
      }
      const allTabs = instances.flatMap((instance) => instance.windows.flatMap((window) => window.tabs));
      kittyCache.setTabs(allTabs);
      setTabs(allTabs);
      if (allTabs.length === 0) {
        await (0, import_api4.showToast)({
          style: import_api4.Toast.Style.Success,
          title: "No tabs found",
          message: "Open a terminal in Kitty to see it here"
        });
      }
    } catch (err) {
      const errorMessage = await handleError({
        operation: "Load tabs",
        error: err
      });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  const handleActivate = () => {
  };
  (0, import_react.useEffect)(() => {
    loadTabs();
  }, []);
  const filteredTabs = (0, import_react.useMemo)(() => {
    if (!searchText.trim()) {
      return tabs;
    }
    const query = searchText.toLowerCase();
    return tabs.filter(
      (tab) => tab.title.toLowerCase().includes(query) || tab.workingDirectory.toLowerCase().includes(query) || tab.foregroundProcessName?.toLowerCase().includes(query)
    );
  }, [tabs, searchText]);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(TabList, { tabs: filteredTabs, isLoading, onActivate: handleActivate });
}

// src/list-tabs.tsx
var list_tabs_default = ListTabs;
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3V0aWxzL2tpdHR5QVBJLnRzIiwgIi4uL3NyYy9saXN0LXRhYnMudHN4IiwgIi4uL3NyYy9jb21tYW5kcy9saXN0VGFicy50c3giLCAiLi4vc3JjL2NvbXBvbmVudHMvVGFiTGlzdC50c3giLCAiLi4vc3JjL2NvbXBvbmVudHMvVGFiSXRlbS50c3giLCAiLi4vc3JjL3V0aWxzL2Vycm9ySGFuZGxlci50cyIsICIuLi9zcmMvdXRpbHMvY2FjaGUudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogS2l0dHkgQVBJIHV0aWxpdHkgZnVuY3Rpb25zIGZvciBpbnRlcmFjdGluZyB3aXRoIEtpdHR5IHRlcm1pbmFsXG4gKi9cblxuaW1wb3J0IHsgZXhlY0ZpbGUgfSBmcm9tICdjaGlsZF9wcm9jZXNzJ1xuaW1wb3J0IHsgcHJvbWlzaWZ5IH0gZnJvbSAndXRpbCdcbmltcG9ydCB0eXBlIHsgS2l0dHlUYWIsIEtpdHR5V2luZG93LCBLaXR0eUluc3RhbmNlIH0gZnJvbSAnLi4vdHlwZXMnXG5cbmNvbnN0IGV4ZWNGaWxlQXN5bmMgPSBwcm9taXNpZnkoZXhlY0ZpbGUpXG5cbi8qKlxuICogQ2hlY2sgaWYga2l0dHkgaXMgYXZhaWxhYmxlIG9uIHRoZSBzeXN0ZW1cbiAqL1xuZXhwb3J0IGNvbnN0IGNoZWNrS2l0dHlBdmFpbGFiaWxpdHkgPSBhc3luYyAoKTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gIHRyeSB7XG4gICAgYXdhaXQgZXhlY0ZpbGVBc3luYygnd2hpY2gnLCBbJ2tpdHR5J10pXG4gICAgcmV0dXJuIHRydWVcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG4vKipcbiAqIEdldCB0aGUgZGVmYXVsdCBraXR0eSBzb2NrZXQgcGF0aFxuICovXG5leHBvcnQgY29uc3QgZ2V0RGVmYXVsdFNvY2tldFBhdGggPSAoKTogc3RyaW5nID0+IHtcbiAgY29uc3QgaG9tZURpciA9IHByb2Nlc3MuZW52LkhPTUUgfHwgcHJvY2Vzcy5lbnYuVVNFUlBST0ZJTEUgfHwgJy90bXAnXG4gIHJldHVybiBgJHtob21lRGlyfS8ubG9jYWwvc2hhcmUva2l0dHkva2l0dHktc29ja2V0YFxufVxuXG4vKipcbiAqIEdldCBraXR0eSBzb2NrZXQgcGF0aCBmcm9tIGVudmlyb25tZW50IG9yIGRlZmF1bHRcbiAqL1xuZXhwb3J0IGNvbnN0IGdldEtpdHR5U29ja2V0UGF0aCA9ICgpOiBzdHJpbmcgPT4ge1xuICByZXR1cm4gcHJvY2Vzcy5lbnYuS0lUVFlfU09DS0VUX1BBVEggfHwgZ2V0RGVmYXVsdFNvY2tldFBhdGgoKVxufVxuXG4vKipcbiAqIFBhcnNlIGtpdHR5IEAgbHMgSlNPTiBvdXRwdXQgdG8gZXh0cmFjdCB3aW5kb3cgYW5kIHRhYiBpbmZvcm1hdGlvblxuICovXG5jb25zdCBwYXJzZUtpdHR5TGlzdE91dHB1dCA9IChvdXRwdXQ6IHN0cmluZyk6IEtpdHR5SW5zdGFuY2VbXSA9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2Uob3V0cHV0KVxuXG4gICAgLy8gS2l0dHkgQCBscyByZXR1cm5zIGFuIGFycmF5IG9mIHdpbmRvd3NcbiAgICBjb25zdCB3aW5kb3dzID0gQXJyYXkuaXNBcnJheShkYXRhKSA/IGRhdGEgOiBbZGF0YV1cblxuICAgIC8vIEdyb3VwIHdpbmRvd3MgYnkgdGhlaXIgT1Mgd2luZG93IChraXR0eSBpbnN0YW5jZSlcbiAgICBjb25zdCBpbnN0YW5jZXNNYXAgPSBuZXcgTWFwPG51bWJlciwgS2l0dHlJbnN0YW5jZT4oKVxuXG4gICAgZm9yIChjb25zdCB3aW5kb3cgb2Ygd2luZG93cykge1xuICAgICAgY29uc3QgaW5zdGFuY2VJZCA9IHdpbmRvdy5wbGF0Zm9ybV93aW5kb3dfaWQgfHwgMSAvLyBEZWZhdWx0IHRvIDEgaWYgbm8gcGxhdGZvcm0gSURcblxuICAgICAgaWYgKCFpbnN0YW5jZXNNYXAuaGFzKGluc3RhbmNlSWQpKSB7XG4gICAgICAgIGluc3RhbmNlc01hcC5zZXQoaW5zdGFuY2VJZCwge1xuICAgICAgICAgIHBpZDogaW5zdGFuY2VJZCxcbiAgICAgICAgICB0aXRsZTogYEtpdHR5IEluc3RhbmNlICR7aW5zdGFuY2VJZH1gLFxuICAgICAgICAgIHdpbmRvd3M6IFtdLFxuICAgICAgICB9KVxuICAgICAgfVxuXG4gICAgICBjb25zdCBpbnN0YW5jZSA9IGluc3RhbmNlc01hcC5nZXQoaW5zdGFuY2VJZCkhXG5cbiAgICAgIC8vIENyZWF0ZSB3aW5kb3cgb2JqZWN0XG4gICAgICBjb25zdCB3aW5kb3dPYmo6IEtpdHR5V2luZG93ID0ge1xuICAgICAgICBpZDogd2luZG93LmlkLFxuICAgICAgICB0YWJzOiBbXSxcbiAgICAgICAgaXNBY3RpdmU6IHdpbmRvdy5pc19hY3RpdmUgfHwgZmFsc2UsXG4gICAgICAgIHBsYXRmb3JtV2luZG93SWQ6IHdpbmRvdy5wbGF0Zm9ybV93aW5kb3dfaWQsXG4gICAgICAgIHRpdGxlOiBgV2luZG93ICR7d2luZG93LmlkfWAsXG4gICAgICB9XG5cbiAgICAgIC8vIFByb2Nlc3MgdGFicyBpbiB0aGlzIHdpbmRvd1xuICAgICAgaWYgKHdpbmRvdy50YWJzICYmIEFycmF5LmlzQXJyYXkod2luZG93LnRhYnMpKSB7XG4gICAgICAgIGZvciAoY29uc3QgdGFiIG9mIHdpbmRvdy50YWJzKSB7XG4gICAgICAgICAgLy8gR2V0IHRoZSBhY3RpdmUgd2luZG93IGluIHRoaXMgdGFiXG4gICAgICAgICAgY29uc3QgYWN0aXZlV2luZG93ID1cbiAgICAgICAgICAgIHRhYi53aW5kb3dzPy5maW5kKCh3OiB7IGlzX2FjdGl2ZTogYm9vbGVhbiB9KSA9PiB3LmlzX2FjdGl2ZSkgfHwgdGFiLndpbmRvd3M/LlswXVxuXG4gICAgICAgICAgaWYgKGFjdGl2ZVdpbmRvdykge1xuICAgICAgICAgICAgY29uc3QgdGFiT2JqOiBLaXR0eVRhYiA9IHtcbiAgICAgICAgICAgICAgaWQ6IGFjdGl2ZVdpbmRvdy5pZCxcbiAgICAgICAgICAgICAgdGl0bGU6IGFjdGl2ZVdpbmRvdy50aXRsZSB8fCAnVW50aXRsZWQnLFxuICAgICAgICAgICAgICB3b3JraW5nRGlyZWN0b3J5OiBhY3RpdmVXaW5kb3cuY3dkIHx8ICcnLFxuICAgICAgICAgICAgICBwaWQ6IGFjdGl2ZVdpbmRvdy5waWQsXG4gICAgICAgICAgICAgIHdpbmRvd0lkOiB3aW5kb3cuaWQsXG4gICAgICAgICAgICAgIGlzQWN0aXZlOiBhY3RpdmVXaW5kb3cuaXNfYWN0aXZlIHx8IGZhbHNlLFxuICAgICAgICAgICAgICBmb3JlZ3JvdW5kUHJvY2Vzc05hbWU6IGFjdGl2ZVdpbmRvdy5mb3JlZ3JvdW5kX3Byb2Nlc3Nlcz8uWzBdPy5jbWRsaW5lPy5bMF0sXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHdpbmRvd09iai50YWJzLnB1c2godGFiT2JqKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpbnN0YW5jZS53aW5kb3dzLnB1c2god2luZG93T2JqKVxuICAgIH1cblxuICAgIHJldHVybiBBcnJheS5mcm9tKGluc3RhbmNlc01hcC52YWx1ZXMoKSlcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcGFyc2Uga2l0dHkgbGlzdCBvdXRwdXQ6JywgZXJyb3IpXG4gICAgcmV0dXJuIFtdXG4gIH1cbn1cblxuLyoqXG4gKiBMaXN0IGFsbCBraXR0eSBpbnN0YW5jZXMgYW5kIHRoZWlyIHRhYnMgdXNpbmcga2l0dGVuIEBcbiAqL1xuZXhwb3J0IGNvbnN0IGxpc3RLaXR0eUluc3RhbmNlcyA9IGFzeW5jICgpOiBQcm9taXNlPEtpdHR5SW5zdGFuY2VbXT4gPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdraXR0eScsIFsnQCcsICdscyddLCB7XG4gICAgICB0aW1lb3V0OiA1MDAwLFxuICAgIH0pXG5cbiAgICByZXR1cm4gcGFyc2VLaXR0eUxpc3RPdXRwdXQoc3Rkb3V0KVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBsaXN0IGtpdHR5IGluc3RhbmNlczonLCBlcnJvcilcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgRmFpbGVkIHRvIGxpc3Qga2l0dHkgaW5zdGFuY2VzOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gXG4gICAgKVxuICB9XG59XG5cbi8qKlxuICogR2V0IGFjdGl2ZSBraXR0eSBpbnN0YW5jZSAodGhlIG9uZSB3aXRoIGFjdGl2ZSB3aW5kb3dzKVxuICovXG5leHBvcnQgY29uc3QgZ2V0QWN0aXZlSW5zdGFuY2UgPSBhc3luYyAoKTogUHJvbWlzZTxLaXR0eUluc3RhbmNlIHwgbnVsbD4gPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IGluc3RhbmNlcyA9IGF3YWl0IGxpc3RLaXR0eUluc3RhbmNlcygpXG4gICAgcmV0dXJuIGluc3RhbmNlcy5maW5kKGluc3QgPT4gaW5zdC53aW5kb3dzLnNvbWUod2luID0+IHdpbi5pc0FjdGl2ZSkpIHx8IG51bGxcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gZ2V0IGFjdGl2ZSBpbnN0YW5jZTonLCBlcnJvcilcbiAgICByZXR1cm4gbnVsbFxuICB9XG59XG5cbi8qKlxuICogQWN0aXZhdGUgYSBzcGVjaWZpYyB0YWIvd2luZG93XG4gKi9cbmV4cG9ydCBjb25zdCBhY3RpdmF0ZVRhYiA9IGFzeW5jICh3aW5kb3dJZDogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgYXJncyA9IFsnQCcsICdmb2N1cy13aW5kb3cnLCAnLS1tYXRjaCcsIGBpZDoke3dpbmRvd0lkfWBdXG5cbiAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdraXR0eScsIGFyZ3MsIHtcbiAgICAgIHRpbWVvdXQ6IDUwMDAsXG4gICAgfSlcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gYWN0aXZhdGUgdGFiOicsIGVycm9yKVxuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBGYWlsZWQgdG8gYWN0aXZhdGUgdGFiICh3aW5kb3cgJHt3aW5kb3dJZH0pOiAke1xuICAgICAgICBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcilcbiAgICAgIH1gXG4gICAgKVxuICB9XG59XG5cbi8qKlxuICogRm9jdXMgYSBzcGVjaWZpYyB3aW5kb3dcbiAqL1xuZXhwb3J0IGNvbnN0IGZvY3VzV2luZG93ID0gYXN5bmMgKHdpbmRvd0lkOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgdHJ5IHtcbiAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdraXR0eScsIFsnQCcsICdmb2N1cy13aW5kb3cnLCAnLS1tYXRjaCcsIGBpZDoke3dpbmRvd0lkfWBdLCB7XG4gICAgICB0aW1lb3V0OiA1MDAwLFxuICAgIH0pXG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGZvY3VzIHdpbmRvdzonLCBlcnJvcilcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgRmFpbGVkIHRvIGZvY3VzIHdpbmRvdyAke3dpbmRvd0lkfTogJHtcbiAgICAgICAgZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpXG4gICAgICB9YFxuICAgIClcbiAgfVxufVxuXG4vKipcbiAqIEdldCBjdXJyZW50IGFjdGl2ZSB0YWJcbiAqL1xuZXhwb3J0IGNvbnN0IGdldEFjdGl2ZVRhYiA9IGFzeW5jICgpOiBQcm9taXNlPEtpdHR5VGFiIHwgbnVsbD4gPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdraXR0eScsIFsnK2tpdHRlbicsICdnZXQtYWN0aXZlLXRhYiddLCB7XG4gICAgICB0aW1lb3V0OiA1MDAwLFxuICAgIH0pXG5cbiAgICBjb25zdCBsaW5lcyA9IHN0ZG91dC50cmltKCkuc3BsaXQoJ1xcbicpXG4gICAgaWYgKGxpbmVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIG51bGxcblxuICAgIGNvbnN0IGZpcnN0TGluZSA9IGxpbmVzWzBdXG4gICAgaWYgKCFmaXJzdExpbmUpIHJldHVybiBudWxsXG5cbiAgICBjb25zdCBwYXJ0cyA9IGZpcnN0TGluZS5zcGxpdCgnfCcpXG4gICAgaWYgKHBhcnRzLmxlbmd0aCA8IDYpIHJldHVybiBudWxsXG5cbiAgICBjb25zdCBbLCB3aW5kb3dJZFN0ciwgdGFiSWQsIHRpdGxlLCBjd2QsIHByb2Nlc3NOYW1lXSA9IHBhcnRzXG5cbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHBhcnNlSW50KHRhYklkID8/ICcwJywgMTApLFxuICAgICAgdGl0bGU6IHRpdGxlID8/ICdVbnRpdGxlZCcsXG4gICAgICB3b3JraW5nRGlyZWN0b3J5OiBjd2QgPz8gJycsXG4gICAgICBwaWQ6IHBhcnNlSW50KHByb2Nlc3NOYW1lID8/IHRhYklkID8/ICcwJywgMTApLFxuICAgICAgd2luZG93SWQ6IHBhcnNlSW50KHdpbmRvd0lkU3RyID8/ICcwJywgMTApLFxuICAgICAgaXNBY3RpdmU6IHRydWUsXG4gICAgICBmb3JlZ3JvdW5kUHJvY2Vzc05hbWU6IHByb2Nlc3NOYW1lID8/IHVuZGVmaW5lZCxcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGdldCBhY3RpdmUgdGFiOicsIGVycm9yKVxuICAgIHJldHVybiBudWxsXG4gIH1cbn1cblxuLyoqXG4gKiBTZWFyY2ggdGFicyBieSBxdWVyeVxuICovXG5leHBvcnQgY29uc3Qgc2VhcmNoVGFicyA9IGFzeW5jIChxdWVyeTogc3RyaW5nKTogUHJvbWlzZTxLaXR0eVRhYltdPiA9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgaW5zdGFuY2VzID0gYXdhaXQgbGlzdEtpdHR5SW5zdGFuY2VzKClcbiAgICBjb25zdCBhbGxUYWJzID0gaW5zdGFuY2VzLmZsYXRNYXAoaW5zdGFuY2UgPT4gaW5zdGFuY2Uud2luZG93cy5mbGF0TWFwKHdpbmRvdyA9PiB3aW5kb3cudGFicykpXG5cbiAgICBpZiAoIXF1ZXJ5LnRyaW0oKSkge1xuICAgICAgcmV0dXJuIGFsbFRhYnNcbiAgICB9XG5cbiAgICBjb25zdCBsb3dlclF1ZXJ5ID0gcXVlcnkudG9Mb3dlckNhc2UoKVxuICAgIHJldHVybiBhbGxUYWJzLmZpbHRlcihcbiAgICAgIHRhYiA9PlxuICAgICAgICB0YWIudGl0bGUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlclF1ZXJ5KSB8fFxuICAgICAgICB0YWIud29ya2luZ0RpcmVjdG9yeS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGxvd2VyUXVlcnkpIHx8XG4gICAgICAgIHRhYi5mb3JlZ3JvdW5kUHJvY2Vzc05hbWU/LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMobG93ZXJRdWVyeSlcbiAgICApXG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHNlYXJjaCB0YWJzOicsIGVycm9yKVxuICAgIHRocm93IGVycm9yXG4gIH1cbn1cblxuLyoqXG4gKiBDb3VudCB0b3RhbCBudW1iZXIgb2YgdGFicyBhY3Jvc3MgYWxsIGluc3RhbmNlc1xuICovXG5leHBvcnQgY29uc3QgZ2V0VG90YWxUYWJDb3VudCA9IGFzeW5jICgpOiBQcm9taXNlPG51bWJlcj4gPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IGluc3RhbmNlcyA9IGF3YWl0IGxpc3RLaXR0eUluc3RhbmNlcygpXG4gICAgcmV0dXJuIGluc3RhbmNlcy5yZWR1Y2UoKHRvdGFsLCBpbnN0YW5jZSkgPT4ge1xuICAgICAgcmV0dXJuIChcbiAgICAgICAgdG90YWwgK1xuICAgICAgICBpbnN0YW5jZS53aW5kb3dzLnJlZHVjZSgod2luVG90YWwsIHdpbmRvdykgPT4ge1xuICAgICAgICAgIHJldHVybiB3aW5Ub3RhbCArIHdpbmRvdy50YWJzLmxlbmd0aFxuICAgICAgICB9LCAwKVxuICAgICAgKVxuICAgIH0sIDApXG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGdldCB0b3RhbCB0YWIgY291bnQ6JywgZXJyb3IpXG4gICAgcmV0dXJuIDBcbiAgfVxufVxuIiwgImltcG9ydCBMaXN0VGFicyBmcm9tICcuL2NvbW1hbmRzL2xpc3RUYWJzJ1xuXG5leHBvcnQgZGVmYXVsdCBMaXN0VGFic1xuIiwgIi8qKlxuICogTWFpbiBjb21tYW5kIHRvIGxpc3QgYW5kIG1hbmFnZSBLaXR0eSB0ZXJtaW5hbCB0YWJzXG4gKi9cblxuaW1wb3J0IHsgdXNlU3RhdGUsIHVzZUVmZmVjdCwgdXNlTWVtbyB9IGZyb20gJ3JlYWN0J1xuaW1wb3J0IHsgc2hvd1RvYXN0LCBUb2FzdCB9IGZyb20gJ0ByYXljYXN0L2FwaSdcbmltcG9ydCBUYWJMaXN0IGZyb20gJy4uL2NvbXBvbmVudHMvVGFiTGlzdCdcbmltcG9ydCB7IGxpc3RLaXR0eUluc3RhbmNlcyB9IGZyb20gJy4uL3V0aWxzL2tpdHR5QVBJJ1xuaW1wb3J0IHsgaGFuZGxlRXJyb3IsIHZhbGlkYXRlS2l0dHlBdmFpbGFiaWxpdHkgfSBmcm9tICcuLi91dGlscy9lcnJvckhhbmRsZXInXG5pbXBvcnQgeyBraXR0eUNhY2hlIH0gZnJvbSAnLi4vdXRpbHMvY2FjaGUnXG5pbXBvcnQgdHlwZSB7IEtpdHR5VGFiIH0gZnJvbSAnLi4vdHlwZXMnXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIExpc3RUYWJzKCkge1xuICBjb25zdCBbdGFicywgc2V0VGFic10gPSB1c2VTdGF0ZTxLaXR0eVRhYltdPihbXSlcbiAgY29uc3QgW2lzTG9hZGluZywgc2V0SXNMb2FkaW5nXSA9IHVzZVN0YXRlKHRydWUpXG4gIGNvbnN0IFtzZWFyY2hUZXh0XSA9IHVzZVN0YXRlKCcnKVxuICBjb25zdCBbLCBzZXRFcnJvcl0gPSB1c2VTdGF0ZTxzdHJpbmcgfCBudWxsPihudWxsKVxuXG4gIGNvbnN0IGxvYWRUYWJzID0gYXN5bmMgKGZvcmNlUmVmcmVzaDogYm9vbGVhbiA9IGZhbHNlKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIHNldElzTG9hZGluZyh0cnVlKVxuICAgICAgc2V0RXJyb3IobnVsbClcblxuICAgICAgLy8gQ2hlY2sgY2FjaGUgZmlyc3QgKHVubGVzcyBmb3JjaW5nIHJlZnJlc2gpXG4gICAgICBpZiAoIWZvcmNlUmVmcmVzaCkge1xuICAgICAgICBjb25zdCBjYWNoZWRUYWJzID0ga2l0dHlDYWNoZS5nZXRUYWJzKClcbiAgICAgICAgaWYgKGNhY2hlZFRhYnMpIHtcbiAgICAgICAgICBzZXRUYWJzKGNhY2hlZFRhYnMpXG4gICAgICAgICAgc2V0SXNMb2FkaW5nKGZhbHNlKVxuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIFZhbGlkYXRlIGtpdHR5IGF2YWlsYWJpbGl0eVxuICAgICAgY29uc3QgaXNLaXR0eUF2YWlsYWJsZSA9IGF3YWl0IHZhbGlkYXRlS2l0dHlBdmFpbGFiaWxpdHkoKVxuICAgICAgaWYgKCFpc0tpdHR5QXZhaWxhYmxlKSB7XG4gICAgICAgIHNldEVycm9yKCdLaXR0eSB0ZXJtaW5hbCBub3QgZm91bmQnKVxuICAgICAgICBzZXRJc0xvYWRpbmcoZmFsc2UpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICAvLyBHZXQgYWxsIGluc3RhbmNlcyBhbmQgZmxhdHRlbiB0byB0YWJzXG4gICAgICBjb25zdCBpbnN0YW5jZXMgPSBhd2FpdCBsaXN0S2l0dHlJbnN0YW5jZXMoKVxuXG4gICAgICBpZiAoaW5zdGFuY2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBzZXRUYWJzKFtdKVxuICAgICAgICBzZXRJc0xvYWRpbmcoZmFsc2UpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBjb25zdCBhbGxUYWJzID0gaW5zdGFuY2VzLmZsYXRNYXAoaW5zdGFuY2UgPT4gaW5zdGFuY2Uud2luZG93cy5mbGF0TWFwKHdpbmRvdyA9PiB3aW5kb3cudGFicykpXG5cbiAgICAgIC8vIENhY2hlIHRoZSByZXN1bHRzXG4gICAgICBraXR0eUNhY2hlLnNldFRhYnMoYWxsVGFicylcblxuICAgICAgc2V0VGFicyhhbGxUYWJzKVxuXG4gICAgICBpZiAoYWxsVGFicy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgYXdhaXQgc2hvd1RvYXN0KHtcbiAgICAgICAgICBzdHlsZTogVG9hc3QuU3R5bGUuU3VjY2VzcyxcbiAgICAgICAgICB0aXRsZTogJ05vIHRhYnMgZm91bmQnLFxuICAgICAgICAgIG1lc3NhZ2U6ICdPcGVuIGEgdGVybWluYWwgaW4gS2l0dHkgdG8gc2VlIGl0IGhlcmUnLFxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gYXdhaXQgaGFuZGxlRXJyb3Ioe1xuICAgICAgICBvcGVyYXRpb246ICdMb2FkIHRhYnMnLFxuICAgICAgICBlcnJvcjogZXJyLFxuICAgICAgfSlcbiAgICAgIHNldEVycm9yKGVycm9yTWVzc2FnZSlcbiAgICB9IGZpbmFsbHkge1xuICAgICAgc2V0SXNMb2FkaW5nKGZhbHNlKVxuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGhhbmRsZUFjdGl2YXRlID0gKCkgPT4ge1xuICAgIC8vIENsb3NlIHRoZSBjb21tYW5kIGFmdGVyIHN1Y2Nlc3NmdWwgYWN0aXZhdGlvblxuICAgIC8vIFRoaXMgaXMgaGFuZGxlZCBieSB0aGUgY29tbWFuZCBydW50aW1lXG4gIH1cblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGxvYWRUYWJzKClcbiAgfSwgW10pXG5cbiAgLy8gRmlsdGVyIHRhYnMgYmFzZWQgb24gc2VhcmNoIHRleHRcbiAgY29uc3QgZmlsdGVyZWRUYWJzID0gdXNlTWVtbygoKSA9PiB7XG4gICAgaWYgKCFzZWFyY2hUZXh0LnRyaW0oKSkge1xuICAgICAgcmV0dXJuIHRhYnNcbiAgICB9XG5cbiAgICBjb25zdCBxdWVyeSA9IHNlYXJjaFRleHQudG9Mb3dlckNhc2UoKVxuICAgIHJldHVybiB0YWJzLmZpbHRlcihcbiAgICAgIHRhYiA9PlxuICAgICAgICB0YWIudGl0bGUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhxdWVyeSkgfHxcbiAgICAgICAgdGFiLndvcmtpbmdEaXJlY3RvcnkudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhxdWVyeSkgfHxcbiAgICAgICAgdGFiLmZvcmVncm91bmRQcm9jZXNzTmFtZT8udG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhxdWVyeSlcbiAgICApXG4gIH0sIFt0YWJzLCBzZWFyY2hUZXh0XSlcblxuICByZXR1cm4gPFRhYkxpc3QgdGFicz17ZmlsdGVyZWRUYWJzfSBpc0xvYWRpbmc9e2lzTG9hZGluZ30gb25BY3RpdmF0ZT17aGFuZGxlQWN0aXZhdGV9IC8+XG59XG4iLCAiLyoqXG4gKiBUYWJMaXN0IGNvbXBvbmVudCAtIGRpc3BsYXlzIGFsbCB0YWJzIGdyb3VwZWQgYnkgd2luZG93XG4gKi9cblxuaW1wb3J0IHsgTGlzdCB9IGZyb20gJ0ByYXljYXN0L2FwaSdcbmltcG9ydCB0eXBlIHsgS2l0dHlUYWIgfSBmcm9tICcuLi90eXBlcydcbmltcG9ydCBUYWJJdGVtIGZyb20gJy4vVGFiSXRlbSdcblxuaW50ZXJmYWNlIFRhYkxpc3RQcm9wcyB7XG4gIHRhYnM6IEtpdHR5VGFiW11cbiAgaXNMb2FkaW5nOiBib29sZWFuXG4gIG9uQWN0aXZhdGU6ICgpID0+IHZvaWRcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gVGFiTGlzdCh7IHRhYnMsIGlzTG9hZGluZywgb25BY3RpdmF0ZSB9OiBUYWJMaXN0UHJvcHMpIHtcbiAgLy8gR3JvdXAgdGFicyBieSB3aW5kb3dcbiAgY29uc3Qgd2luZG93cyA9IHRhYnMucmVkdWNlKFxuICAgIChhY2MsIHRhYikgPT4ge1xuICAgICAgY29uc3Qgd2luZG93SWQgPSB0YWIud2luZG93SWRcbiAgICAgIGlmICghYWNjW3dpbmRvd0lkXSkge1xuICAgICAgICBhY2Nbd2luZG93SWRdID0ge1xuICAgICAgICAgIGlkOiB3aW5kb3dJZCxcbiAgICAgICAgICB0YWJzOiBbXSxcbiAgICAgICAgICBpc0FjdGl2ZTogdGFiLmlzQWN0aXZlLFxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBhY2Nbd2luZG93SWRdLnRhYnMucHVzaCh0YWIpXG4gICAgICByZXR1cm4gYWNjXG4gICAgfSxcbiAgICB7fSBhcyBSZWNvcmQ8bnVtYmVyLCB7IGlkOiBudW1iZXI7IHRhYnM6IEtpdHR5VGFiW107IGlzQWN0aXZlOiBib29sZWFuIH0+XG4gIClcblxuICAvLyBTb3J0IHdpbmRvd3MgYnkgYWN0aXZlIHN0YXR1cywgdGhlbiBieSB3aW5kb3cgSURcbiAgY29uc3Qgc29ydGVkV2luZG93cyA9IE9iamVjdC52YWx1ZXMod2luZG93cykuc29ydCgoYSwgYikgPT4ge1xuICAgIGlmIChhLmlzQWN0aXZlICYmICFiLmlzQWN0aXZlKSByZXR1cm4gLTFcbiAgICBpZiAoIWEuaXNBY3RpdmUgJiYgYi5pc0FjdGl2ZSkgcmV0dXJuIDFcbiAgICByZXR1cm4gYS5pZCAtIGIuaWRcbiAgfSlcblxuICByZXR1cm4gKFxuICAgIC8vIEB0cy1leHBlY3QtZXJyb3IgLSBSYXljYXN0IEFQSSB0eXBlIGNvbXBhdGliaWxpdHkgd2l0aCBSZWFjdCAxOFxuICAgIDxMaXN0IGlzTG9hZGluZz17aXNMb2FkaW5nfSBzZWFyY2hCYXJQbGFjZWhvbGRlcj1cIlNlYXJjaCB0YWJzLi4uXCI+XG4gICAgICB7c29ydGVkV2luZG93cy5sZW5ndGggPT09IDAgJiYgIWlzTG9hZGluZyA/IChcbiAgICAgICAgLy8gQHRzLWV4cGVjdC1lcnJvciAtIFJheWNhc3QgQVBJIHR5cGUgY29tcGF0aWJpbGl0eSB3aXRoIFJlYWN0IDE4XG4gICAgICAgIDxMaXN0LkVtcHR5Vmlld1xuICAgICAgICAgIHRpdGxlPVwiTm8gdGFicyBmb3VuZFwiXG4gICAgICAgICAgZGVzY3JpcHRpb249XCJNYWtlIHN1cmUgS2l0dHkgdGVybWluYWwgaXMgcnVubmluZ1wiXG4gICAgICAgICAgaWNvbj1cIlx1RDgzRFx1REQwRFwiXG4gICAgICAgIC8+XG4gICAgICApIDogKFxuICAgICAgICBzb3J0ZWRXaW5kb3dzLm1hcCh3aW5kb3cgPT4gKFxuICAgICAgICAgIC8vIEB0cy1leHBlY3QtZXJyb3IgLSBSYXljYXN0IEFQSSB0eXBlIGNvbXBhdGliaWxpdHkgd2l0aCBSZWFjdCAxOFxuICAgICAgICAgIDxMaXN0LlNlY3Rpb25cbiAgICAgICAgICAgIGtleT17d2luZG93LmlkfVxuICAgICAgICAgICAgdGl0bGU9e2BXaW5kb3cgJHt3aW5kb3cuaWR9YH1cbiAgICAgICAgICAgIHN1YnRpdGxlPXtgJHt3aW5kb3cudGFicy5sZW5ndGh9IHRhYiR7d2luZG93LnRhYnMubGVuZ3RoICE9PSAxID8gJ3MnIDogJyd9JHtcbiAgICAgICAgICAgICAgd2luZG93LmlzQWN0aXZlID8gJyBcdTIwMjIgQWN0aXZlJyA6ICcnXG4gICAgICAgICAgICB9YH1cbiAgICAgICAgICA+XG4gICAgICAgICAgICB7d2luZG93LnRhYnMubWFwKHRhYiA9PiAoXG4gICAgICAgICAgICAgIDxUYWJJdGVtIGtleT17dGFiLmlkfSB0YWI9e3RhYn0gb25BY3RpdmF0ZT17b25BY3RpdmF0ZX0gLz5cbiAgICAgICAgICAgICkpfVxuICAgICAgICAgIDwvTGlzdC5TZWN0aW9uPlxuICAgICAgICApKVxuICAgICAgKX1cbiAgICA8L0xpc3Q+XG4gIClcbn1cbiIsICIvKipcbiAqIFRhYkl0ZW0gY29tcG9uZW50IC0gZGlzcGxheXMgYSBzaW5nbGUgdGFiXG4gKi9cblxuaW1wb3J0IHsgTGlzdCwgc2hvd1RvYXN0LCBUb2FzdCwgQWN0aW9uUGFuZWwsIEFjdGlvbiB9IGZyb20gJ0ByYXljYXN0L2FwaSdcbmltcG9ydCB0eXBlIHsgS2l0dHlUYWIgfSBmcm9tICcuLi90eXBlcydcbmltcG9ydCB7IGFjdGl2YXRlVGFiLCBmb2N1c1dpbmRvdyB9IGZyb20gJy4uL3V0aWxzL2tpdHR5QVBJJ1xuXG5pbnRlcmZhY2UgVGFiSXRlbVByb3BzIHtcbiAgdGFiOiBLaXR0eVRhYlxuICBvbkFjdGl2YXRlOiAoKSA9PiB2b2lkXG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIFRhYkl0ZW0oeyB0YWIsIG9uQWN0aXZhdGUgfTogVGFiSXRlbVByb3BzKSB7XG4gIGNvbnN0IGhhbmRsZUFjdGl2YXRlID0gYXN5bmMgKCkgPT4ge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBhY3RpdmF0ZVRhYih0YWIud2luZG93SWQpXG4gICAgICBvbkFjdGl2YXRlKClcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgYXdhaXQgc2hvd1RvYXN0KHtcbiAgICAgICAgc3R5bGU6IFRvYXN0LlN0eWxlLkZhaWx1cmUsXG4gICAgICAgIHRpdGxlOiAnRmFpbGVkIHRvIGFjdGl2YXRlIHRhYicsXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSxcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgY29uc3QgaGFuZGxlRm9jdXNXaW5kb3cgPSBhc3luYyAoKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGZvY3VzV2luZG93KHRhYi53aW5kb3dJZClcbiAgICAgIG9uQWN0aXZhdGUoKVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBhd2FpdCBzaG93VG9hc3Qoe1xuICAgICAgICBzdHlsZTogVG9hc3QuU3R5bGUuRmFpbHVyZSxcbiAgICAgICAgdGl0bGU6ICdGYWlsZWQgdG8gZm9jdXMgd2luZG93JyxcbiAgICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICBjb25zdCBpY29uID0gdGFiLmlzQWN0aXZlID8gJ1x1MjcwNScgOiAnXHVEODNEXHVEQ0M0J1xuICBjb25zdCBzdWJ0aXRsZSA9IHRhYi5mb3JlZ3JvdW5kUHJvY2Vzc05hbWVcbiAgICA/IGAke3RhYi53b3JraW5nRGlyZWN0b3J5fSBcdTIwMjIgJHt0YWIuZm9yZWdyb3VuZFByb2Nlc3NOYW1lfWBcbiAgICA6IHRhYi53b3JraW5nRGlyZWN0b3J5XG5cbiAgcmV0dXJuIChcbiAgICAvLyBAdHMtZXhwZWN0LWVycm9yIC0gUmF5Y2FzdCBBUEkgdHlwZSBjb21wYXRpYmlsaXR5IHdpdGggUmVhY3QgMThcbiAgICA8TGlzdC5JdGVtXG4gICAgICBpZD17YCR7dGFiLndpbmRvd0lkfS0ke3RhYi5pZH1gfVxuICAgICAgdGl0bGU9e3RhYi50aXRsZSB8fCAnVW50aXRsZWQnfVxuICAgICAgc3VidGl0bGU9e3N1YnRpdGxlfVxuICAgICAgaWNvbj17aWNvbn1cbiAgICAgIGtleXdvcmRzPXtbdGFiLndvcmtpbmdEaXJlY3RvcnksIHRhYi5mb3JlZ3JvdW5kUHJvY2Vzc05hbWUgfHwgJycsIHRhYi50aXRsZV19XG4gICAgICBhY3Rpb25zPXtcbiAgICAgICAgLy8gQHRzLWV4cGVjdC1lcnJvciAtIFJheWNhc3QgQVBJIHR5cGUgY29tcGF0aWJpbGl0eSB3aXRoIFJlYWN0IDE4XG4gICAgICAgIDxBY3Rpb25QYW5lbD5cbiAgICAgICAgICB7LyogQHRzLWV4cGVjdC1lcnJvciAtIFJheWNhc3QgQVBJIHR5cGUgY29tcGF0aWJpbGl0eSB3aXRoIFJlYWN0IDE4ICovfVxuICAgICAgICAgIDxBY3Rpb24gdGl0bGU9XCJBY3RpdmF0ZSBUYWJcIiBvbkFjdGlvbj17aGFuZGxlQWN0aXZhdGV9IC8+XG4gICAgICAgICAgey8qIEB0cy1leHBlY3QtZXJyb3IgLSBSYXljYXN0IEFQSSB0eXBlIGNvbXBhdGliaWxpdHkgd2l0aCBSZWFjdCAxOCAqL31cbiAgICAgICAgICA8QWN0aW9uIHRpdGxlPVwiRm9jdXMgV2luZG93XCIgb25BY3Rpb249e2hhbmRsZUZvY3VzV2luZG93fSAvPlxuICAgICAgICAgIHsvKiBAdHMtZXhwZWN0LWVycm9yIC0gUmF5Y2FzdCBBUEkgdHlwZSBjb21wYXRpYmlsaXR5IHdpdGggUmVhY3QgMTggKi99XG4gICAgICAgICAgPEFjdGlvbi5Db3B5VG9DbGlwYm9hcmQgdGl0bGU9XCJDb3B5IFdvcmtpbmcgRGlyZWN0b3J5XCIgY29udGVudD17dGFiLndvcmtpbmdEaXJlY3Rvcnl9IC8+XG4gICAgICAgICAgey8qIEB0cy1leHBlY3QtZXJyb3IgLSBSYXljYXN0IEFQSSB0eXBlIGNvbXBhdGliaWxpdHkgd2l0aCBSZWFjdCAxOCAqL31cbiAgICAgICAgICA8QWN0aW9uLkNvcHlUb0NsaXBib2FyZCB0aXRsZT1cIkNvcHkgVGFiIFRpdGxlXCIgY29udGVudD17dGFiLnRpdGxlfSAvPlxuICAgICAgICA8L0FjdGlvblBhbmVsPlxuICAgICAgfVxuICAgIC8+XG4gIClcbn1cbiIsICIvKipcbiAqIEVycm9yIGhhbmRsaW5nIHV0aWxpdGllc1xuICovXG5cbmltcG9ydCB7IHNob3dUb2FzdCwgVG9hc3QgfSBmcm9tICdAcmF5Y2FzdC9hcGknXG5cbmV4cG9ydCBpbnRlcmZhY2UgRXJyb3JDb250ZXh0IHtcbiAgb3BlcmF0aW9uOiBzdHJpbmdcbiAgZXJyb3I6IHVua25vd25cbiAgc2hvd1RvYXN0PzogYm9vbGVhblxufVxuXG4vKipcbiAqIEhhbmRsZSBhbmQgbG9nIGVycm9yc1xuICovXG5leHBvcnQgY29uc3QgaGFuZGxlRXJyb3IgPSBhc3luYyAoe1xuICBvcGVyYXRpb24sXG4gIGVycm9yLFxuICBzaG93VG9hc3Q6IHNob3VsZFNob3dUb2FzdCA9IHRydWUsXG59OiBFcnJvckNvbnRleHQpOiBQcm9taXNlPHN0cmluZz4gPT4ge1xuICBjb25zdCBlcnJvck1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcilcbiAgY29uc3QgZnVsbE1lc3NhZ2UgPSBgJHtvcGVyYXRpb259IGZhaWxlZDogJHtlcnJvck1lc3NhZ2V9YFxuXG4gIGNvbnNvbGUuZXJyb3IoYFtFUlJPUl0gJHtvcGVyYXRpb259OmAsIGVycm9yKVxuXG4gIGlmIChzaG91bGRTaG93VG9hc3QpIHtcbiAgICBhd2FpdCBzaG93VG9hc3Qoe1xuICAgICAgc3R5bGU6IFRvYXN0LlN0eWxlLkZhaWx1cmUsXG4gICAgICB0aXRsZTogb3BlcmF0aW9uLFxuICAgICAgbWVzc2FnZTogZXJyb3JNZXNzYWdlLFxuICAgIH0pXG4gIH1cblxuICByZXR1cm4gZnVsbE1lc3NhZ2Vcbn1cblxuLyoqXG4gKiBIYW5kbGUgc3VjY2VzcyBtZXNzYWdlc1xuICovXG5leHBvcnQgY29uc3QgaGFuZGxlU3VjY2VzcyA9IGFzeW5jIChtZXNzYWdlOiBzdHJpbmcsIHRpdGxlOiBzdHJpbmcgPSAnU3VjY2VzcycpID0+IHtcbiAgYXdhaXQgc2hvd1RvYXN0KHtcbiAgICBzdHlsZTogVG9hc3QuU3R5bGUuU3VjY2VzcyxcbiAgICB0aXRsZSxcbiAgICBtZXNzYWdlLFxuICB9KVxufVxuXG4vKipcbiAqIENyZWF0ZSBhIGN1c3RvbSBlcnJvciB3aXRoIGNvbnRleHRcbiAqL1xuZXhwb3J0IGNsYXNzIEtpdHR5QVBJRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG9wZXJhdGlvbjogc3RyaW5nLCBvcmlnaW5hbEVycm9yOiB1bmtub3duKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IG9yaWdpbmFsRXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IG9yaWdpbmFsRXJyb3IubWVzc2FnZSA6IFN0cmluZyhvcmlnaW5hbEVycm9yKVxuICAgIHN1cGVyKGAke29wZXJhdGlvbn0gZmFpbGVkOiAke21lc3NhZ2V9YClcbiAgICB0aGlzLm5hbWUgPSAnS2l0dHlBUElFcnJvcidcbiAgfVxufVxuXG4vKipcbiAqIFZhbGlkYXRlIHRoYXQga2l0dHkgaXMgYXZhaWxhYmxlXG4gKi9cbmV4cG9ydCBjb25zdCB2YWxpZGF0ZUtpdHR5QXZhaWxhYmlsaXR5ID0gYXN5bmMgKCk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IHsgY2hlY2tLaXR0eUF2YWlsYWJpbGl0eSB9ID0gYXdhaXQgaW1wb3J0KCcuL2tpdHR5QVBJJylcbiAgICBjb25zdCBpc0F2YWlsYWJsZSA9IGF3YWl0IGNoZWNrS2l0dHlBdmFpbGFiaWxpdHkoKVxuXG4gICAgaWYgKCFpc0F2YWlsYWJsZSkge1xuICAgICAgYXdhaXQgc2hvd1RvYXN0KHtcbiAgICAgICAgc3R5bGU6IFRvYXN0LlN0eWxlLkZhaWx1cmUsXG4gICAgICAgIHRpdGxlOiAnS2l0dHkgbm90IGZvdW5kJyxcbiAgICAgICAgbWVzc2FnZTogJ1BsZWFzZSBpbnN0YWxsIEtpdHR5IHRlcm1pbmFsIGVtdWxhdG9yIGZyb20gaHR0cHM6Ly9zdy5rb3ZpZGdveWFsLm5ldC9raXR0eS8nLFxuICAgICAgfSlcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlXG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgYXdhaXQgaGFuZGxlRXJyb3Ioe1xuICAgICAgb3BlcmF0aW9uOiAnVmFsaWRhdGUgS2l0dHkgYXZhaWxhYmlsaXR5JyxcbiAgICAgIGVycm9yLFxuICAgIH0pXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuLyoqXG4gKiBDaGVjayBpZiBzb2NrZXQgcGF0aCBpcyB2YWxpZFxuICovXG5leHBvcnQgY29uc3QgdmFsaWRhdGVTb2NrZXRQYXRoID0gKHNvY2tldFBhdGg6IHN0cmluZyk6IGJvb2xlYW4gPT4ge1xuICBpZiAoIXNvY2tldFBhdGggfHwgc29ja2V0UGF0aC50cmltKCkgPT09ICcnKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICAvLyBCYXNpYyBwYXRoIHZhbGlkYXRpb25cbiAgcmV0dXJuIHNvY2tldFBhdGguc3RhcnRzV2l0aCgnLycpIHx8IHNvY2tldFBhdGguc3RhcnRzV2l0aCgndW5peDonKVxufVxuIiwgIi8qKlxuICogQ2FjaGluZyB1dGlsaXRpZXMgZm9yIGltcHJvdmluZyBwZXJmb3JtYW5jZVxuICovXG5cbmltcG9ydCB0eXBlIHsgS2l0dHlUYWIsIEtpdHR5SW5zdGFuY2UgfSBmcm9tICcuLi90eXBlcydcblxuaW50ZXJmYWNlIENhY2hlRW50cnk8VD4ge1xuICBkYXRhOiBUXG4gIHRpbWVzdGFtcDogbnVtYmVyXG59XG5cbmNsYXNzIEtpdHR5Q2FjaGUge1xuICBwcml2YXRlIGluc3RhbmNlczogQ2FjaGVFbnRyeTxLaXR0eUluc3RhbmNlW10+IHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSB0YWJzOiBDYWNoZUVudHJ5PEtpdHR5VGFiW10+IHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSByZWFkb25seSBERUZBVUxUX0RVUkFUSU9OID0gMTAwMCAvLyAxIHNlY29uZFxuXG4gIHNldEluc3RhbmNlcyhpbnN0YW5jZXM6IEtpdHR5SW5zdGFuY2VbXSkge1xuICAgIHRoaXMuaW5zdGFuY2VzID0ge1xuICAgICAgZGF0YTogaW5zdGFuY2VzLFxuICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgIH1cbiAgfVxuXG4gIGdldEluc3RhbmNlcygpOiBLaXR0eUluc3RhbmNlW10gfCBudWxsIHtcbiAgICBpZiAoIXRoaXMuaW5zdGFuY2VzKSByZXR1cm4gbnVsbFxuXG4gICAgY29uc3QgYWdlID0gRGF0ZS5ub3coKSAtIHRoaXMuaW5zdGFuY2VzLnRpbWVzdGFtcFxuICAgIGlmIChhZ2UgPiB0aGlzLkRFRkFVTFRfRFVSQVRJT04pIHtcbiAgICAgIHRoaXMuaW5zdGFuY2VzID0gbnVsbFxuICAgICAgcmV0dXJuIG51bGxcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5pbnN0YW5jZXMuZGF0YVxuICB9XG5cbiAgc2V0VGFicyh0YWJzOiBLaXR0eVRhYltdKSB7XG4gICAgdGhpcy50YWJzID0ge1xuICAgICAgZGF0YTogdGFicyxcbiAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcbiAgICB9XG4gIH1cblxuICBnZXRUYWJzKCk6IEtpdHR5VGFiW10gfCBudWxsIHtcbiAgICBpZiAoIXRoaXMudGFicykgcmV0dXJuIG51bGxcblxuICAgIGNvbnN0IGFnZSA9IERhdGUubm93KCkgLSB0aGlzLnRhYnMudGltZXN0YW1wXG4gICAgaWYgKGFnZSA+IHRoaXMuREVGQVVMVF9EVVJBVElPTikge1xuICAgICAgdGhpcy50YWJzID0gbnVsbFxuICAgICAgcmV0dXJuIG51bGxcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy50YWJzLmRhdGFcbiAgfVxuXG4gIGNsZWFyKCkge1xuICAgIHRoaXMuaW5zdGFuY2VzID0gbnVsbFxuICAgIHRoaXMudGFicyA9IG51bGxcbiAgfVxuXG4gIGNsZWFySW5zdGFuY2VzKCkge1xuICAgIHRoaXMuaW5zdGFuY2VzID0gbnVsbFxuICB9XG5cbiAgY2xlYXJUYWJzKCkge1xuICAgIHRoaXMudGFicyA9IG51bGxcbiAgfVxufVxuXG5leHBvcnQgY29uc3Qga2l0dHlDYWNoZSA9IG5ldyBLaXR0eUNhY2hlKClcblxuLyoqXG4gKiBDYWNoZSBkZWNvcmF0b3IgZm9yIGFzeW5jIGZ1bmN0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gd2l0aENhY2hlPFQgZXh0ZW5kcyB1bmtub3duW10sIFI+KFxuICBmbjogKC4uLmFyZ3M6IFQpID0+IFByb21pc2U8Uj4sXG4gIGNhY2hlOiBDYWNoZUVudHJ5PFI+IHwgbnVsbCxcbiAgc2V0Q2FjaGU6IChkYXRhOiBSLCBkdXJhdGlvbj86IG51bWJlcikgPT4gdm9pZCxcbiAgZHVyYXRpb246IG51bWJlciA9IDEwMDBcbikge1xuICByZXR1cm4gYXN5bmMgKC4uLmFyZ3M6IFQpOiBQcm9taXNlPFI+ID0+IHtcbiAgICAvLyBDaGVjayBjYWNoZSBmaXJzdFxuICAgIGlmIChjYWNoZSkge1xuICAgICAgY29uc3QgYWdlID0gRGF0ZS5ub3coKSAtIGNhY2hlLnRpbWVzdGFtcFxuICAgICAgaWYgKGFnZSA8PSBkdXJhdGlvbikge1xuICAgICAgICByZXR1cm4gY2FjaGUuZGF0YVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEV4ZWN1dGUgZnVuY3Rpb24gYW5kIGNhY2hlIHJlc3VsdFxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGZuKC4uLmFyZ3MpXG4gICAgc2V0Q2FjaGUocmVzdWx0LCBkdXJhdGlvbilcbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUlBLHNCQUNBLGFBR00sZUFLTyx3QkFZQSxzQkFRQSxvQkFPUCxzQkFvRU8sb0JBa0JBLG1CQWFBLGFBb0JBLGFBa0JBLGNBbUNBLFlBeUJBO0FBN09iO0FBQUE7QUFBQTtBQUlBLDJCQUF5QjtBQUN6QixrQkFBMEI7QUFHMUIsSUFBTSxvQkFBZ0IsdUJBQVUsNkJBQVE7QUFLakMsSUFBTSx5QkFBeUIsWUFBOEI7QUFDbEUsVUFBSTtBQUNGLGNBQU0sY0FBYyxTQUFTLENBQUMsT0FBTyxDQUFDO0FBQ3RDLGVBQU87QUFBQSxNQUNULFNBQVMsT0FBTztBQUNkLGVBQU87QUFBQSxNQUNUO0FBQUEsSUFDRjtBQUtPLElBQU0sdUJBQXVCLE1BQWM7QUFDaEQsWUFBTSxVQUFVLFFBQVEsSUFBSSxRQUFRLFFBQVEsSUFBSSxlQUFlO0FBQy9ELGFBQU8sR0FBRyxPQUFPO0FBQUEsSUFDbkI7QUFLTyxJQUFNLHFCQUFxQixNQUFjO0FBQzlDLGFBQU8sUUFBUSxJQUFJLHFCQUFxQixxQkFBcUI7QUFBQSxJQUMvRDtBQUtBLElBQU0sdUJBQXVCLENBQUMsV0FBb0M7QUFDaEUsVUFBSTtBQUNGLGNBQU0sT0FBTyxLQUFLLE1BQU0sTUFBTTtBQUc5QixjQUFNLFVBQVUsTUFBTSxRQUFRLElBQUksSUFBSSxPQUFPLENBQUMsSUFB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QUFNLGVBQWUsTUFBTSxZQUFZO0FBQUEsUUFDckMsV0FBVztBQUFBLFFBQ1gsT0FBTztBQUFBLE1BQ1QsQ0FBQztBQUNELGVBQVMsWUFBWTtBQUFBLElBQ3ZCLFVBQUU7QUFDQSxtQkFBYSxLQUFLO0FBQUEsSUFDcEI7QUFBQSxFQUNGO0FBRUEsUUFBTSxpQkFBaUIsTUFBTTtBQUFBLEVBRzdCO0FBRUEsOEJBQVUsTUFBTTtBQUNkLGFBQVM7QUFBQSxFQUNYLEdBQUcsQ0FBQyxDQUFDO0FBR0wsUUFBTSxtQkFBZSxzQkFBUSxNQUFNO0FBQ2pDLFFBQUksQ0FBQyxXQUFXLEtBQUssR0FBRztBQUN0QixhQUFPO0FBQUEsSUFDVDtBQUVBLFVBQU0sUUFBUSxXQUFXLFlBQVk7QUFDckMsV0FBTyxLQUFLO0FBQUEsTUFDVixTQUNFLElBQUksTUFBTSxZQUFZLEVBQUUsU0FBUyxLQUFLLEtBQ3RDLElBQUksaUJBQWlCLFlBQVksRUFBRSxTQUFTLEtBQUssS0FDakQsSUFBSSx1QkFBdUIsWUFBWSxFQUFFLFNBQVMsS0FBSztBQUFBLElBQzNEO0FBQUEsRUFDRixHQUFHLENBQUMsTUFBTSxVQUFVLENBQUM7QUFFckIsU0FBTyw2Q0FBQyxXQUFRLE1BQU0sY0FBYyxXQUFzQixZQUFZLGdCQUFnQjtBQUN4Rjs7O0FEbEdBLElBQU8sb0JBQVE7IiwKICAibmFtZXMiOiBbImltcG9ydF9hcGkiLCAiaW1wb3J0X2FwaSIsICJpbXBvcnRfanN4X3J1bnRpbWUiLCAiaW1wb3J0X2FwaSIsICJjaGVja0tpdHR5QXZhaWxhYmlsaXR5IiwgImltcG9ydF9qc3hfcnVudGltZSJdCn0K
