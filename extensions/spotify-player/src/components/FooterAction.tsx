import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
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
        shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
        content={{
          html: `<a href="${url}" title="${title}">${title}</a>`,
          text: url,
        }}
      />
      <Action.CopyToClipboard
        icon={Icon.CopyClipboard}
        title="Copy Artist and Title"
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "t" },
          Windows: { modifiers: ["ctrl", "shift"], key: "t" },
        }}
        content={title}
      />
      {isSpotifyInstalled ? (
        <Action.Open
          icon="spotify-icon.svg"
          title="Open on Spotify"
          shortcut={Keyboard.Shortcut.Common.Open}
          target={uri || "spotify"}
        />
      ) : (
        <Action.OpenInBrowser
          title="Open on Spotify Web"
          shortcut={Keyboard.Shortcut.Common.Open}
          url={url || "https://play.spotify.com"}
        />
      )}
    </ActionPanel.Section>
  );
}
