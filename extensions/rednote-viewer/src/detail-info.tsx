import { Action, ActionPanel, Detail, Icon, Image } from "@raycast/api";
import client from "./client.js";
import { useTranslate } from "./hooks.js";
import Tag from "./tag.js";
import { DetailData } from "./types.js";
import { shouldTranslate } from "./utils.js";

export default function DetailInfo({ details }: { details: DetailData }) {
  const { data: translatedTitle, isLoading: isTitleLoading } = useTranslate(details.title);
  const { data: translatedDesc, isLoading: isDescLoading } = useTranslate(details.desc);
  const { data: translatedNickname, isLoading: isNicknameLoading } = useTranslate(details.user.nickname);

  const tags = [...new Set(details.tags)];
  const markdown = `${shouldTranslate ? translatedDesc : details.desc}\n\n${details.images.map((image) => `<img src="${image}" height="320"/>`).join("\n\n")}`;

  return (
    <Detail
      markdown={markdown.startsWith("#") ? `\\${markdown}` : markdown}
      isLoading={isDescLoading || isTitleLoading || isNicknameLoading}
      navigationTitle={translatedTitle || details.title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={translatedTitle || details.title} />
          <Detail.Metadata.TagList title="Tags">
            {tags.map((tag) => (
              <Tag key={tag} text={tag} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label
            title="Author"
            text={`${details.user.nickname}${shouldTranslate && translatedNickname ? ` (${translatedNickname})` : ""}`}
            icon={{
              source: details.user.avatar,
              mask: Image.Mask.Circle,
            }}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Source" target={details.originalUrl} text={details.originalUrl} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={details.originalUrl} />
          <Action icon={Icon.Download} title="Save to Downloads" onAction={() => client.saveToLocal(details)} />
        </ActionPanel>
      }
    ></Detail>
  );
}
