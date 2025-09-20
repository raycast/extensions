import { showHUD, showToast, ActionPanel, List, Action, Clipboard, Image, Toast, Icon, Color } from "@raycast/api";

// Local imports
import { AccountInfo, MediaStatus, MediaType, WistiaMedia } from "./types";
import { fetchEmbedCode } from "./api";

interface WistiaMediaListItemProps {
  media: WistiaMedia;
  accountInfo: AccountInfo;
}

export function WistiaMediaListItem({ media, accountInfo }: WistiaMediaListItemProps) {
  return (
    <List.Item
      icon={{ source: media.thumbnail.url, mask: Image.Mask.RoundedRectangle }}
      title={media.name}
      keywords={[media.hashed_id]}
      key={media.id}
      actions={<WistiaMediaListItemActions media={media} accountUrl={accountInfo.url} />}
      accessories={[
        {
          icon: getIcon(media.type),
          text: media.duration ? friendlyDuration(media.duration) : undefined,
        },
        {
          tag: { value: media.status, color: getStatusColor(media.status) },
        },
      ]}
    />
  );
}

function WistiaMediaListItemActions({ media, accountUrl }: { media: WistiaMedia; accountUrl: string }) {
  return (
    <ActionPanel title={media.name}>
      <ActionPanel.Section>
        <Action.OpenInBrowser url={`${accountUrl}/medias/${media.hashed_id}`} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Share URL" content={`${accountUrl}/medias/${media.hashed_id}`} />
        {/* eslint-disable-next-line @raycast/prefer-title-case */}
        <Action.CopyToClipboard title="Copy Hashed ID" content={media.hashed_id} />
        <CopyEmbedCodeAction hashedId={media.hashed_id} accountUrl={accountUrl} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function CopyEmbedCodeAction({ hashedId, accountUrl }: { hashedId: string; accountUrl: string }) {
  async function copyEmbedCodeFor(hashedId: string) {
    if (accountUrl) {
      const embedCode = await fetchEmbedCode({ accountUrl: accountUrl, hashedId });
      await Clipboard.copy(embedCode.html);
      await showHUD("Copied to Clipboard");
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot copy embed code",
        message: "No account url found",
      });
    }
  }

  return <Action title="Copy Embed Code" icon="doc-on-clipboard-16" onAction={() => copyEmbedCodeFor(hashedId)} />;
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

function getIcon(type: MediaType) {
  switch (type) {
    case MediaType.Video:
      return Icon.Video;
    case MediaType.Image:
      return Icon.Image;
    case MediaType.MicrosoftOfficeDocument:
    case MediaType.PdfDocument:
      return Icon.Document;
    case MediaType.Audio:
      return Icon.Speaker;
    default:
      Icon.QuestionMark;
  }
}

function getStatusColor(status: MediaStatus) {
  switch (status) {
    case MediaStatus.ready:
      return Color.Green;
    case MediaStatus.failed:
      return Color.Red;
    case MediaStatus.processing:
      return Color.Blue;
    default:
      return undefined;
  }
}
