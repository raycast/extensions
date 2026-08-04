import { Action, ActionPanel, Grid, Keyboard } from "@raycast/api";
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
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Copy 1x Emote"
              content={image1x}
              shortcut={Keyboard.Shortcut.Common.Save}
            />
            <Action.CopyToClipboard
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Copy 2x Emote"
              content={image2x}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "m" }, Windows: { modifiers: ["ctrl"], key: "m" } }}
            />
            <Action.CopyToClipboard
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Copy 3x Emote"
              content={image3x}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "l" }, Windows: { modifiers: ["ctrl"], key: "l" } }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={browserUrl} shortcut={Keyboard.Shortcut.Common.Open} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
