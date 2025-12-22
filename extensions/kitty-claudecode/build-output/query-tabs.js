"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/query-tabs.tsx
var query_tabs_exports = {};
__export(query_tabs_exports, {
  default: () => query_tabs_default
});
module.exports = __toCommonJS(query_tabs_exports);

// src/commands/queryTabs.tsx
var import_api = require("@raycast/api");
var import_react = require("react");

// src/utils/kittyAPI.ts
var import_child_process = require("child_process");
var import_util = require("util");
var execFileAsync = (0, import_util.promisify)(import_child_process.execFile);
var parseKittyListOutput = (output) => {
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
var listKittyInstances = async () => {
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
var activateTab = async (windowId) => {
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
var searchTabs = async (query) => {
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

// src/utils/filtering.ts
var filterAndSortTabs = (tabs, query) => {
  let filtered = tabs;
  if (query.trim()) {
    const lowerQuery = query.toLowerCase();
    filtered = tabs.filter(
      (tab) => tab.title.toLowerCase().includes(lowerQuery) || tab.workingDirectory.toLowerCase().includes(lowerQuery) || tab.foregroundProcessName?.toLowerCase().includes(lowerQuery)
    );
  }
  return filtered.sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    return a.title.localeCompare(b.title);
  });
};

// src/commands/queryTabs.tsx
var import_jsx_runtime = (
  // @ts-expect-error - Raycast API type compatibility with React 18
  require("react/jsx-runtime")
);
function QueryTabs() {
  const [tabs, setTabs] = (0, import_react.useState)([]);
  const [isLoading, setIsLoading] = (0, import_react.useState)(true);
  const [searchText, setSearchText] = (0, import_react.useState)("");
  const loadTabs = async () => {
    setIsLoading(true);
    try {
      const allTabs = await searchTabs("");
      setTabs(allTabs);
    } catch (error) {
      console.error("Failed to load tabs:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const filteredTabs = filterAndSortTabs(tabs, searchText);
  return (
    // @ts-expect-error - Raycast API type compatibility with React 18
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      import_api.List,
      {
        isLoading,
        onSearchTextChange: setSearchText,
        searchBarPlaceholder: "Search tabs by title, directory, or process...",
        children: filteredTabs.map((tab) => (
          // @ts-expect-error - Raycast API type compatibility with React 18
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            import_api.List.Item,
            {
              title: tab.title,
              subtitle: tab.workingDirectory,
              icon: "\u{1F5C2}\uFE0F",
              actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_api.ActionPanel, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api.Action, { title: "Focus Tab", onAction: () => focusTabAction(tab.windowId) }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api.Action.CopyToClipboard, { title: "Copy Directory", content: tab.workingDirectory }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api.Action.CopyToClipboard, { title: "Copy Title", content: tab.title }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  import_api.Action,
                  {
                    title: "Refresh",
                    onAction: loadTabs,
                    shortcut: { modifiers: ["cmd"], key: "k" }
                  }
                )
              ] })
            },
            `${tab.windowId}-${tab.id}`
          )
        ))
      }
    )
  );
}
async function focusTabAction(windowId) {
  try {
    await activateTab(windowId);
  } catch (error) {
    console.error("Failed to focus tab:", error);
  }
}

