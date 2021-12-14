import { showToast, ToastStyle, Toast, showHUD } from "@raycast/api";
import { stopTimer } from "./services/harvest";

export default async function main() {
  // This fix is to prevent `TypeError: window.requestAnimationFrame is not a function` error from SWR
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.window.requestAnimationFrame = setTimeout;

  const toast = new Toast({ style: ToastStyle.Animated, title: "Loading..." });
  await toast.show();
  await stopTimer().catch(async (error) => {
    console.error(error.response.data);
    await toast.hide();
    await showToast(ToastStyle.Failure, "API Error", "Could not stop your timer");
    return;
  });
  await toast.hide();
  await showHUD("Timer stopped");
}
