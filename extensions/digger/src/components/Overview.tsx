import { List, Icon, Color } from "@raycast/api";
import { getFavicon, getProgressIcon } from "@raycast/utils";
import { DiggerResult } from "../types";
import { Actions } from "../actions";
import { formatBytes, getStatusText } from "../utils/formatters";
import { getDeniedAccessMessage } from "../utils/botDetection";

interface OverviewProps {
  data: DiggerResult | null;
  onRefresh: () => void;
  overallProgress: number;
}

export function Overview({ data, onRefresh, overallProgress }: OverviewProps) {
  // Show favicon once data is available, otherwise show progress
  const isStillLoading = !data;
  const favicon = data?.url ? getFavicon(data.url) : null;
  const progressIcon = isStillLoading ? getProgressIcon(overallProgress, Color.Blue) : (favicon ?? Icon.Globe);

  if (!data) {
    return (
      <List.Item
        title="Overview"
        icon={progressIcon}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Loading site data..." />
                <List.Item.Detail.Metadata.Label
                  title=""
                  text="Fetching HTML, parsing metadata, and analyzing content"
                />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    );
  }

  const { networking } = data;

  const statusCode = networking?.statusCode;
  const statusText = statusCode ? `${statusCode} ${getStatusText(statusCode)}` : "Unknown";
  const contentType = networking?.headers?.["content-type"] || "Unknown";
  const contentLength = networking?.headers?.["content-length"]
    ? formatBytes(parseInt(networking.headers["content-length"]))
    : "Unknown";
  const finalUrl = networking?.finalUrl || data.url;

  return (
    <List.Item
      title="Overview"
      icon={progressIcon}
      detail={
        <OverviewDetail
          data={data}
          statusText={statusText}
          contentType={contentType}
          contentLength={contentLength}
          finalUrl={finalUrl}
        />
      }
      actions={<Actions data={data} url={data.url} onRefresh={onRefresh} />}
    />
  );
}

interface OverviewDetailProps {
  data: DiggerResult;
  statusText: string;
  contentType: string;
  contentLength: string;
  finalUrl: string;
}

function OverviewDetail({ data, statusText, contentType, contentLength, finalUrl }: OverviewDetailProps) {
  const { overview, networking, performance, botProtection, resources, metadata } = data;
  const isChallengePage = botProtection?.isChallengePage ?? false;

  // Get clean title/description from structured sources (OG → Twitter → JSON-LD → meta tags)
  const ogTitle = metadata?.openGraph?.["og:title"];
  const ogDescription = metadata?.openGraph?.["og:description"];
  const twitterTitle = metadata?.twitterCard?.["twitter:title"];
  const twitterDescription = metadata?.twitterCard?.["twitter:description"];

  // JSON-LD often has name/description at top level
  const jsonLdItem = metadata?.jsonLd?.[0];
  const jsonLdTitle = jsonLdItem?.name as string | undefined;
  const jsonLdDescription = jsonLdItem?.description as string | undefined;

  // Cascade: OG → Twitter → JSON-LD → meta tags
  const fallbackTitle = overview?.title || "Untitled";
  const cleanTitle = isChallengePage
    ? getDeniedAccessMessage(botProtection?.provider)
    : ogTitle || twitterTitle || jsonLdTitle || fallbackTitle;
  const cleanDescription = ogDescription || twitterDescription || jsonLdDescription || overview?.description;

  // Only show description if it's meaningfully different from title
  const showDescription = cleanDescription && cleanDescription !== cleanTitle;

  // Find the best representative image (prioritize og:image, then twitter:image)
  const representativeImage =
    resources?.images?.find((img) => img.type === "og") ??
    resources?.images?.find((img) => img.type === "twitter") ??
    resources?.images?.find((img) => img.type === "json-ld");

  // Build markdown with image if available
  const markdown = representativeImage
    ? `![${representativeImage.alt || "Preview"}](${representativeImage.src})`
    : undefined;

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title={cleanTitle} />
          {showDescription && <List.Item.Detail.Metadata.Label title="" text={cleanDescription} />}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Response Details" />
          <List.Item.Detail.Metadata.Label
            title="Status"
            text={statusText}
            icon={networking?.statusCode === 200 ? { source: Icon.Check, tintColor: Color.Green } : undefined}
          />
          <List.Item.Detail.Metadata.Link title="Final URL" target={finalUrl} text={finalUrl} />
          <List.Item.Detail.Metadata.Label
            title="Response Time"
            text={performance?.loadTime ? `${Math.round(performance.loadTime)}ms` : "N/A"}
          />
          <List.Item.Detail.Metadata.Label title="Content-Type" text={contentType} />
          <List.Item.Detail.Metadata.Label title="Content-Length" text={contentLength} />
          <List.Item.Detail.Metadata.Label title="Server" text={networking?.server || "Unknown"} />
          {overview?.language && <List.Item.Detail.Metadata.Label title="Language" text={overview.language} />}
          {overview?.charset && <List.Item.Detail.Metadata.Label title="Charset" text={overview.charset} />}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
