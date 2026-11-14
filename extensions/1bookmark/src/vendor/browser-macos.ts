// Shared by the Desktop app and the Raycast extension (Raycast is published to its public store,
// so comments here stay in English). Apple Events are sent by PID: addressing the app by name or
// bundle id can pick a headless Chrome started with a separate user-data-dir.
// Safari family: `current tab` / `name`
const MAC_SAFARI_LIKE = ["com.apple.Safari", "com.apple.SafariTechnologyPreview"];
// Chromium family: `active tab` / `title` (shares Chrome's AppleScript dictionary)
const MAC_CHROMIUM_LIKE = [
  "com.google.Chrome",
  "com.google.Chrome.beta",
  "com.google.Chrome.dev",
  "com.google.Chrome.canary",
  "org.chromium.Chromium",
  "com.brave.Browser",
  "com.brave.Browser.beta",
  "com.brave.Browser.nightly",
  "com.microsoft.edgemac",
  "com.microsoft.edgemac.Beta",
  "com.microsoft.edgemac.Dev",
  "com.microsoft.edgemac.Canary",
  "company.thebrowser.Browser", // Arc
  "company.thebrowser.dia", // Dia
  "com.vivaldi.Vivaldi",
  "com.operasoftware.Opera",
  "com.operasoftware.OperaGX",
  "com.naver.Whale",
];

export function macBrowserTabScript(expectedBundleId?: string): string {
  return `
ObjC.import("AppKit");
ObjC.import("ScriptingBridge");
(function () {
  const workspace = $.NSWorkspace.sharedWorkspace;
  const expected = ${JSON.stringify(expectedBundleId ?? null)};
  let target = workspace.frontmostApplication;
  // If Raycast is already frontmost, look for a regular GUI instance of the app that was frontmost
  // before launch. With several GUI instances we cannot tell which one it was, so return nothing
  // rather than a wrong URL.
  if (expected && ObjC.unwrap(target.bundleIdentifier) !== expected) {
    const apps = workspace.runningApplications;
    const candidates = [];
    for (let i = 0; i < apps.count; i++) {
      const app = apps.objectAtIndex(i);
      if (ObjC.unwrap(app.bundleIdentifier) === expected && Number(app.activationPolicy) === 0) candidates.push(app);
    }
    if (candidates.length !== 1) return "null";
    target = candidates[0];
  }
  const bundleId = ObjC.unwrap(target.bundleIdentifier);
  const safari = ${JSON.stringify(MAC_SAFARI_LIKE)}.includes(bundleId);
  if (!safari && !${JSON.stringify(MAC_CHROMIUM_LIKE)}.includes(bundleId)) return "null";
  const app = $.SBApplication.applicationWithProcessIdentifier(Number(target.processIdentifier));
  function checkError() {
    const error = app.lastError;
    if (!error.isNil()) throw new Error("Browser Apple Events failed (" + Number(error.code) + ")");
  }
  const windows = app.valueForKey("windows");
  const count = Number(windows.count);
  checkError();
  if (!count) return "null";
  const tab = windows.objectAtIndex(0).valueForKey(safari ? "currentTab" : "activeTab");
  const url = ObjC.unwrap(tab.valueForKey("URL"));
  checkError();
  const title = ObjC.unwrap(tab.valueForKey(safari ? "name" : "title"));
  checkError();
  if (typeof url !== "string" || !/^https?:\\/\\/\\S+$/.test(url)) return "null";
  return JSON.stringify({ url, title: typeof title === "string" ? title.replace(/\\s+/g, " ").trim() : "", browser: bundleId });
})();
`;
}
