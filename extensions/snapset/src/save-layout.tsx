import { LaunchProps, Toast, closeMainWindow, open, showToast } from "@raycast/api";
import {
  SnapsetNotInstalledError,
  SnapsetTooOldError,
  WEBSITE,
  findSnapset,
  listLayouts,
  requestOrReport,
} from "./snapset";

export default async function Command(props: LaunchProps<{ arguments: Arguments.SaveLayout }>) {
  const name = props.arguments.name?.trim() ?? "";
  try {
    const app = await findSnapset();
    // Only a Snapset that can list layouts as JSON also takes save requests; an older
    // one would ignore the request without a word.
    await listLayouts(app);
    await closeMainWindow({ clearRootSearch: true });
    // Snapset confirms on screen itself, so no HUD on success — it would say the same thing twice.
    await requestOrReport(app, "save", name ? { name } : {});
  } catch (error) {
    if (error instanceof SnapsetNotInstalledError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Snapset is not installed",
        primaryAction: { title: "Get Snapset", onAction: () => open(WEBSITE) },
      });
    } else if (error instanceof SnapsetTooOldError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Update Snapset",
        message: "Saving from Raycast needs a newer version of Snapset.",
      });
    } else {
      await showToast({ style: Toast.Style.Failure, title: "Could not reach Snapset", message: String(error) });
    }
  }
}
