/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef } from "react";

import {
  createStrokeOrderDiagram,
  loadStrokeOrderEntries,
  strokeOrderDataSourceTitle,
  strokeOrderDataSourceUrl,
  type StrokeOrderEntry,
} from "@/core/stroke-order";

interface StrokeOrderPageProps {
  characters: string[];
}

function getDetailMarkdown(entry: StrokeOrderEntry): string {
  if (entry.status === "unavailable") {
    return `# ${entry.character}\n\nNo stroke-order data is available for this character.`;
  }

  if (entry.status === "error") {
    return `# ${entry.character}\n\nUnable to load stroke-order data.\n\n${entry.message}`;
  }

  const diagram = createStrokeOrderDiagram(entry.character, entry.strokes);
  const displayWidth = Math.min(diagram.width, 720);
  return `<img src="${diagram.dataUri}" alt="Stroke order for ${entry.character}" width="${displayWidth}" />\n\n<sup>The red stroke is added at each step.</sup>\n\n<sup>Convention: PRC · Source: [${strokeOrderDataSourceTitle}](${strokeOrderDataSourceUrl})</sup>`;
}

function getSubtitle(entry: StrokeOrderEntry): string {
  if (entry.status === "available") {
    return `${entry.strokes.length} ${entry.strokes.length === 1 ? "stroke" : "strokes"}`;
  }
  return entry.status === "unavailable" ? "No stroke data" : "Couldn't load stroke data";
}

export default function StrokeOrderPage({ characters }: StrokeOrderPageProps) {
  const abortable = useRef<AbortController>(undefined);
  const { data, isLoading, revalidate } = usePromise(
    async (charactersKey: string) => {
      const requestedCharacters = Array.from(charactersKey);
      return loadStrokeOrderEntries(requestedCharacters, abortable.current?.signal);
    },
    [characters.join("")],
    { abortable },
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Stroke Order"
      searchBarPlaceholder="Filter characters..."
    >
      {data?.map((entry) => (
        <List.Item
          key={entry.character}
          icon={Icon.Brush}
          title={entry.character}
          subtitle={getSubtitle(entry)}
          detail={<List.Item.Detail markdown={getDetailMarkdown(entry)} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Character" content={entry.character} />
              {entry.status === "error" && (
                <Action title="Retry Loading Stroke Data" icon={Icon.ArrowClockwise} onAction={revalidate} />
              )}
              <Action.OpenInBrowser title="Open Data Source" url={strokeOrderDataSourceUrl} />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView icon={Icon.Brush} title={isLoading ? "Loading stroke order..." : "No stroke-order data found"} />
    </List>
  );
}
