// Arc returns -1700 when a resolved window reference is used to address its
// active tab. Keep Arc's front-window and active-tab paths as object specifiers.
// Chrome and Edge use resolved window and tab references.
// JSON preserves punctuation and Unicode; no website JavaScript is executed.
export const pageScript = `function run(argv) {
  var browser = Application(argv[0]);
  if (!browser.running()) return JSON.stringify({error: "NOT_RUNNING"});
  var isArc = argv[0] === "company.thebrowser.Browser";
  var windows = isArc ? browser.windows : browser.windows();
  if (!windows.length) return JSON.stringify({error: "NO_WINDOW"});
  var tab = isArc ? windows[0].activeTab : windows[0].activeTab();
  return JSON.stringify({url: tab.url() || "", title: tab.title() || ""});
}`;
