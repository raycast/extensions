import { showFailureToast, showToast, Toast } from "@raycast/api";
import { getFinderFolder, openInIterm } from "./macos";

export default async function FinderToItermCommand() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "正在打开 iTerm",
  });

  try {
    await openInIterm(await getFinderFolder());
    toast.style = Toast.Style.Success;
    toast.title = "已在 iTerm 中打开 Finder 目录";
  } catch (error) {
    await showFailureToast(error, { title: "无法打开 iTerm" });
  }
}
