/* eslint-disable @raycast/prefer-title-case */
import { Action, ActionPanel } from "@raycast/api";
import type { JustWatchMedia, JustWatchMediaOffers } from "@/types";

type Props = {
  media: JustWatchMedia;
  offer: JustWatchMediaOffers;
};

export const Actions = ({ media, offer }: Props) => {
  return (
    <ActionPanel>
      <Action.OpenInBrowser icon={offer.icon} url={offer.url} title={`Open in Browser`} />
      <Action.OpenInBrowser icon="command-icon.png" url={media.jwUrl} title={`Open in JustWatch.com`} />
      <Action.OpenInBrowser
        icon="imdb.png"
        url={media.imdbUrl}
        title={`Open in IMDB`}
        shortcut={{ modifiers: ["cmd"], key: "i" }}
      />
      <Action.CopyToClipboard
        shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
        content={offer.url}
        title={"Copy URL to Clipboard"}
      />
    </ActionPanel>
  );
};
