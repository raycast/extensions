import { getSelectedText, closeMainWindow, showToast, Toast, Clipboard } from "@raycast/api";
import { Parser } from "expr-eval";
import { loadPreferences, Preferences } from "./preferences";

function evaluate(text: string, preferences: Preferences) {
  let result = new Parser().evaluate(text);

  if (typeof result !== "number") {
    throw new Error(result);
  }

  if (preferences.maxDecimals) {
    const factor = Math.pow(10, preferences.maxDecimals);
    result = Math.round(result * factor) / factor;
  }

  return result;
}

async function apply(result: number, preferences: Preferences) {
  if (preferences.replaceSelection) {
    await Clipboard.paste(result);
  }

  if (preferences.copyToClipboard) {
    await Clipboard.copy(result);
  }

  if (preferences.displayResult) {
    await showToast({
      style: Toast.Style.Success,
      title: `Result: ${result}`,
    });
  }

  return Promise.resolve();
}

async function onError(error: string) {
  return showToast({
    style: Toast.Style.Failure,
    title: `An error occurred: ${error}`,
  });
}

export default async function Command() {
  const preferences = loadPreferences();

  return closeMainWindow()
    .then(getSelectedText)
    .then((text) => evaluate(text, preferences))
    .then((result) => apply(result, preferences))
    .catch((error) => onError(error.message || error));
}
