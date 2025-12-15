import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fs from "fs";
import path from "path";
import { getOpenTabs, fetchMetadata } from "./utils";

interface Preferences {
  blogPath: string;
}

interface ReadLaterEntry {
  url: string;
  title: string;
  addedAt: string;
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Fetching tabs...",
    });

    const tabs = await getOpenTabs();
    const validTabs = Array.from(
      new Set(tabs.filter((url) => url.startsWith("http"))),
    );

    if (validTabs.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No valid tabs found",
        message: "Open some articles in Chrome, Safari, or Arc.",
      });
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: `Processing ${validTabs.length} tabs...`,
    });

    // Process in parallel
    const entries = await Promise.all(
      validTabs.map(async (url) => {
        try {
          const meta = await fetchMetadata(url);
          return {
            url,
            title: meta.title,
            addedAt: new Date().toISOString(),
          } as ReadLaterEntry;
        } catch (e) {
          console.error(`Failed to process ${url}`, e);
          return null;
        }
      }),
    );

    const newEntries = entries.filter((e): e is ReadLaterEntry => e !== null);

    // Save to file
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

    // Filter duplicates
    const existingUrls = new Set(list.map((item) => item.url));
    const uniqueNewEntries = newEntries.filter((e) => !existingUrls.has(e.url));

    if (uniqueNewEntries.length === 0) {
      await showToast({
        style: Toast.Style.Success,
        title: "No new items",
        message: "All open tabs are already in Read Later.",
      });
      return;
    }

    list.unshift(...uniqueNewEntries);
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2));

    await showToast({
      style: Toast.Style.Success,
      title: "Saved Window",
      message: `Added ${uniqueNewEntries.length} items to Read Later.`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to save window",
      message: String(error),
    });
  }
}
