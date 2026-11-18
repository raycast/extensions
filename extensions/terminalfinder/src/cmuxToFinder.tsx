import { Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getCmuxWorkingDirectory, openInFinder } from "./utils";

export default async () => {
  try {
    const cwd = await getCmuxWorkingDirectory();
    await openInFinder(cwd);
    await showToast(Toast.Style.Success, "Done");
  } catch (err) {
    await showFailureToast(err);
  }
};
