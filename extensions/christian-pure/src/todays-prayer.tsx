import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { APP_API, Article, Today, articleUrl, decodeEntities, prayerParagraphs, trackedLink } from "./api";

export default function Command() {
  const { data, isLoading, error } = useFetch<Today>(`${APP_API}/today`);
  const prayer = data?.prayer;
  const { data: article } = useFetch<Article>(articleUrl(prayer?.articleId), { execute: !!prayer?.articleId });

  if (error && !data) {
    return <Detail markdown={"Couldn't reach christianpure.com. Check your connection and try again."} />;
  }

  const link = article ? trackedLink(article.url) : undefined;
  const title = article ? decodeEntities(article.title) : undefined;
  const text = prayer ? prayerParagraphs(prayer.text) : "";

  const markdown = prayer
    ? [`## ${prayer.title}`, text, title && link ? `From [${title}](${link}) on Christian Pure.` : ""]
        .filter(Boolean)
        .join("\n\n")
    : "";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Today's Prayer"
      markdown={markdown}
      actions={
        prayer && (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Prayer" content={text} />
            <Action.Paste title="Paste Prayer" content={text} />
            {link && <Action.OpenInBrowser title="Read the Full Article" url={link} icon={Icon.Book} />}
          </ActionPanel>
        )
      }
    />
  );
}
