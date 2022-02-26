import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction, PasteAction } from "@raycast/api";
import { Emote } from "./emote";

export function SearchListItem({ searchResult }: { searchResult: Emote }) {
  const imageBaseURL = "https://cdn.betterttv.net/emote/";
  const browserBaseURL = "https://betterttv.com/emotes/";

  const listImage = imageBaseURL + searchResult.id + "/1x.png";
  const image1x = imageBaseURL + searchResult.id + "/1x." + searchResult.imageType;
  const image2x = imageBaseURL + searchResult.id + "/2x." + searchResult.imageType;
  const image3x = imageBaseURL + searchResult.id + "/3x." + searchResult.imageType;

  const browserUrl = browserBaseURL + searchResult.id;

  return (
    <List.Item
      title={searchResult.code}
      icon={listImage}
      subtitle={searchResult.imageType}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <CopyToClipboardAction title="Copy Emote" content={image2x} />
            <PasteAction title="Paste Emote" content={image2x} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CopyToClipboardAction
              title="Copy 1x Emote"
              content={image1x}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
            <CopyToClipboardAction
              title="Copy 2x Emote"
              content={image2x}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            />
            <CopyToClipboardAction
              title="Copy 3x Emote"
              content={image3x}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <OpenInBrowserAction url={browserUrl} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
