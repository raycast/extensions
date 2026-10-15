/** JXA 在 macOS 自动化层执行，不向网页注入 JavaScript。 */
export const LIST_TABS_SCRIPT = String.raw`
function run(argv) {
  var chrome = Application("com.google.Chrome");
  function sameIds(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function tabValues(window, name) {
    var collection = window.tabs;
    if (typeof collection[name] === "function") return collection[name]();
    return window.tabs().map(function(tab) { return tab[name](); });
  }
  for (var attempt = 0; attempt < 3; attempt++) {
    if (!chrome.running()) return JSON.stringify({ running: false, tabs: [] });
    try {
      var result = [];
      var windows = chrome.windows();
      var windowIds = windows.map(function(window) { return window.id(); });
      for (var w = 0; w < windows.length; w++) {
        var window = windows[w];
        var incognito = window.mode() === "incognito";
        if (incognito && argv[0] !== "true") continue;
        var ids = tabValues(window, "id");
        var active = window.activeTabIndex();
        var titles = tabValues(window, "title");
        if (!sameIds(ids, tabValues(window, "id"))) throw new Error("TABS_CHANGED_DURING_READ");
        var urls = tabValues(window, "url");
        // 不只校验数量；相同数量的标签换位也会让标题和 URL 错配。
        if (!sameIds(ids, tabValues(window, "id")) || titles.length !== ids.length || urls.length !== ids.length)
          throw new Error("TABS_CHANGED_DURING_READ");
        for (var t = 0; t < ids.length; t++) {
          result.push({
            id: "tab:" + ids[t], source: "tab", tabId: String(ids[t]),
            windowId: String(windowIds[w]), active: active === t + 1,
            title: titles[t], url: urls[t], incognito: incognito
          });
        }
      }
      if (!sameIds(windowIds, chrome.windows().map(function(window) { return window.id(); })))
        throw new Error("TABS_CHANGED_DURING_READ");
      return JSON.stringify({ running: true, tabs: result });
    } catch (error) {
      // 只重试对象消失或顺序变化；权限等错误直接交给调用方。
      if (error.errorNumber !== -1728 && !/TABS_CHANGED_DURING_READ/.test(String(error))) throw error;
    }
  }
  throw new Error("TABS_CHANGED_DURING_READ");
}
`;

export const FOCUS_TAB_SCRIPT = String.raw`
function run(argv) {
  var target = String(argv[0] || "");
  if (!/^[1-9][0-9]*$/.test(target)) throw new Error("INVALID_TAB_ID");
  var chrome = Application("com.google.Chrome");
  if (!chrome.running()) throw new Error("CHROME_NOT_RUNNING");
  for (var attempt = 0; attempt < 3; attempt++) {
    var windows = chrome.windows();
    var found = false;
    for (var w = 0; w < windows.length; w++) {
      var window = windows[w];
      var tabs = window.tabs();
      for (var t = 0; t < tabs.length; t++) {
        if (String(tabs[t].id()) !== target) continue;
        found = true;
        window.activeTabIndex = t + 1;
        if (String(window.activeTab.id()) !== target) break;
        window.minimized = false;
        window.index = 1;
        chrome.activate();
        if (String(window.activeTab.id()) === target) return target;
        break;
      }
      if (found) break;
    }
    if (!found) throw new Error("TAB_NOT_FOUND");
  }
  throw new Error("TAB_MOVED_DURING_FOCUS");
}
`;

/** 只在命令挂载时读取；Raycast 关闭前后都不重新选择目标。 */
export const CAPTURE_CONTEXT_SCRIPT = String.raw`
function run() {
  var chrome = Application("com.google.Chrome");
  if (!chrome.running()) return "null";
  var windows = chrome.windows();
  if (!windows.length) return "null";
  var window = windows[0];
  return JSON.stringify({ windowId: String(window.id()), tabId: String(window.activeTab.id()) });
}
`;

export const OPEN_URL_SCRIPT = String.raw`
function run(argv) {
  var payload = JSON.parse(argv[0]);
  if (!/^(https?|file|chrome|about):/i.test(payload.url)) throw new Error("UNSUPPORTED_URL");
  if (payload.mode !== "here" && payload.mode !== "newTab") throw new Error("INVALID_TARGET");
  var target = payload.target;
  if (target && (!/^[1-9][0-9]*$/.test(target.windowId) || !/^[1-9][0-9]*$/.test(target.tabId)))
    throw new Error("INVALID_TARGET");
  if (payload.mode === "here" && !target) throw new Error("NO_CURRENT_TAB");
  var chrome = Application("com.google.Chrome");
  var window;
  if (target) {
    if (!chrome.running()) throw new Error("TARGET_WINDOW_NOT_FOUND");
    var windows = chrome.windows();
    for (var w = 0; w < windows.length; w++) {
      if (String(windows[w].id()) === target.windowId) { window = windows[w]; break; }
    }
    if (!window) throw new Error("TARGET_WINDOW_NOT_FOUND");
    window = chrome.windows.byId(Number(target.windowId));
  } else {
    // 捕获时没有窗口：显式新建普通窗口，不复用随后出现的窗口。
    if (!chrome.running()) chrome.launch();
    window = chrome.Window({ mode: "normal" });
    chrome.windows.push(window);
  }
  if (payload.mode === "here") {
    var tabs = window.tabs();
    var tab;
    for (var t = 0; t < tabs.length; t++) {
      if (String(tabs[t].id()) === target.tabId) { tab = tabs[t]; break; }
    }
    if (!tab) throw new Error("TARGET_TAB_NOT_FOUND");
    // 使用对象 ID 引用写入；活动标签和索引变化不会改变写入目标。
    window.tabs.byId(Number(target.tabId)).url = payload.url;
  } else {
    var created = chrome.Tab({ url: payload.url });
    window.tabs.push(created);
    target = { tabId: String(created.id()) };
  }
  var currentTabs = window.tabs();
  for (var i = 0; i < currentTabs.length; i++) {
    if (String(currentTabs[i].id()) === target.tabId) {
      window.activeTabIndex = i + 1;
      break;
    }
  }
  if (String(window.activeTab.id()) !== target.tabId) throw new Error("TAB_MOVED_DURING_FOCUS");
  window.minimized = false;
  window.index = 1;
  chrome.activate();
}
`;
