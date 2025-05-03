import { showToast, Toast, showHUD } from "@raycast/api";
import { isAxiosError, toggleTimer } from "./services/harvest";

export default async function main() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Loading..." });
  await toast.show();
  try {
    const result = await toggleTimer();
    await toast.hide();
    await showHUD(`Timer ${result.action}`);
  } catch (error) {
    isAxiosError(error) ? console.error(error.response?.data) : console.error(error);
    await toast.hide();
    await showToast({
      style: Toast.Style.Failure,
      title: "API Error",
      message: "Could not toggle your timer",
    });
  }
}
