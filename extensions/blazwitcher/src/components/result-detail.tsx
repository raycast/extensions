import { List } from "@raycast/api";
import type { SearchResult } from "../types";
import type { PagePreview } from "../browser/page-content";
import { resultDetailMarkdown } from "./preview-markdown";

export function ResultDetail({
  result,
  preview,
  isLoading,
}: {
  result: SearchResult;
  preview: PagePreview;
  isLoading: boolean;
}) {
  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={resultDetailMarkdown(result.entry, preview, isLoading, result)}
    />
  );
}
