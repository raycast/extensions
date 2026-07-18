import { getSelectedFinderItems, showHUD, showToast, Toast } from "@raycast/api";
import { openSnapzy } from "./snapzy";

const IMAGE_EXT = /\.(png|jpe?g|gif|tiff?|heic|webp|bmp)$/i;

export default async function Command() {
  let paths: string[];
  try {
    paths = (await getSelectedFinderItems()).map((item) => item.path);
  } catch {
    // Rejects both when Finder isn't frontmost and when Raycast lacks Finder automation
    // permission — cover both causes rather than misdiagnosing one as the other.
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't read the Finder selection",
      message:
        "Make sure Finder is the frontmost app and Raycast has Automation access to Finder (System Settings → Privacy & Security → Automation).",
    });
    return;
  }
  const images = paths.filter((p) => IMAGE_EXT.test(p));
  if (images.length < 2) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Select at least 2 images",
      message: "Snapzy needs two or more images to combine.",
    });
    return;
  }
  if (await openSnapzy("open/combine", { file: images })) {
    const skipped = paths.length - images.length;
    await showHUD(
      skipped > 0
        ? `Combining ${images.length} of ${paths.length} selected files`
        : `Combining ${images.length} images`,
    );
  }
}
