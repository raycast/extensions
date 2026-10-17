import { Action, Keyboard } from "@raycast/api";
import { Article } from "./articles";
import { Strings } from "./strings";

type CopyableArticle = Pick<Article, "excerpt" | "title" | "url">;

export function ArticleCopyActions({ article, translations }: { article: CopyableArticle; translations: Strings }) {
  return (
    <>
      <Action.CopyToClipboard
        title={translations.copyArticleLink}
        content={article.url}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      <Action.CopyToClipboard
        title={translations.copyArticleMarkdownLink}
        content={`[${escapeMarkdownLinkText(article.title)}](${article.url})`}
      />
      <Action.CopyToClipboard
        title={translations.copyArticleTitleAndUrl}
        content={`${article.title}\n${article.url}`}
      />
      <Action.CopyToClipboard
        title={translations.copyArticleTitleSummaryAndUrl}
        content={[article.title, article.excerpt?.trim(), article.url].filter(Boolean).join("\n\n")}
      />
    </>
  );
}

function escapeMarkdownLinkText(value: string): string {
  return value.replace(/([\\[\]])/g, "\\$1");
}
