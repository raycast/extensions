import { List } from "@raycast/api";
import type { BrowserEntry } from "../types";
import type { PagePreview } from "../browser/page-content";
import { resultDetailMarkdown } from "./preview-markdown";

export function ResultDetail({
  entry,
  preview,
  isLoading,
}: {
  entry: BrowserEntry;
  preview: PagePreview;
  isLoading: boolean;
}) {
  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={resultDetailMarkdown(entry, preview, isLoading)}
    />
  );
}
