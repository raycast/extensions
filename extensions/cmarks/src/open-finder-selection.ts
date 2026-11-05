import { getSelectedFinderItems, open, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { APP_STORE_URL, isCmarksInstalled, openInCmarks } from "./app";

/** Finder에서 고른 파일·폴더를 cmarks로 연다. 폴더는 워크스페이스로 추가되고, 파일은 탭으로 열린다. */
export default async function Command() {
  if (!(await isCmarksInstalled())) {
    await showToast({
      style: Toast.Style.Failure,
      title: "cmarks is not installed",
      message: "Get it from the Mac App Store or GitHub.",
      primaryAction: { title: "Open Mac App Store Page", onAction: () => open(APP_STORE_URL) },
    });
    return;
  }

  let items: { path: string }[];
  try {
    items = await getSelectedFinderItems();
  } catch (error) {
    await showFailureToast(error, { title: "Nothing selected in the Finder" });
    return;
  }
  if (items.length === 0) {
    await showToast({ style: Toast.Style.Failure, title: "Nothing selected in the Finder" });
    return;
  }

  for (const item of items) {
    if (!(await openInCmarks(item.path))) return; // 실패는 openInCmarks가 토스트로 알렸다
  }
  await showHUD(items.length === 1 ? "Opened in cmarks" : `Opened ${items.length} items in cmarks`);
}
