import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import fs from "fs";
import path from "path";
import { getActiveUrl, fetchMetadata } from "./utils";

interface Preferences {
  blogPath: string;
  // We can reuse dataPath or have a separate one.
  // The requirement says "separate reading_list.json".
  // We'll assume it lives in the same 'data' folder as the main reading list.
}

interface ReadLaterEntry {
  url: string;
  title: string;
  addedAt: string;
}

export default async function Command() {
  try {
    const preferences = getPreferenceValues<Preferences>();

    // 1. Get URL
    const url = await getActiveUrl();
    if (!url) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No URL found",
        message: "Could not detect a URL from the active browser or clipboard.",
      });
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Saving to Read Later...",
    });

    // 2. Fetch Metadata (Title)
    let title = "Untitled";
    try {
      const metadata = await fetchMetadata(url);
      title = metadata.title || "Untitled";
    } catch (e) {
      console.error("Failed to fetch metadata:", e);
    }

    // 3. Prepare Entry
    const entry: ReadLaterEntry = {
      url,
      title: title.trim(),
      addedAt: new Date().toISOString(),
    };

    // 4. Save to File
    // We'll hardcode 'data/reading_list.json' relative to blogPath for now,
    // or we could add a preference. Given the prompt "separate reading_list.json",
    // I'll put it in the same data directory.
    const dataDir = path.join(preferences.blogPath, "data");
    const filePath = path.join(dataDir, "reading_list.json");

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "[]");
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");
    let list: ReadLaterEntry[] = [];
    try {
      list = JSON.parse(fileContent);
    } catch (e) {
      list = [];
    }

    // Check for duplicates
    if (list.some((item) => item.url === entry.url)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Already in Read Later",
        message: entry.title,
      });
      return;
    }

    list.unshift(entry);
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2));

    await showToast({
      style: Toast.Style.Success,
      title: "Saved to Read Later",
      message: entry.title,
    });
  } catch (error) {
    await showFailureToast(error, { title: "Failed to save" });
  }
}
