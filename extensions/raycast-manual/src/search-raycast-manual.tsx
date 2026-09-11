import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useMemo } from "react";
import { groupByCategory, useManualPages } from "./lib/pages";
import { ManualDetail } from "./manual-detail";

export default function SearchRaycastManual() {
  const { data: pages, isLoading, error } = useManualPages();
  const sections = useMemo(() => groupByCategory(pages ?? []), [pages]);

  useEffect(() => {
    if (error) showFailureToast(error, { title: "Failed to load Raycast Manual" });
  }, [error]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search the Raycast Manual…">
      {error && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to load Raycast Manual"
          description={error.message}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Manual in Browser" url="https://manual.raycast.com/" />
            </ActionPanel>
          }
        />
      )}
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
