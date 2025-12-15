import { Action, ActionPanel, List, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import path from "path";
import { useState, useEffect } from "react";
import { ReadingEntry, loadJson } from "./utils";

interface Preferences {
  blogPath: string;
  dataPath: string;
}

export default function Command() {
  const [readings, setReadings] = useState<ReadingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function loadReadings() {
      try {
        const dataPath = path.join(preferences.blogPath, preferences.dataPath);
        const data = loadJson<ReadingEntry>(dataPath);

        if (data.length === 0) {
          // Optional: check if file exists to distinguish between empty list and missing file
          // But loadJson handles missing file by returning empty array.
          // We can just show empty list.
        }
        setReadings(data);
      } catch (error) {
        await showFailureToast(error, { title: "Failed to load readings" });
      } finally {
        setIsLoading(false);
      }
    }

    loadReadings();
  }, []);

  return (
    <List isLoading={isLoading}>
      {readings.map((entry, index) => (
        <List.Item
          key={index}
          title={entry.title}
          subtitle={entry.author || undefined}
          accessories={[
            { text: new Date(entry.addedDate).toLocaleDateString() },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={entry.url} />
              <Action.CopyToClipboard content={entry.url} title="Copy URL" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
