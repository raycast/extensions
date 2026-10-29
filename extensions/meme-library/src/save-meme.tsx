import { getFrontmostApplication, getSelectedFinderItems, showHUD, showToast, Toast } from "@raycast/api";
import { isImagePath } from "./lib/library";
import { getLibrary, readClipboardSource, saveSource } from "./lib/save";

async function selectedFinderImages(): Promise<string[]> {
  try {
    const app = await getFrontmostApplication();
    if (app.bundleId !== "com.apple.finder") return [];
    return (await getSelectedFinderItems()).map((item) => item.path).filter(isImagePath);
  } catch {
    return [];
  }
}

export default async function Command() {
  const library = getLibrary();
  try {
    const finderImages = await selectedFinderImages();
    if (finderImages.length > 0) {
      let added = 0;
      let skipped = 0;
      let failed = 0;
      // One file that cannot be read must not stop the others.
      for (const path of finderImages) {
        const result = await library.addFile(path).catch(() => undefined);
        if (!result) failed++;
        else if (result.duplicate) skipped++;
        else added++;
      }
      await showHUD(
        `Saved ${added} meme${added === 1 ? "" : "s"} from Finder` +
          (skipped > 0 ? `, ${skipped} already in your library` : "") +
          (failed > 0 ? `, ${failed} could not be read` : ""),
      );
      return;
    }
    const source = await readClipboardSource();
    // A download can take seconds. A HUD shows even when the Raycast window is closed.
    if (source.kind === "url" && !source.url.startsWith("data:")) await showHUD("Downloading meme…");
    const { meme, duplicate } = await saveSource(library, source);
    await showHUD(duplicate ? "Already in your meme library" : `Saved ${meme.file.endsWith(".gif") ? "GIF" : "image"}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not save meme",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
