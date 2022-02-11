import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const jsonToGo = require("./util");

export const copy = async () => {
  const clipboard = await runAppleScript("the clipboard");
  if (!clipboard || clipboard.length === 0) {
    throw "Clipboard is empty";
  }
  return clipboard;
};

export const parse = async (contents: string) => {
  await Clipboard.copy(contents);
};

export default async () => {
  let jsonString = "";
  try {
    jsonString = await copy();
  } catch (e) {
    await showToast(Toast.Style.Failure, `${e}`);
    return;
  }

  const got = jsonToGo(jsonString, null, null, false);
  if (got.error) {
    await showToast(Toast.Style.Failure, got.error);
    return;
  } else {
    await parse(got.go);
    await showHUD("Copied to clipboard");
  }
};
