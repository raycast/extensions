import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo } from "react";
import { groupByCategory, useManualPages } from "./lib/pages";
import { ManualDetail } from "./manual-detail";

export default function SearchRaycastManual() {
  const { data: pages, isLoading } = useManualPages();
  const sections = useMemo(() => groupByCategory(pages ?? []), [pages]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search the Raycast Manual…">
      {sections.map(({ category, items }) => (
        <List.Section key={category || "uncategorized"} title={category || "Other"}>
          {items.map((page) => (
            <List.Item
              key={page.path}
              icon={Icon.Book}
              title={page.title}
              keywords={[page.slug, page.category, ...page.slug.split("-")]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Read in Raycast"
                    icon={Icon.BlankDocument}
                    target={<ManualDetail page={page} />}
                  />
                  <Action.OpenInBrowser url={page.url} />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={page.url}
                    shortcut={{ macOS: { modifiers: ["cmd"], key: "." }, Windows: { modifiers: ["ctrl"], key: "." } }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
