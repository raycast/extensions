import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useMemo, useState } from "react";
import { StoreExtension } from "../lib/catalog";
import { useTranslations } from "../lib/translate";
import { LinkActions, OpenInStoreActions } from "./extension-actions";
import { BuildExtension } from "./build-extension";

function formatDate(seconds: number) {
  return new Date(seconds * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function ExtensionDetail(props: {
  item: StoreExtension;
  lang: string;
  installed: boolean;
  reason?: string;
  query?: string;
}) {
  const { item, lang, installed, reason, query } = props;
  const [showOriginal, setShowOriginal] = useState(false);

  const texts = useMemo(
    () => [
      { key: "description", text: item.description },
      ...item.commands.map((c) => ({ key: `command:${c.name}`, text: c.description })),
    ],
    [item],
  );
  const { translations, isTranslating } = useTranslations(texts, lang);
  const t = (key: string, original: string) => (showOriginal ? original : (translations[key] ?? original));

  const icon = item.icon ? `![](${item.icon}?raycast-width=64&raycast-height=64)\n\n` : "";
  const markdown = [
    `${icon}# ${item.title}`,
    reason ? `> ${reason}` : "",
    t("description", item.description),
    item.commands.length ? "## Commands" : "",
    item.commands
      .map((c) => `- **${c.title}**${c.description ? ` — ${t(`command:${c.name}`, c.description)}` : ""}`)
      .join("\n"),
    item.screenshots.length ? "## Screenshots" : "",
    item.screenshots.map((url) => `![${item.title}](${url})`).join("\n\n"),
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <Detail
      navigationTitle={item.title}
      isLoading={isTranslating}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Author"
            text={item.authorName}
            icon={item.authorAvatar ? { source: item.authorAvatar } : Icon.Person}
          />
          <Detail.Metadata.Label title="Downloads" text={item.downloads.toLocaleString("en-US")} icon={Icon.Download} />
          {installed && <Detail.Metadata.Label title="Status" text="Installed" icon={Icon.CheckCircle} />}
          {item.categories.length > 0 && (
            <Detail.Metadata.TagList title="Categories">
              {item.categories.map((category) => (
                <Detail.Metadata.TagList.Item key={category} text={category} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {item.platforms.length > 0 && (
            <Detail.Metadata.TagList title="Platforms">
              {item.platforms.map((platform) => (
                <Detail.Metadata.TagList.Item key={platform} text={platform} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {(item.toolCount > 0 || item.hasMcp) && (
            <Detail.Metadata.Label
              title="AI"
              text={[item.toolCount > 0 ? `${item.toolCount} AI tools` : "", item.hasMcp ? "MCP" : ""]
                .filter(Boolean)
                .join(" · ")}
              icon={Icon.Stars}
            />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Updated" text={formatDate(item.updatedAt)} />
          <Detail.Metadata.Label title="Published" text={formatDate(item.createdAt)} />
          <Detail.Metadata.Link title="Store" text="raycast.com" target={item.storeUrl} />
          {item.sourceUrl && <Detail.Metadata.Link title="Source" text="GitHub" target={item.sourceUrl} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <OpenInStoreActions item={item} />
          {lang !== "en" && (
            <Action
              title={showOriginal ? "Show Translation" : "Show Original Text"}
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={() => setShowOriginal((value) => !value)}
            />
          )}
          <Action.Push
            title="Build a Better Version with AI"
            icon={Icon.Hammer}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
            target={<BuildExtension query={query || item.title} lang={lang} closest={[item]} />}
          />
          <LinkActions item={item} />
        </ActionPanel>
      }
    />
  );
}
