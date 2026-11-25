// Arc can return -1700 when a resolved window reference addresses its tab.
// Dia exposes the tab's title and URL in one properties record.
// JSON preserves punctuation and Unicode; no website JavaScript is executed.
export const pageScript = `function run(argv) {
  var isDia = argv[0] === "company.thebrowser.dia";
  var browser = Application(isDia ? "Dia" : argv[0]);
  if (!browser.running()) return JSON.stringify({error: "NOT_RUNNING"});
  var isArc = argv[0] === "company.thebrowser.Browser";
  var windows = isArc ? browser.windows : browser.windows();
  if (!windows.length) return JSON.stringify({error: "NO_WINDOW"});
  if (isDia) {
    var props = windows[0].activeTab.properties();
    return JSON.stringify({url: props.url || "", title: props.title || ""});
  }
  var tab = isArc ? windows[0].activeTab : windows[0].activeTab();
  return JSON.stringify({url: tab.url() || "", title: tab.title() || ""});
}`;
