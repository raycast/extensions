import { runAppleScript } from "@raycast/utils";

export type ChromeTab = {
  id: string;
  title: string;
  url: string;
  /** 前面から数えたウィンドウの番号（1 始まり） */
  windowNumber: number;
};

// タイトルにどんな文字が入っていても崩れないよう、JXA で書いて JSON で受け取る。
// タブごとに問い合わせると数百タブで遅いので、ウィンドウ単位でまとめて取得する。
// 取得中にタブの移動や閉じる操作があっても ID とタイトル/URL の対応がずれないよう、前後で ID の一貫性を検証する
const LIST_TABS = `
function run() {
  const chrome = Application("Google Chrome");
  if (!chrome.running()) return "[]";
  const results = [];
  const windows = chrome.windows();
  for (let index = 0; index < windows.length; index++) {
    const window = windows[index];
    const windowNumber = index + 1;
    let windowTabs = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const initialIds = window.tabs.id().map(String);
      const titles = window.tabs.title();
      const urls = window.tabs.url();
      const verifyIds = window.tabs.id().map(String);
      if (
        initialIds.length === titles.length &&
        initialIds.length === urls.length &&
        initialIds.length === verifyIds.length &&
        initialIds.every((id, i) => id === verifyIds[i])
      ) {
        windowTabs = initialIds.map((id, i) => ({
          id: id,
          title: titles[i],
          url: urls[i],
          windowNumber: windowNumber,
        }));
        break;
      }
    }
    if (windowTabs) {
      results.push(...windowTabs);
    }
  }
  return JSON.stringify(results);
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
    window.minimized = false;
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
