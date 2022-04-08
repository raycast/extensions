// This fix is to prevent `TypeError: window.requestAnimationFrame is not a function` error from SWR
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.window = {};
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.window.requestAnimationFrame = setTimeout;

import { showToast, Toast, showHUD } from "@raycast/api";
import { stopTimer } from "./services/harvest";

export default async function main() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Loading..." });
  await toast.show();
  await stopTimer().catch(async (error) => {
    console.error(error.response.data);
    await toast.hide();
    await showToast({
      style: Toast.Style.Failure,
      title: "API Error",
      message: "Could not stop your timer",
    });
    return;
  });
  await toast.hide();
  await showHUD("Timer stopped");
}
