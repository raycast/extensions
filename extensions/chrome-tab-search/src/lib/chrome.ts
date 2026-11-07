import { runAppleScript } from "@raycast/utils";

export type ChromeTab = {
  id: string;
  title: string;
  url: string;
  /** 前面から数えたウィンドウの番号（1 始まり） */
  windowNumber: number;
};

// タイトルにどんな文字が入っていても崩れないよう、JXA で書いて JSON で受け取る。
// タブごとに問い合わせると数百タブで遅いので、ウィンドウ単位でまとめて取得する
const LIST_TABS = `
function run() {
  const chrome = Application("Google Chrome");
  if (!chrome.running()) return "[]";
  return JSON.stringify(
    chrome.windows().flatMap((window, index) => {
      const ids = window.tabs.id();
      const titles = window.tabs.title();
      const urls = window.tabs.url();
      return ids.map((id, i) => ({ id: String(id), title: titles[i], url: urls[i], windowNumber: index + 1 }));
    }),
  );
}
`;

// タブは別のウィンドウへ移動できるので、ID で全ウィンドウから探す
const ACTIVATE_TAB = `
function run(argv) {
  const chrome = Application("Google Chrome");
  for (const window of chrome.windows()) {
    const index = window.tabs.id().map(String).indexOf(argv[0]);
    if (index === -1) continue;
    window.activeTabIndex = index + 1;
    window.index = 1;
    chrome.activate();
    return;
  }
  throw new Error("Tab not found (it may have been closed)");
}
`;

export async function listTabs(): Promise<ChromeTab[]> {
  return JSON.parse(await runAppleScript(LIST_TABS, { language: "JavaScript" }));
}

export async function activateTab(id: string): Promise<void> {
  await runAppleScript(ACTIVATE_TAB, [id], { language: "JavaScript" });
}
