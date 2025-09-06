import { Action, ActionPanel, Icon } from "@raycast/api";
import { isSpotifyInstalled } from "../helpers/isSpotifyInstalled";

type FooterActionProps = {
  url?: string;
  uri?: string;
  title: string;
};

export function FooterAction({ url, uri, title }: FooterActionProps) {
  return (
    <ActionPanel.Section>
      <Action.CopyToClipboard
        icon={Icon.Link}
        title="Copy URL"
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        content={{
          html: `<a href="${url}" title="${title}">${title}</a>`,
          text: url,
        }}
      />
      <Action.CopyToClipboard
        icon={Icon.CopyClipboard}
        title="Copy Artist and Title"
        shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
        content={title}
      />
      {isSpotifyInstalled ? (
        <Action.Open
          icon="spotify-icon.svg"
          title="Open on Spotify"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          target={uri || "spotify"}
        />
      ) : (
        <Action.OpenInBrowser
          title="Open on Spotify Web"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          url={url || "https://play.spotify.com"}
        />
      )}
    </ActionPanel.Section>
  );
}
