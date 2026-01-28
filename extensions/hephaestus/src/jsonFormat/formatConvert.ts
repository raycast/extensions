import { showToast, Toast } from "@raycast/api";
import beautify from "js-beautify";

export async function formatJson(json: string) {
  const trimmedJson = json.trim();

  const firstChar = trimmedJson.charAt(0);
  let jsonValue;
  if (firstChar === '"') {
    // Convert the JSON string to a JavaScript object
    jsonValue = await convertJson(await parseJson(trimmedJson));
  } else {
    // Convert the JSON string to a JavaScript object
    jsonValue = await convertJson(trimmedJson);
  }

  if (!jsonValue) return null;

  const options = {
    indent_size: 1,
    space_in_empty_paren: true,
    indent_with_tabs: true,
  };
  return beautify(jsonValue, options);
}

// Parse the JSON string to a JavaScript object
async function parseJson(json: string) {
  try {
    return JSON.parse(json);
  } catch (error) {
    await showToast({
      title: "Invalid JSON",
      message: "The JSON string is not valid",
      style: Toast.Style.Failure,
    });
    return null;
  }
}

// Convert the JSON string to a JavaScript object
async function convertJson(json: string) {
  let inputJson = json;
  try {
    inputJson = unescapeJson(inputJson);
  } catch (error) {
    console.log("Error unescaping JSON:", error);
  }
  if (isJson(inputJson)) {
    return inputJson;
  }
  if (inputJson.endsWith(";")) {
    inputJson = inputJson.slice(0, -1);
  }

  try {
    if (isExecutableJson(inputJson)) throw new Error("Executable JSON");
    // Convert the JSON string to a JavaScript object
    const result = Function(`"use strict";return (${inputJson})`)();
    return JSON.stringify(result);
  } catch (error) {
    await showToast({
      title: "Invalid JSON",
      message: "The JSON string is not valid",
      style: Toast.Style.Failure,
    });
    return null;
  }
}

// Check if the string is a valid JSON string
function isJson(json: string): boolean {
  try {
    JSON.parse(json);
    return true;
  } catch (error) {
    return false;
  }
}

// Check if the string is a valid executable JSON string
function isExecutableJson(json: string): boolean {
  return /\([\s\S]*?\)|[\w$]\s*`[\s\S]*?`/.test(json);
}

// Unescape the JSON string
function unescapeJson(json: string): string {
  return json.replace(/\\(["\\/bfnrt]|u[0-9a-fA-F]{4})/g, function (match, p1) {
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
  });
}
