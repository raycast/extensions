import { clearLocalStorage, showToast, ToastStyle } from "@raycast/api";

export default async function main() {
  // This fix is to prevent `TypeError: window.requestAnimationFrame is not a function` error from SWR
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.window.requestAnimationFrame = setTimeout;

  showToast(ToastStyle.Animated, "Loading...");
  await clearLocalStorage();
  showToast(ToastStyle.Success, "Done");
}
