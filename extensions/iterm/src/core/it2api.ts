import { existsSync } from "fs";
import { showToast, Toast } from "@raycast/api";

export const IT2API_PATH = "/Applications/iTerm.app/Contents/Resources/utilities/it2api";

export const isIt2apiAvailable = () => existsSync(IT2API_PATH);

export const warnIt2apiMissing = () =>
  showToast({
    style: Toast.Style.Failure,
    title: "it2api not found",
    message: `Expected at ${IT2API_PATH} — ensure iTerm2 is installed at /Applications/iTerm.app`,
  });
