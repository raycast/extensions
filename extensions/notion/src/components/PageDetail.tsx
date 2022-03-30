import { ActionPanel, Detail, CopyToClipboardAction, PasteAction } from "@raycast/api";
import { useEffect, useState } from "react";
import { Page, PageContent, fetchPageContent } from "../utils/notion";
import { storeRecentlyOpenedPage } from "../utils/local-storage";
import { handleOnOpenPage } from "../utils/openPage";

export function PageDetail(props: { page: Page }): JSX.Element {
  const page = props.page;
  const pageName = (page.icon_emoji ? page.icon_emoji + " " : "") + (page.title ? page.title : "Untitled");

  useEffect(() => {
    storeRecentlyOpenedPage(page);
  }, [page]);

  const [pageContent, setPageContent] = useState<PageContent>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load page content
  useEffect(() => {
    const getPageContent = async () => {
      setIsLoading(true);

      const fetchedPageContent = await fetchPageContent(page.id);

      if (fetchedPageContent && fetchedPageContent.markdown) {
        setPageContent(fetchedPageContent);
      }

      setIsLoading(false);
    };
    getPageContent();
  }, []);

  return (
    <Detail
      markdown={`# ${page.title}\n` + (pageContent ? pageContent.markdown : "*Loading...*")}
      isLoading={isLoading}
      navigationTitle={" →  " + pageName}
      actions={
        page.url ? (
          <ActionPanel>
            <ActionPanel.Section title={page.title ? page.title : "Untitled"}>
              <ActionPanel.Item
                title="Open in Notion"
                icon={"notion-logo.png"}
                onAction={function () {
                  handleOnOpenPage(page);
                }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <CopyToClipboardAction
                title="Copy Page URL"
                content={page.url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <PasteAction
                title="Paste Page URL"
                content={page.url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
