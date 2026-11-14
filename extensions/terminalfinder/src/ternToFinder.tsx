import { Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getTernWorkingDirectory, openInFinder } from "./utils";

export default async () => {
  try {
    const cwd = await getTernWorkingDirectory();
    await openInFinder(cwd);
    await showToast(Toast.Style.Success, "Done");
  } catch (err) {
    await showFailureToast(err);
  }
};
