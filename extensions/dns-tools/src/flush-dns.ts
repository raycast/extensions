import { showToast, Toast } from "@raycast/api";
import { flushDns } from "./flush";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Flushing DNS cache…",
  });
  try {
    await flushDns();
    toast.style = Toast.Style.Success;
    toast.title = "DNS cache flushed";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not flush DNS cache";
    toast.message =
      error instanceof Error && /-128|User canceled/i.test(error.message)
        ? "Administrator authorization was cancelled."
        : error instanceof Error
          ? error.message
          : "Unknown error";
  }
}
