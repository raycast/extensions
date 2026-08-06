import { showToast, Toast } from "@raycast/api";
import { execWallpaperEngine } from "./cli";

export async function runSimpleCommand(
  command: string,
  successMessage: string,
) {
  try {
    await execWallpaperEngine([command]);
    await showToast({ style: Toast.Style.Success, title: successMessage });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed",
      message: String(error),
    });
  }
}
