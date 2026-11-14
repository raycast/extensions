"use strict";

let port: browser.runtime.Port | undefined;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let retryDelay = 1000;

type NativeCommand = { requestId: string; command: string; tabId?: number; windowId?: number };

async function handleCommand(message: NativeCommand) {
  if (message.command === "status") {
    return { version: browser.runtime.getManifest().version };
  }
  if (message.command === "list") {
    const windows = await browser.windows.getAll({ populate: true, windowTypes: ["normal"] });
    return windows.map((window) => {
      const tabs = window.tabs || [];
      return {
        id: window.id,
        title: (tabs.find((tab) => tab.active) || tabs[0] || {}).title || "",
        tabs: tabs.map((tab) => ({
          id: tab.id,
          title: tab.title || "",
          url: tab.url || ("pendingUrl" in tab && typeof tab.pendingUrl === "string" ? tab.pendingUrl : ""),
        })),
      };
    });
  }
  if (message.command === "focus") {
    if (
      typeof message.tabId !== "number" ||
      typeof message.windowId !== "number" ||
      !Number.isSafeInteger(message.tabId) ||
      !Number.isSafeInteger(message.windowId)
    ) {
      throw new Error("Invalid Firefox tab or window ID");
    }
    const tab = await browser.tabs.get(message.tabId);
    if (tab.windowId !== message.windowId) throw new Error("Firefox tab moved. Refresh the list.");
    await browser.tabs.update(message.tabId, { active: true });
    await browser.windows.update(tab.windowId, { focused: true });
    return true;
  }
  throw new Error("Unsupported Firefox command");
}

async function connect() {
  clearTimeout(retryTimer);
  if (port) return;
  try {
    const info = await browser.runtime.getBrowserInfo();
    // Zen deliberately reports name="Firefox", with its own version in `zen`.
    const isZen =
      info.name.toLowerCase() === "zen" ||
      ("zen" in info &&
        info.zen !== null &&
        typeof info.zen === "object" &&
        "version" in info.zen &&
        typeof info.zen.version === "string");
    if (port) return;
    const connection = browser.runtime.connectNative(isZen ? "app_hopper.zen" : "app_hopper.firefox");
    port = connection;
    connection.onMessage.addListener(async (value: unknown) => {
      if (!value || typeof value !== "object" || !("requestId" in value) || typeof value.requestId !== "string") return;
      const message = value as NativeCommand;
      retryDelay = 1000;
      let response;
      try {
        response = { requestId: message.requestId, data: await handleCommand(message) };
      } catch (error) {
        response = {
          requestId: message.requestId,
          error:
            error && typeof error === "object" && "message" in error && typeof error.message === "string"
              ? error.message
              : "Firefox request failed",
        };
      }
      if (port === connection) {
        try {
          connection.postMessage(response);
        } catch {
          // A closed native connection will schedule its own retry below.
        }
      }
    });
    connection.onDisconnect.addListener(() => {
      // Reading error prevents an unchecked runtime error without logging browsing data.
      void connection.error;
      if (port !== connection) return;
      port = undefined;
      browser.browserAction.setBadgeText({ text: "!" });
      retryTimer = setTimeout(connect, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 30000);
    });
    try {
      connection.postMessage({ ready: true });
    } catch {
      // Firefox reports a missing helper through onDisconnect.
    }
    browser.browserAction.setBadgeText({ text: "" });
  } catch {
    browser.browserAction.setBadgeText({ text: "!" });
    retryTimer = setTimeout(connect, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 30000);
  }
}

browser.browserAction.onClicked.addListener(() => {
  retryDelay = 1000;
  const previous = port;
  port = undefined;
  if (previous) previous.disconnect();
  return connect();
});
connect();
