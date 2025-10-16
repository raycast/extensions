import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { writeFile } from "fs/promises";
import fetch from "node-fetch";
import { homedir } from "os";
import path from "path";

interface JsonItem {
  [key: string]: string;
}

export default function Command() {
  downloadAndSaveJson();
}

async function downloadAndSaveJson() {
  try {
    const prefs = getPreferenceValues<Preferences.ReloadUrlNoView>();
    // Check if the URL is defined
    if (!prefs.jsonURLPath) {
      showToast({
        style: Toast.Style.Failure,
        title: "JSON URL is not set, please set it in the extension preferences",
      });
      return;
    }
    console.log("Downloading JSON from: ", prefs.jsonURLPath);

    // Use fetch to get the JSON data
    const response = await fetch(prefs.jsonURLPath);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const jsonData: JsonItem[] = await response.json(); // Assume jsonData is an array of JsonItem

    // Creating a single object from multiple key-value pairs
    const keyValueData = jsonData.reduce((acc: { [key: string]: any }, item: JsonItem) => {
      const key = item[prefs.jsonKeyForKey];
      const value = item[prefs.jsonKeyForValue];
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    }, {});

    // Save the JSON data to a file
    const filePath = path.join(homedir(), "Downloads", "raycast_key_value.json");
    await writeFile(filePath, JSON.stringify(keyValueData, null, 2));
    console.log("JSON downloaded and saved to ", filePath);
    showToast({
      style: Toast.Style.Success,
      title: "JSON downloaded successfully",
      message: `File saved to ${filePath}`,
    });
  } catch (error: any) {
    console.error("Error in downloading or saving JSON: ", error);
    await showToast({ style: Toast.Style.Failure, title: "Failed to download JSON", message: error.message });
  }
}
