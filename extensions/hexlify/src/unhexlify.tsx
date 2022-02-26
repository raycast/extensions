import { showToast, ToastStyle } from "@raycast/api";
import { copyTextToClipboard, showHUD } from "@raycast/api";
// @ts-expect-error no type def for it
import binascii from "binascii";

import execa from "execa";

async function runShellScript(command: string) {
  const { stdout } = await execa.command(command, {
    env: { LC_CTYPE: "UTF-8" },
  });
  return stdout;
}

async function readClipboard() {
  return await runShellScript("pbpaste");
}
async function setClipboard(contents: string) {
  await copyTextToClipboard(contents);
  showHUD("Copied to clipboard");
}

export default async () => {
  try {
    const clipboard = await readClipboard();
    const unhexlified = binascii.unhexlify(clipboard);
    await setClipboard(unhexlified);
  } catch (e) {
    if (typeof e === "string") {
      await showToast(ToastStyle.Failure, "Encode failed", e);
    }
  }
};
