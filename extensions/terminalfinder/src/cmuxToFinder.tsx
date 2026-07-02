import { Toast, showToast, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getCmuxWorkingDirectory } from "./utils";

export default async () => {
  try {
    const cwd = await getCmuxWorkingDirectory();
    await open(cwd, "Finder");
    await showToast(Toast.Style.Success, "Done");
  } catch (err) {
    await showFailureToast(err);
  }
};
