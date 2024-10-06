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
      <Action.OpenInBrowser url={offer.url} title={`Open in Browser`} />
      <Action.OpenInBrowser url={media.jwUrl} title={`Open in JustWatch.com`} />
      <Action.CopyToClipboard
        shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
        content={offer.url}
        title={"Copy URL to Clipboard"}
      />
    </ActionPanel>
  );
};
