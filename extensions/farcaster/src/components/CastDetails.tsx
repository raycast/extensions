import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { Cast } from "../utils/types";
import { getUserIcon, getCastUrl } from "../utils/helpers";

export default function CastDetails({ cast }: { cast: Cast }) {
  const hasFrame = cast.frames && cast.frames[0]?.image;
  const imageEmbeds = cast.embeds.filter(
    (embed): embed is { url: string } => "url" in embed && embed.url.startsWith("https://i.imgur.com/"),
  );
  const raycastWidth = imageEmbeds.length === 1 ? 300 : 180;
  const imagesPerRow = imageEmbeds.length === 1 ? 1 : 2;

  const image = imageEmbeds
    .map((embed, index) => {
      const separator = index % imagesPerRow === imagesPerRow - 1 ? "\n\n" : " ";
      return `![image](${embed.url}?raycast-width=${raycastWidth})${separator}`;
    })
    .join("");

  const frame = hasFrame ? `![image](${cast.frames[0]?.image})` : "";
  {
    /* support for cast embeds */
  }
  const markdown = `
  ${cast.text}
  ${image}
  ${frame}
  `;

  return (
    <Detail
      markdown={markdown}
      metadata={<CastMetadata cast={cast} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="View Cast in Browser"
            shortcut={{ modifiers: ["ctrl"], key: "enter" }}
            url={getCastUrl(cast)}
          />
        </ActionPanel>
      }
    />
  );
}

function CastMetadata({ cast }: { cast: Cast }) {
  const hasFrame = cast.frames && cast.frames[0]?.image;
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Replies" text={cast.replies.count.toString()} icon={Icon.Message} />
      <Detail.Metadata.Label title="Recasts" text={cast.reactions.recasts.length.toString()} icon={Icon.Repeat} />
      <Detail.Metadata.Label title="Likes" text={cast.reactions.likes.length.toString()} icon={Icon.Heart} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Author" text={cast.author.username} icon={getUserIcon(cast.author)} />
      <Detail.Metadata.Label title="FID" text={cast.author.fid.toString()} />

      {hasFrame && <Detail.Metadata.Link title="" target={getCastUrl(cast)} text="Frame" />}
    </Detail.Metadata>
  );
}
