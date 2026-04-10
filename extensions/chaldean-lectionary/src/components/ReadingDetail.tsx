import { ActionPanel, Action, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchScripture } from "../utils/fetchScripture";

export function ReadingDetail({ title, citation }: { title: string; citation: string }) {
  const [markdown, setMarkdown] = useState<string>("# Loading...\n\nFetching scripture from USCCB...");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const text = await fetchScripture(citation);
        if (isMounted) {
          setMarkdown(`# ${title}\n*${citation}*\n\n---\n\n${text}`);
          setIsLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setMarkdown(`# ${title}\n*${citation}*\n\n---\n\nError fetching scripture: ${error}`);
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [citation, title]);

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Reading" content={markdown.replace(/^#.*\n\*.*\n\n---\n\n/, "")} />
          <Action.Paste title="Paste Reading" content={markdown.replace(/^#.*\n\*.*\n\n---\n\n/, "")} />
        </ActionPanel>
      }
    />
  );
}

export type ReadingItem = { label: string; citation: string };

export function getReadingItems(
  sunday: import("../data/readings2026").DayReadings | undefined,
  weekday: import("../data/weekdayReadings2026").WeekdayReadings | undefined,
): ReadingItem[] {
  const items: ReadingItem[] = [];

  if (sunday) {
    if (sunday.reading1) items.push({ label: "📖 First Reading", citation: sunday.reading1 });
    if (sunday.reading2) items.push({ label: "📖 Second Reading", citation: sunday.reading2 });
    items.push({ label: "✉️ Epistle", citation: sunday.epistle });
    items.push({ label: "✝️ Gospel", citation: sunday.gospel });
  }

  if (weekday) {
    items.push({ label: "✉️ Epistle", citation: weekday.epistle });
    items.push({ label: "✝️ Gospel", citation: weekday.gospel });
  }

  return items;
}
