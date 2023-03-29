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
        content={{
          html: `<a href="${url}" title="${title}">${title}</a>`,
          text: url,
        }}
      />
      {isSpotifyInstalled ? (
        <Action.Open icon="spotify-icon.svg" title="Open on Spotify" target={uri || "spotify"} />
      ) : (
        <Action.OpenInBrowser title="Open on Spotify Web" url={url || "https://play.spotify.com"} />
      )}
    </ActionPanel.Section>
  );
}
