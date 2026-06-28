import { Action, ActionPanel, Icon } from "@raycast/api";
import CreateArticle from "../create-article";
import { Article } from "../types/readingList";
import { ReadingListDetail } from "./reading-list-detail";

export function ReadingListItemAction({ article, bodyMarkdown }: { article: Article; bodyMarkdown: string }) {
  const { url } = article;
  return (
    <>
      <ActionPanel.Section title={"Article Actions"}>
        <Action.OpenInBrowser
          title={"Open in Browser"}
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          url={url}
        />
        <Action.Push
          title={"Show Details"}
          icon={Icon.QuoteBlock}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          target={<ReadingListDetail bodyMarkdown={bodyMarkdown} />}
        />
        <Action.CopyToClipboard
          title={"Copy Link"}
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          content={url}
        />
        <Action.Push
          title={"Create Article"}
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={<CreateArticle article={undefined} />}
        />
      </ActionPanel.Section>
    </>
  );
}
