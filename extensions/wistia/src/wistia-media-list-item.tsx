import {
  copyTextToClipboard,
  showHUD,
  showToast,
  ActionPanel,
  CopyToClipboardAction,
  ImageMask,
  List,
  OpenInBrowserAction,
  ToastStyle,
} from "@raycast/api";

// Local imports
import { AccountInfo, WistiaMedia } from "./types";
import { fetchEmbedCode } from "./api";

interface WistiaMediaListItemProps {
  media: WistiaMedia;
  accountInfo: AccountInfo;
}

export function WistiaMediaListItem({ media, accountInfo }: WistiaMediaListItemProps) {
  return (
    <List.Item
      icon={{ source: media.thumbnail.url, mask: ImageMask.RoundedRectangle }}
      title={media.name}
      accessoryIcon={media.type === "Video" ? "video-16" : ""}
      accessoryTitle={friendlyDuration(media.duration)}
      keywords={[media.hashed_id]}
      key={media.id}
      actions={<WistiaMediaListItemActions media={media} accountUrl={accountInfo.url} />}
    />
  );
}

function WistiaMediaListItemActions({ media, accountUrl }: { media: WistiaMedia; accountUrl: string }) {
  return (
    <ActionPanel title={media.name}>
      <ActionPanel.Section>
        <OpenInBrowserAction url={`${accountUrl}/medias/${media.hashed_id}`} />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <CopyToClipboardAction title="Copy Share URL" content={`${accountUrl}/medias/${media.hashed_id}`} />
        <CopyToClipboardAction title="Copy HashedId" content={media.hashed_id} />
        <CopyEmbedCodeAction hashedId={media.hashed_id} accountUrl={accountUrl} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function CopyEmbedCodeAction({ hashedId, accountUrl }: { hashedId: string; accountUrl: string }) {
  async function copyEmbedCodeFor(hashedId: string) {
    if (accountUrl) {
      const embedCode = await fetchEmbedCode({ accountUrl: accountUrl, hashedId });
      await copyTextToClipboard(embedCode.html);
      await showHUD("Copied to Clipboard");
    } else {
      await showToast(ToastStyle.Failure, "Cannot copy embed code", "No account url found");
    }
  }

  return (
    <ActionPanel.Item title="Copy Embed Code" icon="doc-on-clipboard-16" onAction={() => copyEmbedCodeFor(hashedId)} />
  );
}

function friendlyDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secondsLeft = Math.round(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secondsLeft}s`;
  }

  return `${minutes}m ${secondsLeft}s`;
}