// src/query-tabs.tsx
var query_tabs_default = QueryTabs;
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3F1ZXJ5LXRhYnMudHN4IiwgIi4uL3NyYy9jb21tYW5kcy9xdWVyeVRhYnMudHN4IiwgIi4uL3NyYy91dGlscy9raXR0eUFQSS50cyIsICIuLi9zcmMvdXRpbHMvZmlsdGVyaW5nLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgUXVlcnlUYWJzIGZyb20gJy4vY29tbWFuZHMvcXVlcnlUYWJzJ1xuXG5leHBvcnQgZGVmYXVsdCBRdWVyeVRhYnNcbiIsICJpbXBvcnQgeyBBY3Rpb24sIEFjdGlvblBhbmVsLCBMaXN0IH0gZnJvbSAnQHJheWNhc3QvYXBpJ1xuaW1wb3J0IHsgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCdcbmltcG9ydCB7IHNlYXJjaFRhYnMsIGFjdGl2YXRlVGFiIH0gZnJvbSAnLi4vdXRpbHMva2l0dHlBUEknXG5pbXBvcnQgeyBmaWx0ZXJBbmRTb3J0VGFicyB9IGZyb20gJy4uL3V0aWxzL2ZpbHRlcmluZydcbmltcG9ydCB0eXBlIHsgS2l0dHlUYWIgfSBmcm9tICcuLi90eXBlcydcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gUXVlcnlUYWJzKCkge1xuICBjb25zdCBbdGFicywgc2V0VGFic10gPSB1c2VTdGF0ZTxLaXR0eVRhYltdPihbXSlcbiAgY29uc3QgW2lzTG9hZGluZywgc2V0SXNMb2FkaW5nXSA9IHVzZVN0YXRlKHRydWUpXG4gIGNvbnN0IFtzZWFyY2hUZXh0LCBzZXRTZWFyY2hUZXh0XSA9IHVzZVN0YXRlKCcnKVxuXG4gIGNvbnN0IGxvYWRUYWJzID0gYXN5bmMgKCkgPT4ge1xuICAgIHNldElzTG9hZGluZyh0cnVlKVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBhbGxUYWJzID0gYXdhaXQgc2VhcmNoVGFicygnJylcbiAgICAgIHNldFRhYnMoYWxsVGFicylcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGxvYWQgdGFiczonLCBlcnJvcilcbiAgICB9IGZpbmFsbHkge1xuICAgICAgc2V0SXNMb2FkaW5nKGZhbHNlKVxuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGZpbHRlcmVkVGFicyA9IGZpbHRlckFuZFNvcnRUYWJzKHRhYnMsIHNlYXJjaFRleHQpXG5cbiAgcmV0dXJuIChcbiAgICAvLyBAdHMtZXhwZWN0LWVycm9yIC0gUmF5Y2FzdCBBUEkgdHlwZSBjb21wYXRpYmlsaXR5IHdpdGggUmVhY3QgMThcbiAgICA8TGlzdFxuICAgICAgaXNMb2FkaW5nPXtpc0xvYWRpbmd9XG4gICAgICBvblNlYXJjaFRleHRDaGFuZ2U9e3NldFNlYXJjaFRleHR9XG4gICAgICBzZWFyY2hCYXJQbGFjZWhvbGRlcj1cIlNlYXJjaCB0YWJzIGJ5IHRpdGxlLCBkaXJlY3RvcnksIG9yIHByb2Nlc3MuLi5cIlxuICAgID5cbiAgICAgIHtmaWx0ZXJlZFRhYnMubWFwKHRhYiA9PiAoXG4gICAgICAgIC8vIEB0cy1leHBlY3QtZXJyb3IgLSBSYXljYXN0IEFQSSB0eXBlIGNvbXBhdGliaWxpdHkgd2l0aCBSZWFjdCAxOFxuICAgICAgICA8TGlzdC5JdGVtXG4gICAgICAgICAga2V5PXtgJHt0YWIud2luZG93SWR9LSR7dGFiLmlkfWB9XG4gICAgICAgICAgdGl0bGU9e3RhYi50aXRsZX1cbiAgICAgICAgICBzdWJ0aXRsZT17dGFiLndvcmtpbmdEaXJlY3Rvcnl9XG4gICAgICAgICAgaWNvbj1cIlx1RDgzRFx1RERDMlx1RkUwRlwiXG4gICAgICAgICAgYWN0aW9ucz17XG4gICAgICAgICAgICAvLyBAdHMtZXhwZWN0LWVycm9yIC0gUmF5Y2FzdCBBUEkgdHlwZSBjb21wYXRpYmlsaXR5IHdpdGggUmVhY3QgMThcbiAgICAgICAgICAgIDxBY3Rpb25QYW5lbD5cbiAgICAgICAgICAgICAgey8qIEB0cy1leHBlY3QtZXJyb3IgLSBSYXljYXN0IEFQSSB0eXBlIGNvbXBhdGliaWxpdHkgd2l0aCBSZWFjdCAxOCAqL31cbiAgICAgICAgICAgICAgPEFjdGlvbiB0aXRsZT1cIkZvY3VzIFRhYlwiIG9uQWN0aW9uPXsoKSA9PiBmb2N1c1RhYkFjdGlvbih0YWIud2luZG93SWQpfSAvPlxuICAgICAgICAgICAgICB7LyogQHRzLWV4cGVjdC1lcnJvciAtIFJheWNhc3QgQVBJIHR5cGUgY29tcGF0aWJpbGl0eSB3aXRoIFJlYWN0IDE4ICovfVxuICAgICAgICAgICAgICA8QWN0aW9uLkNvcHlUb0NsaXBib2FyZCB0aXRsZT1cIkNvcHkgRGlyZWN0b3J5XCIgY29udGVudD17dGFiLndvcmtpbmdEaXJlY3Rvcnl9IC8+XG4gICAgICAgICAgICAgIHsvKiBAdHMtZXhwZWN0LWVycm9yIC0gUmF5Y2FzdCBBUEkgdHlwZSBjb21wYXRpYmlsaXR5IHdpdGggUmVhY3QgMTggKi99XG4gICAgICAgICAgICAgIDxBY3Rpb24uQ29weVRvQ2xpcGJvYXJkIHRpdGxlPVwiQ29weSBUaXRsZVwiIGNvbnRlbnQ9e3RhYi50aXRsZX0gLz5cbiAgICAgICAgICAgICAgey8qIEB0cy1leHBlY3QtZXJyb3IgLSBSYXljYXN0IEFQSSB0eXBlIGNvbXBhdGliaWxpdHkgd2l0aCBSZWFjdCAxOCAqL31cbiAgICAgICAgICAgICAgPEFjdGlvblxuICAgICAgICAgICAgICAgIHRpdGxlPVwiUmVmcmVzaFwiXG4gICAgICAgICAgICAgICAgb25BY3Rpb249e2xvYWRUYWJzfVxuICAgICAgICAgICAgICAgIHNob3J0Y3V0PXt7IG1vZGlmaWVyczogWydjbWQnXSwga2V5OiAnaycgfX1cbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDwvQWN0aW9uUGFuZWw+XG4gICAgICAgICAgfVxuICAgICAgICAvPlxuICAgICAgKSl9XG4gICAgPC9MaXN0PlxuICApXG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZvY3VzVGFiQWN0aW9uKHdpbmRvd0lkOiBudW1iZXIpIHtcbiAgdHJ5IHtcbiAgICBhd2FpdCBhY3RpdmF0ZVRhYih3aW5kb3dJZClcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gZm9jdXMgdGFiOicsIGVycm9yKVxuICB9XG59XG4iLCAiLyoqXG4gKiBLaXR0eSBBUEkgdXRpbGl0eSBmdW5jdGlvbnMgZm9yIGludGVyYWN0aW5nIHdpdGggS2l0dHkgdGVybWluYWxcbiAqL1xuXG5pbXBvcnQgeyBleGVjRmlsZSB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnXG5pbXBvcnQgeyBwcm9taXNpZnkgfSBmcm9tICd1dGlsJ1xuaW1wb3J0IHR5cGUgeyBLaXR0eVRhYiwgS2l0dHlXaW5kb3csIEtpdHR5SW5zdGFuY2UgfSBmcm9tICcuLi90eXBlcydcblxuY29uc3QgZXhlY0ZpbGVBc3luYyA9IHByb21pc2lmeShleGVjRmlsZSlcblxuLyoqXG4gKiBDaGVjayBpZiBraXR0eSBpcyBhdmFpbGFibGUgb24gdGhlIHN5c3RlbVxuICovXG5leHBvcnQgY29uc3QgY2hlY2tLaXR0eUF2YWlsYWJpbGl0eSA9IGFzeW5jICgpOiBQcm9taXNlPGJvb2xlYW4+ID0+IHtcbiAgdHJ5IHtcbiAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCd3aGljaCcsIFsna2l0dHknXSlcbiAgICByZXR1cm4gdHJ1ZVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbi8qKlxuICogR2V0IHRoZSBkZWZhdWx0IGtpdHR5IHNvY2tldCBwYXRoXG4gKi9cbmV4cG9ydCBjb25zdCBnZXREZWZhdWx0U29ja2V0UGF0aCA9ICgpOiBzdHJpbmcgPT4ge1xuICBjb25zdCBob21lRGlyID0gcHJvY2Vzcy5lbnYuSE9NRSB8fCBwcm9jZXNzLmVudi5VU0VSUFJPRklMRSB8fCAnL3RtcCdcbiAgcmV0dXJuIGAke2hvbWVEaXJ9Ly5sb2NhbC9zaGFyZS9raXR0eS9raXR0eS1zb2NrZXRgXG59XG5cbi8qKlxuICogR2V0IGtpdHR5IHNvY2tldCBwYXRoIGZyb20gZW52aXJvbm1lbnQgb3IgZGVmYXVsdFxuICovXG5leHBvcnQgY29uc3QgZ2V0S2l0dHlTb2NrZXRQYXRoID0gKCk6IHN0cmluZyA9PiB7XG4gIHJldHVybiBwcm9jZXNzLmVudi5LSVRUWV9TT0NLRVRfUEFUSCB8fCBnZXREZWZhdWx0U29ja2V0UGF0aCgpXG59XG5cbi8qKlxuICogUGFyc2Uga2l0dHkgQCBscyBKU09OIG91dHB1dCB0byBleHRyYWN0IHdpbmRvdyBhbmQgdGFiIGluZm9ybWF0aW9uXG4gKi9cbmNvbnN0IHBhcnNlS2l0dHlMaXN0T3V0cHV0ID0gKG91dHB1dDogc3RyaW5nKTogS2l0dHlJbnN0YW5jZVtdID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShvdXRwdXQpXG5cbiAgICAvLyBLaXR0eSBAIGxzIHJldHVybnMgYW4gYXJyYXkgb2Ygd2luZG93c1xuICAgIGNvbnN0IHdpbmRvd3MgPSBBcnJheS5pc0FycmF5KGRhdGEpID8gZGF0YSA6IFtkYXRhXVxuXG4gICAgLy8gR3JvdXAgd2luZG93cyBieSB0aGVpciBPUyB3aW5kb3cgKGtpdHR5IGluc3RhbmNlKVxuICAgIGNvbnN0IGluc3RhbmNlc01hcCA9IG5ldyBNYXA8bnVtYmVyLCBLaXR0eUluc3RhbmNlPigpXG5cbiAgICBmb3IgKGNvbnN0IHdpbmRvdyBvZiB3aW5kb3dzKSB7XG4gICAgICBjb25zdCBpbnN0YW5jZUlkID0gd2luZG93LnBsYXRmb3JtX3dpbmRvd19pZCB8fCAxIC8vIERlZmF1bHQgdG8gMSBpZiBubyBwbGF0Zm9ybSBJRFxuXG4gICAgICBpZiAoIWluc3RhbmNlc01hcC5oYXMoaW5zdGFuY2VJZCkpIHtcbiAgICAgICAgaW5zdGFuY2VzTWFwLnNldChpbnN0YW5jZUlkLCB7XG4gICAgICAgICAgcGlkOiBpbnN0YW5jZUlkLFxuICAgICAgICAgIHRpdGxlOiBgS2l0dHkgSW5zdGFuY2UgJHtpbnN0YW5jZUlkfWAsXG4gICAgICAgICAgd2luZG93czogW10sXG4gICAgICAgIH0pXG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGluc3RhbmNlID0gaW5zdGFuY2VzTWFwLmdldChpbnN0YW5jZUlkKSFcblxuICAgICAgLy8gQ3JlYXRlIHdpbmRvdyBvYmplY3RcbiAgICAgIGNvbnN0IHdpbmRvd09iajogS2l0dHlXaW5kb3cgPSB7XG4gICAgICAgIGlkOiB3aW5kb3cuaWQsXG4gICAgICAgIHRhYnM6IFtdLFxuICAgICAgICBpc0FjdGl2ZTogd2luZG93LmlzX2FjdGl2ZSB8fCBmYWxzZSxcbiAgICAgICAgcGxhdGZvcm1XaW5kb3dJZDogd2luZG93LnBsYXRmb3JtX3dpbmRvd19pZCxcbiAgICAgICAgdGl0bGU6IGBXaW5kb3cgJHt3aW5kb3cuaWR9YCxcbiAgICAgIH1cblxuICAgICAgLy8gUHJvY2VzcyB0YWJzIGluIHRoaXMgd2luZG93XG4gICAgICBpZiAod2luZG93LnRhYnMgJiYgQXJyYXkuaXNBcnJheSh3aW5kb3cudGFicykpIHtcbiAgICAgICAgZm9yIChjb25zdCB0YWIgb2Ygd2luZG93LnRhYnMpIHtcbiAgICAgICAgICAvLyBHZXQgdGhlIGFjdGl2ZSB3aW5kb3cgaW4gdGhpcyB0YWJcbiAgICAgICAgICBjb25zdCBhY3RpdmVXaW5kb3cgPVxuICAgICAgICAgICAgdGFiLndpbmRvd3M/LmZpbmQoKHc6IHsgaXNfYWN0aXZlOiBib29sZWFuIH0pID0+IHcuaXNfYWN0aXZlKSB8fCB0YWIud2luZG93cz8uWzBdXG5cbiAgICAgICAgICBpZiAoYWN0aXZlV2luZG93KSB7XG4gICAgICAgICAgICBjb25zdCB0YWJPYmo6IEtpdHR5VGFiID0ge1xuICAgICAgICAgICAgICBpZDogYWN0aXZlV2luZG93LmlkLFxuICAgICAgICAgICAgICB0aXRsZTogYWN0aXZlV2luZG93LnRpdGxlIHx8ICdVbnRpdGxlZCcsXG4gICAgICAgICAgICAgIHdvcmtpbmdEaXJlY3Rvcnk6IGFjdGl2ZVdpbmRvdy5jd2QgfHwgJycsXG4gICAgICAgICAgICAgIHBpZDogYWN0aXZlV2luZG93LnBpZCxcbiAgICAgICAgICAgICAgd2luZG93SWQ6IHdpbmRvdy5pZCxcbiAgICAgICAgICAgICAgaXNBY3RpdmU6IGFjdGl2ZVdpbmRvdy5pc19hY3RpdmUgfHwgZmFsc2UsXG4gICAgICAgICAgICAgIGZvcmVncm91bmRQcm9jZXNzTmFtZTogYWN0aXZlV2luZG93LmZvcmVncm91bmRfcHJvY2Vzc2VzPy5bMF0/LmNtZGxpbmU/LlswXSxcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgd2luZG93T2JqLnRhYnMucHVzaCh0YWJPYmopXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGluc3RhbmNlLndpbmRvd3MucHVzaCh3aW5kb3dPYmopXG4gICAgfVxuXG4gICAgcmV0dXJuIEFycmF5LmZyb20oaW5zdGFuY2VzTWFwLnZhbHVlcygpKVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBwYXJzZSBraXR0eSBsaXN0IG91dHB1dDonLCBlcnJvcilcbiAgICByZXR1cm4gW11cbiAgfVxufVxuXG4vKipcbiAqIExpc3QgYWxsIGtpdHR5IGluc3RhbmNlcyBhbmQgdGhlaXIgdGFicyB1c2luZyBraXR0ZW4gQFxuICovXG5leHBvcnQgY29uc3QgbGlzdEtpdHR5SW5zdGFuY2VzID0gYXN5bmMgKCk6IFByb21pc2U8S2l0dHlJbnN0YW5jZVtdPiA9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2tpdHR5JywgWydAJywgJ2xzJ10sIHtcbiAgICAgIHRpbWVvdXQ6IDUwMDAsXG4gICAgfSlcblxuICAgIHJldHVybiBwYXJzZUtpdHR5TGlzdE91dHB1dChzdGRvdXQpXG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGxpc3Qga2l0dHkgaW5zdGFuY2VzOicsIGVycm9yKVxuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBGYWlsZWQgdG8gbGlzdCBraXR0eSBpbnN0YW5jZXM6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWBcbiAgICApXG4gIH1cbn1cblxuLyoqXG4gKiBHZXQgYWN0aXZlIGtpdHR5IGluc3RhbmNlICh0aGUgb25lIHdpdGggYWN0aXZlIHdpbmRvd3MpXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRBY3RpdmVJbnN0YW5jZSA9IGFzeW5jICgpOiBQcm9taXNlPEtpdHR5SW5zdGFuY2UgfCBudWxsPiA9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgaW5zdGFuY2VzID0gYXdhaXQgbGlzdEtpdHR5SW5zdGFuY2VzKClcbiAgICByZXR1cm4gaW5zdGFuY2VzLmZpbmQoaW5zdCA9PiBpbnN0LndpbmRvd3Muc29tZSh3aW4gPT4gd2luLmlzQWN0aXZlKSkgfHwgbnVsbFxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBnZXQgYWN0aXZlIGluc3RhbmNlOicsIGVycm9yKVxuICAgIHJldHVybiBudWxsXG4gIH1cbn1cblxuLyoqXG4gKiBBY3RpdmF0ZSBhIHNwZWNpZmljIHRhYi93aW5kb3dcbiAqL1xuZXhwb3J0IGNvbnN0IGFjdGl2YXRlVGFiID0gYXN5bmMgKHdpbmRvd0lkOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBhcmdzID0gWydAJywgJ2ZvY3VzLXdpbmRvdycsICctLW1hdGNoJywgYGlkOiR7d2luZG93SWR9YF1cblxuICAgIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2tpdHR5JywgYXJncywge1xuICAgICAgdGltZW91dDogNTAwMCxcbiAgICB9KVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBhY3RpdmF0ZSB0YWI6JywgZXJyb3IpXG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYEZhaWxlZCB0byBhY3RpdmF0ZSB0YWIgKHdpbmRvdyAke3dpbmRvd0lkfSk6ICR7XG4gICAgICAgIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKVxuICAgICAgfWBcbiAgICApXG4gIH1cbn1cblxuLyoqXG4gKiBGb2N1cyBhIHNwZWNpZmljIHdpbmRvd1xuICovXG5leHBvcnQgY29uc3QgZm9jdXNXaW5kb3cgPSBhc3luYyAod2luZG93SWQ6IG51bWJlcik6IFByb21pc2U8dm9pZD4gPT4ge1xuICB0cnkge1xuICAgIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2tpdHR5JywgWydAJywgJ2ZvY3VzLXdpbmRvdycsICctLW1hdGNoJywgYGlkOiR7d2luZG93SWR9YF0sIHtcbiAgICAgIHRpbWVvdXQ6IDUwMDAsXG4gICAgfSlcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gZm9jdXMgd2luZG93OicsIGVycm9yKVxuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBGYWlsZWQgdG8gZm9jdXMgd2luZG93ICR7d2luZG93SWR9OiAke1xuICAgICAgICBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcilcbiAgICAgIH1gXG4gICAgKVxuICB9XG59XG5cbi8qKlxuICogR2V0IGN1cnJlbnQgYWN0aXZlIHRhYlxuICovXG5leHBvcnQgY29uc3QgZ2V0QWN0aXZlVGFiID0gYXN5bmMgKCk6IFByb21pc2U8S2l0dHlUYWIgfCBudWxsPiA9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2tpdHR5JywgWycra2l0dGVuJywgJ2dldC1hY3RpdmUtdGFiJ10sIHtcbiAgICAgIHRpbWVvdXQ6IDUwMDAsXG4gICAgfSlcblxuICAgIGNvbnN0IGxpbmVzID0gc3Rkb3V0LnRyaW0oKS5zcGxpdCgnXFxuJylcbiAgICBpZiAobGluZXMubGVuZ3RoID09PSAwKSByZXR1cm4gbnVsbFxuXG4gICAgY29uc3QgZmlyc3RMaW5lID0gbGluZXNbMF1cbiAgICBpZiAoIWZpcnN0TGluZSkgcmV0dXJuIG51bGxcblxuICAgIGNvbnN0IHBhcnRzID0gZmlyc3RMaW5lLnNwbGl0KCd8JylcbiAgICBpZiAocGFydHMubGVuZ3RoIDwgNikgcmV0dXJuIG51bGxcblxuICAgIGNvbnN0IFssIHdpbmRvd0lkU3RyLCB0YWJJZCwgdGl0bGUsIGN3ZCwgcHJvY2Vzc05hbWVdID0gcGFydHNcblxuICAgIHJldHVybiB7XG4gICAgICBpZDogcGFyc2VJbnQodGFiSWQgPz8gJzAnLCAxMCksXG4gICAgICB0aXRsZTogdGl0bGUgPz8gJ1VudGl0bGVkJyxcbiAgICAgIHdvcmtpbmdEaXJlY3Rvcnk6IGN3ZCA/PyAnJyxcbiAgICAgIHBpZDogcGFyc2VJbnQocHJvY2Vzc05hbWUgPz8gdGFiSWQgPz8gJzAnLCAxMCksXG4gICAgICB3aW5kb3dJZDogcGFyc2VJbnQod2luZG93SWRTdHIgPz8gJzAnLCAxMCksXG4gICAgICBpc0FjdGl2ZTogdHJ1ZSxcbiAgICAgIGZvcmVncm91bmRQcm9jZXNzTmFtZTogcHJvY2Vzc05hbWUgPz8gdW5kZWZpbmVkLFxuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gZ2V0IGFjdGl2ZSB0YWI6JywgZXJyb3IpXG4gICAgcmV0dXJuIG51bGxcbiAgfVxufVxuXG4vKipcbiAqIFNlYXJjaCB0YWJzIGJ5IHF1ZXJ5XG4gKi9cbmV4cG9ydCBjb25zdCBzZWFyY2hUYWJzID0gYXN5bmMgKHF1ZXJ5OiBzdHJpbmcpOiBQcm9taXNlPEtpdHR5VGFiW10+ID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBpbnN0YW5jZXMgPSBhd2FpdCBsaXN0S2l0dHlJbnN0YW5jZXMoKVxuICAgIGNvbnN0IGFsbFRhYnMgPSBpbnN0YW5jZXMuZmxhdE1hcChpbnN0YW5jZSA9PiBpbnN0YW5jZS53aW5kb3dzLmZsYXRNYXAod2luZG93ID0+IHdpbmRvdy50YWJzKSlcblxuICAgIGlmICghcXVlcnkudHJpbSgpKSB7XG4gICAgICByZXR1cm4gYWxsVGFic1xuICAgIH1cblxuICAgIGNvbnN0IGxvd2VyUXVlcnkgPSBxdWVyeS50b0xvd2VyQ2FzZSgpXG4gICAgcmV0dXJuIGFsbFRhYnMuZmlsdGVyKFxuICAgICAgdGFiID0+XG4gICAgICAgIHRhYi50aXRsZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGxvd2VyUXVlcnkpIHx8XG4gICAgICAgIHRhYi53b3JraW5nRGlyZWN0b3J5LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMobG93ZXJRdWVyeSkgfHxcbiAgICAgICAgdGFiLmZvcmVncm91bmRQcm9jZXNzTmFtZT8udG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlclF1ZXJ5KVxuICAgIClcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gc2VhcmNoIHRhYnM6JywgZXJyb3IpXG4gICAgdGhyb3cgZXJyb3JcbiAgfVxufVxuXG4vKipcbiAqIENvdW50IHRvdGFsIG51bWJlciBvZiB0YWJzIGFjcm9zcyBhbGwgaW5zdGFuY2VzXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRUb3RhbFRhYkNvdW50ID0gYXN5bmMgKCk6IFByb21pc2U8bnVtYmVyPiA9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgaW5zdGFuY2VzID0gYXdhaXQgbGlzdEtpdHR5SW5zdGFuY2VzKClcbiAgICByZXR1cm4gaW5zdGFuY2VzLnJlZHVjZSgodG90YWwsIGluc3RhbmNlKSA9PiB7XG4gICAgICByZXR1cm4gKFxuICAgICAgICB0b3RhbCArXG4gICAgICAgIGluc3RhbmNlLndpbmRvd3MucmVkdWNlKCh3aW5Ub3RhbCwgd2luZG93KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHdpblRvdGFsICsgd2luZG93LnRhYnMubGVuZ3RoXG4gICAgICAgIH0sIDApXG4gICAgICApXG4gICAgfSwgMClcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gZ2V0IHRvdGFsIHRhYiBjb3VudDonLCBlcnJvcilcbiAgICByZXR1cm4gMFxuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBLaXR0eVRhYiB9IGZyb20gJy4uL3R5cGVzJ1xuXG4vKipcbiAqIEZpbHRlciBhbmQgc29ydCB0YWJzIGJ5IHF1ZXJ5IHdpdGggZW5oYW5jZWQgc29ydGluZ1xuICogLSBBY3RpdmUgdGFicyBhcHBlYXIgZmlyc3RcbiAqIC0gQWxwaGFiZXRpY2FsIGJ5IHRpdGxlIHdpdGhpbiBlYWNoIGdyb3VwXG4gKi9cbmV4cG9ydCBjb25zdCBmaWx0ZXJBbmRTb3J0VGFicyA9ICh0YWJzOiBLaXR0eVRhYltdLCBxdWVyeTogc3RyaW5nKTogS2l0dHlUYWJbXSA9PiB7XG4gIGxldCBmaWx0ZXJlZCA9IHRhYnNcblxuICAvLyBGaWx0ZXIgYnkgcXVlcnlcbiAgaWYgKHF1ZXJ5LnRyaW0oKSkge1xuICAgIGNvbnN0IGxvd2VyUXVlcnkgPSBxdWVyeS50b0xvd2VyQ2FzZSgpXG4gICAgZmlsdGVyZWQgPSB0YWJzLmZpbHRlcihcbiAgICAgIHRhYiA9PlxuICAgICAgICB0YWIudGl0bGUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlclF1ZXJ5KSB8fFxuICAgICAgICB0YWIud29ya2luZ0RpcmVjdG9yeS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGxvd2VyUXVlcnkpIHx8XG4gICAgICAgIHRhYi5mb3JlZ3JvdW5kUHJvY2Vzc05hbWU/LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMobG93ZXJRdWVyeSlcbiAgICApXG4gIH1cblxuICAvLyBTb3J0OiBhY3RpdmUgZmlyc3QsIHRoZW4gYnkgdGl0bGVcbiAgcmV0dXJuIGZpbHRlcmVkLnNvcnQoKGEsIGIpID0+IHtcbiAgICBpZiAoYS5pc0FjdGl2ZSAmJiAhYi5pc0FjdGl2ZSkgcmV0dXJuIC0xXG4gICAgaWYgKCFhLmlzQWN0aXZlICYmIGIuaXNBY3RpdmUpIHJldHVybiAxXG4gICAgcmV0dXJuIGEudGl0bGUubG9jYWxlQ29tcGFyZShiLnRpdGxlKVxuICB9KVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7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
