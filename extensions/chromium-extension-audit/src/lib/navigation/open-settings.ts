import { Clipboard, open, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Extension } from "../model";
import { settingsTarget } from "./settings-target";

export async function openSettings(
  extension: Pick<Extension, "id" | "browser" | "profile" | "profileName">,
): Promise<void> {
  const target = settingsTarget(extension);
  await Clipboard.copy(extension.id);
  if (target.browser.profileArgument) {
    try {
      await promisify(execFile)("/usr/bin/open", target.args);
    } catch {
      await open(target.browser.extensionsUrl, target.browser.bundleId);
    }
  } else {
    await open(target.detailUrl, target.browser.bundleId);
  }
  await showToast({
    style: Toast.Style.Success,
    title: "Extension ID copied",
    message: target.message,
  });
}
