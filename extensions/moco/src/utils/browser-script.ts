// Constant program; the selected application ID is passed as data, never interpolated as code.
export const CURRENT_BROWSER_TAB_SCRIPT = `
function run(argv) {
  const id = argv[0];
  const safari = id === "com.apple.Safari" || id === "com.apple.SafariTechnologyPreview";
  const allowed = ["com.apple.Safari", "com.apple.SafariTechnologyPreview", "com.google.Chrome", "company.thebrowser.Browser", "com.brave.Browser", "com.microsoft.edgemac", "com.vivaldi.Vivaldi", "org.chromium.Chromium"];
  if (allowed.indexOf(id) < 0) throw new Error("UNSUPPORTED_BROWSER");
  const browser = Application(id);
  if (!browser.running()) throw new Error("BROWSER_NOT_RUNNING");
  const windows = browser.windows();
  if (windows.length === 0) throw new Error("BROWSER_NO_WINDOWS");
  const tab = safari ? windows[0].currentTab() : windows[0].activeTab();
  return JSON.stringify({ url: tab.url() || "", title: (safari ? tab.name() : tab.title()) || "" });
}
`;
