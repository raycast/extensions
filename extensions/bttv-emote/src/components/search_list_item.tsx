import { Action, ActionPanel, Grid } from "@raycast/api";
import { Emote } from "./emote";

export function SearchGridItem({ searchResult }: { searchResult: Emote }) {
  const imageBaseURL = "https://cdn.betterttv.net/emote/";
  const browserBaseURL = "https://betterttv.com/emotes/";

  const image1x = imageBaseURL + searchResult.id + "/1x." + searchResult.imageType;
  const image2x = imageBaseURL + searchResult.id + "/2x." + searchResult.imageType;
  const image3x = imageBaseURL + searchResult.id + "/3x." + searchResult.imageType;

  const browserUrl = browserBaseURL + searchResult.id;

  return (
    <Grid.Item
      title={searchResult.code}
      content={image3x}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Emote" content={image2x} />
            <Action.Paste title="Paste Emote" content={image2x} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy 1x Emote"
              content={image1x}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
            <Action.CopyToClipboard
              title="Copy 2x Emote"
              content={image2x}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            />
            <Action.CopyToClipboard
              title="Copy 3x Emote"
              content={image3x}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={browserUrl} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
