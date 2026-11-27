import React, { useMemo, useState } from "react";
import { Action, ActionPanel, Detail, Icon, Keyboard, List } from "@raycast/api";
import { sheetSections } from "./sections";
import { displayMarkdown } from "./markdown";

export function SearchSections({
  title,
  source,
  bundled = false,
}: {
  title: string;
  source: string;
  bundled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const sections = useMemo(() => sheetSections(source), [source]);
  const q = query.trim().toLowerCase();
  const results = sections.filter((s) => `${s.title}\n${s.context}\n${s.source}`.toLowerCase().includes(q));
  return (
    <List
      navigationTitle="Search Within Sheet"
      searchBarPlaceholder="Search headings and section text…"
      searchText={query}
      onSearchTextChange={setQuery}
      filtering={false}
      isShowingDetail
    >
      <List.EmptyView title="No Matching Sections" description="Try a heading or a word from the sheet." />
      {results.map((section) => (
        <List.Item
          key={section.id}
          id={section.id}
          title={section.title}
          subtitle={section.context}
          detail={
            <List.Item.Detail
              markdown={displayMarkdown(section.source, bundled)}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Source Line" text={String(section.line)} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="View Section"
                icon={Icon.Document}
                target={
                  <Detail
                    navigationTitle={`${title} › ${section.title}`}
                    markdown={displayMarkdown(section.source, bundled)}
                    actions={
                      <ActionPanel>
                        <Action.CopyToClipboard
                          title="Copy Section Markdown"
                          content={section.source}
                          shortcut={Keyboard.Shortcut.Common.Copy}
                        />
                      </ActionPanel>
                    }
                  />
                }
              />
              <Action.CopyToClipboard
                title="Copy Section Markdown"
                content={section.source}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action.CopyToClipboard title="Copy Entire Original Markdown" content={source} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
