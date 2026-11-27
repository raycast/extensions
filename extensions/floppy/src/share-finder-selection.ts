import { Clipboard, getSelectedFinderItems, showHUD, showToast, Toast } from "@raycast/api";
import { shortUrl } from "./lib/format";
import { shareFiles } from "./lib/upload";

export default async function ShareFinderSelection() {
  let paths: string[];
  try {
    paths = (await getSelectedFinderItems()).map((i) => i.path);
  } catch {
    paths = [];
  }
  if (!paths.length) {
    await showToast({ style: Toast.Style.Failure, title: "Select a file in Finder first" });
    return;
  }
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: paths.length === 1 ? "Sharing the file" : `Sharing ${paths.length} files`,
  });
  try {
    const shared = await shareFiles(paths, {
      onProgress: (f) => {
        toast.message = `${Math.round(f * 100)}%`;
      },
    });
    await Clipboard.copy(shared.url);
    await toast.hide();
    await showHUD(`Copied ${shortUrl(shared.url)}`);
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't share it";
    toast.message = e instanceof Error ? e.message : String(e);
  }
}
