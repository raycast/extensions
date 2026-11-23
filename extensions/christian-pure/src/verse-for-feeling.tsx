import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import {
  APP_API,
  Article,
  Feeling,
  FeelingVerse,
  articleUrl,
  decodeEntities,
  quoteMarkdown,
  shortTranslation,
  trackedLink,
  verseText,
} from "./api";

export default function Command() {
  const [feeling, setFeeling] = useState<string>("anxious");
  const [selected, setSelected] = useState<string | null>(null);
  const { data: feelings } = useFetch<{ feelings: Feeling[] }>(`${APP_API}/feelings`);
  const { data, isLoading, error } = useFetch<{ verses: FeelingVerse[]; translation: string }>(`${APP_API}/verses`);

  const verses = (data?.verses ?? []).filter((v) => v.feeling === feeling);
  const current = verses.find((v) => v.id === selected) ?? verses[0];
  const { data: article } = useFetch<Article>(articleUrl(current?.articleId), { execute: !!current?.articleId });
  const translation = data?.translation ?? "Berean Standard Bible";
  const label = feelings?.feelings.find((f) => f.key === feeling)?.label.toLowerCase() ?? feeling;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={verses.length > 0}
      navigationTitle="Verse for How You Feel"
      searchBarPlaceholder={`Search verses for when you feel ${label}`}
      onSelectionChange={setSelected}
      searchBarAccessory={
        <List.Dropdown tooltip="I feel…" value={feeling} onChange={setFeeling}>
          {(feelings?.feelings ?? []).map((f) => (
            <List.Dropdown.Item key={f.key} title={f.label} value={f.key} />
          ))}
        </List.Dropdown>
      }
    >
      {error && !data ? (
        <List.EmptyView
          icon={Icon.WifiDisabled}
          title="Couldn't reach christianpure.com"
          description="Check your connection and try again."
        />
      ) : (
        verses.map((v) => {
          const plain = verseText(v.text, v.ref, translation);
          const isCurrent = current?.id === v.id;
          const link = isCurrent && article ? trackedLink(article.url) : undefined;
          const title = isCurrent && article ? decodeEntities(article.title) : undefined;
          return (
            <List.Item
              key={v.id}
              id={v.id}
              title={v.ref}
              keywords={v.text.split(/\W+/).filter((w) => w.length > 3)}
              detail={
                <List.Item.Detail
                  markdown={[
                    `## ${v.ref} (${shortTranslation(translation)})`,
                    quoteMarkdown(v.text),
                    title && link ? `From [${title}](${link}) on Christian Pure.` : "",
                  ]
                    .filter(Boolean)
                    .join("\n\n")}
                />
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Verse" content={plain} />
                  <Action.Paste title="Paste Verse" content={plain} />
                  {link && <Action.OpenInBrowser title="Read the Full Article" url={link} icon={Icon.Book} />}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
