import {
  Clipboard,
  closeMainWindow,
  environment,
  getPreferenceValues,
  LaunchType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";

import beautify from "js-beautify";

export async function formatJS(text: string) {
  const trimmedText = text.trim();

  const firstChar = trimmedText[0];
  let json;
  if (firstChar === '"') {
    json = await convert(await parse(trimmedText));
  } else {
    json = await convert(trimmedText);
  }
  if (!json) return;

  const { indent } = getPreferenceValues<Preferences>();
  const options = {
    indent_size: indent === "tab" ? 1 : parseInt(indent, 10),
    space_in_empty_paren: true,
    indent_with_tabs: indent === "tab",
  };

  return beautify(json, options);
}

function unescapeJsonString(str: string): string {
  // Only unscape if the entire payload is deemed escaped.
  // Test for this by cheking if the starting quote character for the first key in the JSON payload is escaped.
  // If it is, its most-likely the entire payload is escaped. Hence un-escape.
  return /^[^"]+\\".*$/.test(str)
    ? str.replace(/\\(["\\/bfnrt]|u[0-9a-fA-F]{4})/g, function (match, p1) {
        const unescapeMap: { [key: string]: string } = {
          '"': '"',
          "\\": "\\",
          "/": "/",
          b: "\b",
          f: "\f",
          n: "\n",
          r: "\r",
          t: "\t",
        };

        if (p1[0] === "u") {
          return String.fromCharCode(parseInt(p1.slice(1), 16));
        } else {
          return unescapeMap[p1] || p1;
        }
      })
    : str;
}

export async function copyFormattedJs(result: string) {
  const { autopaste } = getPreferenceValues<Preferences>();
  if (autopaste) {
    await Clipboard.paste(result);
    if (environment.launchType === LaunchType.Background) {
      await showHUD("✅ Pasted to foremost application");
    } else {
      await closeMainWindow();
      await showToast(Toast.Style.Success, "Pasted to foremost application");
    }
  } else {
    await Clipboard.copy(result);
    if (environment.launchType === LaunchType.Background) {
      await showHUD("✅ Copied to clipboard");
    } else {
      await closeMainWindow();
      await showToast(Toast.Style.Success, "Copied to clipboard");
    }
  }
}

async function convert(input: string) {
  let processedInput = input;
  try {
    processedInput = unescapeJsonString(processedInput);
  } catch (error) {
    console.error("Error unescaping JSON string:", error);
  }
  if (isJson(processedInput)) return processedInput;
  if (processedInput.endsWith(";")) processedInput = processedInput.slice(0, -1);
  try {
    if (isExecuteable(processedInput)) throw new Error("executeable");
    const result = Function(`"use strict";return (${processedInput})`)();
    return JSON.stringify(result);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Please copy a valid JSON/JS Object",
    });
  }
}

function isExecuteable(input: string) {
  return /\([\s\S]*?\)|[\w$]\s*`[\s\S]*?`/.test(input);
}

async function parse(input: string) {
  try {
    return JSON.parse(input);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Please enter a valid JSON string",
    });
    return;
  }
}

export async function formatToJSONLines(input: string) {
  if (!isJson(input) || !isArray(input)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Please enter a valid JSON/JS Array Object",
    });
    return;
  }

  const jsonVal = JSON.parse(`{"data":${input}}`);
  return jsonVal.data.map(JSON.stringify);
}

function isJson(str: string) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

function isArray(str: string) {
  return str.startsWith("[") && str.endsWith("]");
}
