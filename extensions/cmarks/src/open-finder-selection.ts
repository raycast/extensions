import { getSelectedFinderItems, open, showHUD, showToast, Toast } from "@raycast/api";
import { BUNDLE_ID } from "./cmarks";

/** Finder에서 고른 파일·폴더를 cmarks로 연다. 폴더는 워크스페이스로 추가되고, 파일은 탭으로 열린다. */
export default async function Command() {
  let items: { path: string }[];
  try {
    items = await getSelectedFinderItems();
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Nothing selected in the Finder" });
    return;
  }
  if (items.length === 0) {
    await showToast({ style: Toast.Style.Failure, title: "Nothing selected in the Finder" });
    return;
  }
  for (const item of items) {
    await open(item.path, BUNDLE_ID);
  }
  await showHUD(items.length === 1 ? "Opened in cmarks" : `Opened ${items.length} items in cmarks`);
}
