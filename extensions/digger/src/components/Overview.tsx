import { Color, Icon, Image, List } from "@raycast/api";
import { getFavicon, getProgressIcon } from "@raycast/utils";
import { Actions } from "../actions";
import { DiggerResult } from "../types";
import { getDeniedAccessMessage } from "../utils/botDetection";
import { formatBytes, getStatusText } from "../utils/formatters";

interface OverviewProps {
  data: DiggerResult | null;
  onRefresh: () => void;
  overallProgress: number;
}

export function Overview({ data, onRefresh, overallProgress }: OverviewProps) {
  const isStillLoading = !data;

  // Never block the icon slot on a favicon.
  //
  // `getFavicon` asks a third-party service, and its default fallback is
  // Icon.Link — so the row sat on a chain glyph for as long as that lookup took,
  // which on a slow or icon-less host is until it gives up. Three changes:
  //
  //  1. Prefer the icon the PAGE declared. We already parsed it into
  //     resources.images and resolved it to an absolute URL, so there is no
  //     discovery step at all — Raycast just loads the image and swaps it in.
  //  2. Fall back to Icon.Globe rather than Icon.Link. A globe reads as "a
  //     website whose icon we don't have"; a chain reads as "a link", which is
  //     what every other row in this list already is.
  //  3. Only reach for a REMOTE icon when the host actually served us a page.
  //     `fallback` covers an image that fails to load; it does nothing for one
  //     that never resolves, and the slot renders EMPTY the whole time. On a
  //     host that answered 436 — or did not answer at all — its favicon is not
  //     going to load either, so pointing at it trades a globe for a blank.
  //
  // The fallback renders immediately and is replaced when the real icon
  // decodes, which is the lazy behaviour asked for.
  const servedAPage = !!data?.networking?.statusCode && data.networking.statusCode < 400;
  const declaredFavicon = data?.overview?.favicon;
  const siteIcon: Image.ImageLike | undefined = !data
    ? undefined
    : !servedAPage
      ? Icon.Globe
      : declaredFavicon
        ? { source: declaredFavicon, fallback: Icon.Globe }
        : getFavicon(data.url, { fallback: Icon.Globe });
  const progressIcon = isStillLoading ? getProgressIcon(overallProgress, Color.Blue) : (siteIcon ?? Icon.Globe);

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

  // Only 200 was marked before, so every other status — a 404, a redirect, or
  // digg.xyz answering 436 behind Cloudflare — rendered with no affordance at all
  // and read like a normal result sitting next to an empty page.
  const code = networking?.statusCode;
  const statusIcon =
    code === undefined
      ? undefined
      : code >= 200 && code < 300
        ? { source: Icon.Check, tintColor: Color.Green }
        : { source: Icon.ExclamationMark, tintColor: Color.Orange };

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
          <List.Item.Detail.Metadata.Label title="Status" text={statusText} icon={statusIcon} />
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
