import { List, Icon, Color } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { DiggerResult } from "../types";
import { Actions } from "../actions";
import { truncateText } from "../utils/formatters";
import { isUrl, resolveUrl } from "../utils/urlUtils";
import { getDeniedAccessMessage } from "../utils/botDetection";

interface MetadataSemanticsProps {
  data: DiggerResult | null;
  onRefresh: () => void;
  progress: number;
}

export function MetadataSemantics({ data, onRefresh, progress }: MetadataSemanticsProps) {
  // Show progress icon until this section is complete
  const isLoading = progress < 1;

  if (!data) {
    return (
      <List.Item
        title="Metadata"
        icon={isLoading ? getProgressIcon(progress, Color.Blue) : Icon.Document}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Analyzing metadata..." />
                <List.Item.Detail.Metadata.Label title="" text="Parsing Open Graph, Twitter Cards, and JSON-LD" />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    );
  }

  const { overview, metadata, botProtection } = data;
  const isChallengePage = botProtection?.isChallengePage ?? false;

  const hasOpenGraph = !!(metadata?.openGraph && Object.keys(metadata.openGraph).length > 0);
  const hasTwitterCard = !!(metadata?.twitterCard && Object.keys(metadata.twitterCard).length > 0);
  const hasMetadata = hasOpenGraph || hasTwitterCard || !!overview?.title;

  // Show progress icon while loading, then show document icon (not check/x)
  const listIcon = isLoading ? getProgressIcon(progress, Color.Blue) : Icon.Document;

  return (
    <List.Item
      title="Metadata"
      icon={listIcon}
      accessories={
        isChallengePage
          ? [{ icon: { source: Icon.ExclamationMark, tintColor: Color.Orange } }]
          : hasMetadata
            ? [{ icon: { source: Icon.Check, tintColor: Color.Green } }]
            : undefined
      }
      detail={
        <MetadataSemanticsDetail
          data={data}
          hasOpenGraph={hasOpenGraph}
          hasTwitterCard={hasTwitterCard}
          isChallengePage={isChallengePage}
        />
      }
      actions={<Actions data={data} url={data.url} onRefresh={onRefresh} />}
    />
  );
}

interface MetadataSemanticsDetailProps {
  data: DiggerResult;
  hasOpenGraph: boolean;
  hasTwitterCard: boolean;
  isChallengePage: boolean;
}

function MetadataSemanticsDetail({
  data,
  hasOpenGraph,
  hasTwitterCard,
  isChallengePage,
}: MetadataSemanticsDetailProps) {
  const { overview, metadata, discoverability, url, botProtection } = data;
  const deniedMessage = getDeniedAccessMessage(botProtection?.provider);

  const isImageField = (key: string) => key.toLowerCase().includes("image");

  const renderMetadataItem = (key: string, value: string) => {
    const displayTitle = key.replace(/^(og:|twitter:)/, "");

    if (isImageField(key)) {
      const absoluteUrl = resolveUrl(value, url);
      return (
        <List.Item.Detail.Metadata.Link
          key={key}
          title={displayTitle}
          target={absoluteUrl}
          text={truncateText(value, 60)}
        />
      );
    }
    return isUrl(value) ? (
      <List.Item.Detail.Metadata.Link key={key} title={displayTitle} target={value} text={truncateText(value, 60)} />
    ) : (
      <List.Item.Detail.Metadata.Label key={key} title={displayTitle} text={truncateText(value, 60)} />
    );
  };

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Basic Metadata" />
          <List.Item.Detail.Metadata.Label
            title="Title"
            text={isChallengePage ? deniedMessage : overview?.title || "N/A"}
            icon={
              isChallengePage
                ? { source: Icon.ExclamationMark, tintColor: Color.Orange }
                : overview?.title
                  ? { source: Icon.Check, tintColor: Color.Green }
                  : { source: Icon.Xmark, tintColor: Color.Red }
            }
          />
          <List.Item.Detail.Metadata.Label
            title="Description"
            text={
              isChallengePage ? deniedMessage : overview?.description ? truncateText(overview.description, 80) : "N/A"
            }
            icon={
              isChallengePage
                ? { source: Icon.ExclamationMark, tintColor: Color.Orange }
                : overview?.description
                  ? { source: Icon.Check, tintColor: Color.Green }
                  : { source: Icon.Xmark, tintColor: Color.Red }
            }
          />
          {discoverability?.canonical ? (
            <List.Item.Detail.Metadata.Link
              title="Canonical URL"
              target={discoverability.canonical}
              text={truncateText(discoverability.canonical, 60)}
            />
          ) : (
            <List.Item.Detail.Metadata.Label
              title="Canonical URL"
              text="N/A"
              icon={{ source: Icon.Xmark, tintColor: Color.Red }}
            />
          )}
          <List.Item.Detail.Metadata.Label
            title="Language"
            text={overview?.language || "N/A"}
            icon={
              overview?.language
                ? { source: Icon.Check, tintColor: Color.Green }
                : { source: Icon.Xmark, tintColor: Color.Red }
            }
          />

          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Open Graph"
            icon={
              isChallengePage
                ? { source: Icon.ExclamationMark, tintColor: Color.Orange }
                : hasOpenGraph
                  ? { source: Icon.Check, tintColor: Color.Green }
                  : { source: Icon.Xmark, tintColor: Color.Red }
            }
          />
          {hasOpenGraph &&
            Object.entries(metadata!.openGraph!)
              .slice(0, 6)
              .map(([key, value]) => renderMetadataItem(key, value))}
          {!hasOpenGraph && (
            <List.Item.Detail.Metadata.Label
              title=""
              text={isChallengePage ? deniedMessage : "No Open Graph tags found"}
            />
          )}

          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Twitter Card"
            icon={
              isChallengePage
                ? { source: Icon.ExclamationMark, tintColor: Color.Orange }
                : hasTwitterCard
                  ? { source: Icon.Check, tintColor: Color.Green }
                  : { source: Icon.Xmark, tintColor: Color.Red }
            }
          />
          {hasTwitterCard &&
            Object.entries(metadata!.twitterCard!)
              .slice(0, 6)
              .map(([key, value]) => renderMetadataItem(key, value))}
          {!hasTwitterCard && (
            <List.Item.Detail.Metadata.Label
              title=""
              text={isChallengePage ? deniedMessage : "No Twitter Card tags found"}
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
