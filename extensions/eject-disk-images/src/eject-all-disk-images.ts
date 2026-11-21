import { showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ejectImages, filterByPreferences, listDiskImages, summarize } from "./disk-images";

export default async function Command() {
  try {
    const { eligible, skipped } = filterByPreferences(await listDiskImages());

    if (eligible.length === 0) {
      await showHUD(skipped.length ? `No disk images to eject (${skipped.length} excluded)` : "No disk images mounted");
      return;
    }

    const results = await ejectImages(eligible);
    const failed = results.filter((r) => !r.ok);

    if (failed.length === 0) {
      await showHUD(`⏏ ${summarize(results)}`);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: summarize(results),
        message: failed.map((f) => `${f.image.imageName}: ${f.error}`).join("\n"),
      });
    }
  } catch (error) {
    await showFailureToast(error, { title: "Failed to List Disk Images" });
  }
}
