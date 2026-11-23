import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import {
  APP_API,
  Article,
  Today,
  articleUrl,
  decodeEntities,
  quoteMarkdown,
  shortTranslation,
  trackedLink,
  verseText,
} from "./api";

export default function Command() {
  const { data, isLoading, error } = useFetch<Today>(`${APP_API}/today`);
  const verse = data?.verse;
  const { data: article } = useFetch<Article>(articleUrl(verse?.articleId), { execute: !!verse?.articleId });

  if (error && !data) {
    return <Detail markdown={"Couldn't reach christianpure.com. Check your connection and try again."} />;
  }

  const link = article ? trackedLink(article.url) : undefined;
  const title = article ? decodeEntities(article.title) : undefined;
  const plain = verse ? verseText(verse.text, verse.ref, verse.translation) : "";

  const markdown = verse
    ? [
        `## ${verse.ref} (${shortTranslation(verse.translation)})`,
        quoteMarkdown(verse.text),
        verse.reflection ?? "",
        title && link ? `From [${title}](${link}) on Christian Pure.` : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    : "";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Today's Verse"
      markdown={markdown}
      actions={
        verse && (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Verse" content={plain} />
            <Action.Paste title="Paste Verse" content={plain} />
            {link && <Action.OpenInBrowser title="Read the Full Article" url={link} icon={Icon.Book} />}
            {link && <Action.CopyToClipboard title="Copy Verse with Link" content={`${plain}\n${link}`} />}
          </ActionPanel>
        )
      }
    />
  );
}
