import { List } from "@raycast/api";

import { localOnlyMarkdownPreview } from "../lib/local-markdown.js";
import type { PromptRecord } from "../types/snapshot.js";

export function PromptDetail({ prompt }: { prompt: PromptRecord }) {
  const activityDate = prompt.lastUsedAt ?? prompt.updatedAt;

  return (
    <List.Item.Detail
      markdown={localOnlyMarkdownPreview(prompt.content)}
      metadata={
        <List.Item.Detail.Metadata>
          {prompt.category ? <List.Item.Detail.Metadata.Label title="Category" text={prompt.category.name} /> : null}
          {activityDate ? (
            <List.Item.Detail.Metadata.Label
              title={prompt.lastUsedAt ? "Last Used" : "Updated"}
              text={formatDate(activityDate)}
            />
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
