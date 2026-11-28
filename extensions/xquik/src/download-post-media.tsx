import { Clipboard, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { showErrorToast } from "./lib/error-toast";
import { saveMedia } from "./lib/media";
import { postFromClipboard } from "./lib/post-input";
import { savedMediaMessage } from "./lib/format";

export default async function Command({
  arguments: { post },
}: LaunchProps<{ arguments: Arguments.DownloadPostMedia }>) {
  const target = post.trim() || postFromClipboard(await Clipboard.readText());
  if (!target) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Copy a Post Link First",
      message: "Or type the link after the command name.",
    });
    return;
  }
  const download = async () => {
    await showToast({ style: Toast.Style.Animated, title: "Downloading Media" });
    try {
      await showHUD(savedMediaMessage((await saveMedia(target)).length));
    } catch (error) {
      await showErrorToast(error as Error, download);
    }
  };
  await download();
}
