// This fix is to prevent `TypeError: window.requestAnimationFrame is not a function` error from SWR
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.window = {};
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.window.requestAnimationFrame = setTimeout;

import { showToast, LocalStorage, Toast } from "@raycast/api";

export default async function main() {
  showToast({
    style: Toast.Style.Animated,
    title: "Loading...",
  });
  await LocalStorage.clear();
  showToast({
    style: Toast.Style.Success,
    title: "Done",
  });
}
