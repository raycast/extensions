import { getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { isImage, openInSnapApp, requireSnapApp, runCommand } from "./snapapp";

export default async function Command() {
  await runCommand("Could not open the images in SnapApp", async () => {
    const app = await requireSnapApp();
    if (!app) return;
    let selected: { path: string }[];
    try {
      selected = await getSelectedFinderItems();
    } catch {
      // Raycast reports no selection when Finder is not the frontmost app.
      selected = [];
    }
    const images = selected.map((item) => item.path).filter(isImage);
    if (images.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No images selected",
        message: "Select PNG, JPEG, HEIC or TIFF files in Finder first.",
      });
      return;
    }
    await openInSnapApp(app, images);
  });
}
