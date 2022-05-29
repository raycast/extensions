import { ActionPanel, Detail, Action, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { useSetAtom } from "jotai";
import { fetchPageContent } from "../utils/notion";
import { Page, PageContent } from "../utils/types";
import { recentlyOpenedPagesAtom } from "../utils/state";
import { handleOnOpenPage } from "../utils/openPage";
import { AppendToPageForm } from "./forms";

export function PageDetail(props: { page: Page }): JSX.Element {
  const { page } = props;
  const pageName = (page.icon_emoji ? page.icon_emoji + " " : "") + (page.title ? page.title : "Untitled");

  const [pageContent, setPageContent] = useState<PageContent>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const storeRecentlyOpenedPage = useSetAtom(recentlyOpenedPagesAtom);

  useEffect(() => {
    storeRecentlyOpenedPage(page);
  }, [page.id]);

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
              <Action
                title="Open in Notion"
                icon={"notion-logo.png"}
                onAction={() => {
                  handleOnOpenPage(page, storeRecentlyOpenedPage);
                }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.Push
                title="Append Content to Page"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                target={
                  <AppendToPageForm
                    page={page}
                    onContentUpdate={(markdown) =>
                      setPageContent((prev) => ({ ...prev, markdown: (prev?.markdown || "") + markdown }))
                    }
                  />
                }
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.CopyToClipboard
                title="Copy Page URL"
                content={page.url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.Paste
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
