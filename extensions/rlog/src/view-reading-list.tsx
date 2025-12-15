import {
  Action,
  ActionPanel,
  List,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import path from "path";
import { useState, useEffect } from "react";
import { ReadLaterEntry, loadJson } from "@rlog/shared";

interface Preferences {
  blogPath: string;
}

export default function Command() {
  const [readingList, setReadingList] = useState<ReadLaterEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function loadReadingList() {
      try {
        const dataPath = path.join(
          preferences.blogPath,
          "data",
          "reading_list.json",
        );
        const data = loadJson<ReadLaterEntry>(dataPath);
        setReadingList(data);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load reading list",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadReadingList();
  }, []);

  return (
    <List isLoading={isLoading}>
      {readingList.map((entry, index) => (
        <List.Item
          key={index}
          title={entry.title}
          accessories={[{ text: new Date(entry.addedAt).toLocaleDateString() }]}
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
