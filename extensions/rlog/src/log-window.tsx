import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fs from "fs";
import path from "path";
import { getOpenTabs, fetchMetadata } from "@rlog/shared";

interface Preferences {
  blogPath: string;
  dataPath: string;
}

interface ReadingEntry {
  url: string;
  title: string;
  author: string | null;
  publishedDate: string | null;
  addedDate: string;
  thoughts?: string;
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

    const today = new Date().toISOString().split("T")[0];

    // Process in parallel with Promise.all
    const results = await Promise.all(
      validTabs.map(async (url) => {
        try {
          const meta = await fetchMetadata(url);
          return {
            url,
            title: meta.title,
            author: meta.author,
            publishedDate: meta.publishedDate,
            addedDate: today,
          } as ReadingEntry;
        } catch (e) {
          console.error(`Failed to process ${url}`, e);
          return null;
        }
      }),
    );

    const newEntries = results.filter((e): e is ReadingEntry => e !== null);

    // Save to file
    const fullPath = path.join(preferences.blogPath, preferences.dataPath);

    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, "[]");
    }

    const fileContent = fs.readFileSync(fullPath, "utf-8");
    let readings: ReadingEntry[] = [];
    try {
      readings = JSON.parse(fileContent);
    } catch (e) {
      readings = [];
    }

    // Filter duplicates (by URL)
    const existingUrls = new Set(readings.map((r) => r.url));
    const uniqueNewEntries = newEntries.filter((e) => !existingUrls.has(e.url));

    if (uniqueNewEntries.length === 0) {
      await showToast({
        style: Toast.Style.Success,
        title: "No new articles",
        message: "All open tabs are already logged.",
      });
      return;
    }

    readings.unshift(...uniqueNewEntries);
    // Sort by addedDate descending
    readings.sort(
      (a, b) =>
        new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime(),
    );

    fs.writeFileSync(fullPath, JSON.stringify(readings, null, 2));

    await showToast({
      style: Toast.Style.Success,
      title: "Logged Window",
      message: `Added ${uniqueNewEntries.length} articles.`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to log window",
      message: String(error),
    });
  }
}
