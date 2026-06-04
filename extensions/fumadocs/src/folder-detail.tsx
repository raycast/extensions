import { useEffect, useState } from "react";
import { List, Action, ActionPanel, Icon } from "@raycast/api";
import { FolderDetailProps, FolderPage } from "./types";
import { parseFolderPages } from "./utils";

export default function FolderDetail({ folderUrl, folderTitle }: FolderDetailProps) {
  const [pages, setPages] = useState<FolderPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPages = async () => {
      try {
        const folderPages = await parseFolderPages(folderUrl);
        setPages(folderPages);
      } catch (error) {
        console.error("Failed to load folder pages:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPages();
  }, [folderUrl]);

  const sections = [...new Set(pages.map((p) => p.section))];
  const hasSections = sections.some((s) => s !== "");

  const renderItem = (page: FolderPage) => (
    <List.Item
      key={page.url}
      title={page.title}
      icon={page.isFolder ? Icon.Folder : Icon.Document}
      actions={
        <ActionPanel>
          {page.isFolder ? (
            <>
              <Action.Push
                title="View Folder Contents"
                icon={Icon.List}
                target={<FolderDetail folderUrl={page.url} folderTitle={page.title} />}
              />
              <Action.OpenInBrowser url={page.url} title="Open in Browser" />
            </>
          ) : (
            <Action.OpenInBrowser url={page.url} title="Open in Browser" />
          )}
          <Action.CopyToClipboard content={page.url} title="Copy URL" />
        </ActionPanel>
      }
    />
  );

  return (
    <List isLoading={isLoading} navigationTitle={folderTitle} searchBarPlaceholder={`Search in ${folderTitle}...`}>
      {hasSections
        ? sections.map((section) => {
            const sectionPages = pages.filter((p) => p.section === section);
            return section ? (
              <List.Section key={section} title={section}>
                {sectionPages.map(renderItem)}
              </List.Section>
            ) : (
              sectionPages.map(renderItem)
            );
          })
        : pages.map(renderItem)}
      {!isLoading && pages.length === 0 && (
        <List.EmptyView title="No Pages Found" description="This folder appears to be empty or couldn't be parsed." />
      )}
    </List>
  );
}
