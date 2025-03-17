import { Clipboard, showToast, Toast, closeMainWindow, showHUD } from "@raycast/api";
import { descendJsonObject } from "./descendJsonObject";
// @ts-expect-error json-with-bigint is not a module
import { JSONParse } from "json-with-bigint";

function processValue(value: string, base64encode: boolean) {
  return base64encode ? btoa(value) : value;
}

export async function processJson(base64encode = false) {
  try {
    const { text } = await Clipboard.read();
    const jsonObject = JSONParse(text);
    const values = descendJsonObject(jsonObject, undefined);

    const envString = values
      .map(({ key, value }) => `${key}=${processValue(value.toString(), base64encode)}`)
      .join("\n");
    await Clipboard.copy(envString);
    await showHUD("Environment copied to clipboard");
    await closeMainWindow({ clearRootSearch: true });
  } catch (error) {
    await showFailureToast("Error parsing JSON");
  }
}
