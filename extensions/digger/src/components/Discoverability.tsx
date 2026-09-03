import { Color, Icon, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { Actions, DiscoverabilityActions } from "../actions";
import { DiggerResult, ResourceStatus } from "../types";
import { truncateText } from "../utils/formatters";
import { getRootResourceUrl, resolveUrl } from "../utils/urlUtils";

interface DiscoverabilityProps {
  data: DiggerResult | null;
  onRefresh: () => void;
  progress: number;
}

export function Discoverability({ data, onRefresh, progress }: DiscoverabilityProps) {
  // Show progress icon until this section is complete
  const isLoading = progress < 1;

  if (!data) {
    return (
      <List.Item
        title="Discoverability"
        icon={isLoading ? getProgressIcon(progress, Color.Blue) : Icon.MagnifyingGlass}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Checking discoverability..." />
                <List.Item.Detail.Metadata.Label title="" text="Analyzing robots, canonical URLs, and sitemaps" />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    );
  }

  const { discoverability } = data;

  const hasRobots = !!discoverability?.robots;
  const robotsTxtStatus = discoverability?.robotsTxt;
  const hasCanonical = !!discoverability?.canonical;
  const hasSitemap = !!discoverability?.sitemap;
  const llmsTxtStatus = discoverability?.llmsTxt;
  const hasContentSignals = !!discoverability?.contentSignals;
  const hasAlternates = !!(discoverability?.alternates && discoverability.alternates.length > 0);
  const hasPaymentSignals = !!discoverability?.paymentSignals?.detected;
  const hasDiscoverability = hasCanonical || hasSitemap;

  // Resolve sitemap URL to absolute URL (handles relative URLs like /sitemap.xml)
  const sitemapUrl = discoverability?.sitemap ? resolveUrl(discoverability.sitemap, data.url) : undefined;

  // Construct robots.txt and llms.txt URLs from base URL
  const robotsUrl = getRootResourceUrl("robots.txt", data.url);
  const llmsTxtUrl = getRootResourceUrl("llms.txt", data.url);

  // Show progress icon while loading, then show magnifying glass icon
  const listIcon = isLoading ? getProgressIcon(progress, Color.Blue) : Icon.MagnifyingGlass;

  return (
    <List.Item
      title="Discoverability"
      icon={listIcon}
      accessories={hasDiscoverability ? [{ icon: { source: Icon.Check, tintColor: Color.Green } }] : undefined}
      detail={
        <DiscoverabilityDetail
          data={data}
          hasRobots={hasRobots}
          robotsTxtStatus={robotsTxtStatus}
          hasCanonical={hasCanonical}
          sitemapStatus={discoverability?.sitemapStatus}
          isLoading={isLoading}
          llmsTxtStatus={llmsTxtStatus}
          hasContentSignals={hasContentSignals}
          hasPaymentSignals={hasPaymentSignals}
          sitemapUrl={sitemapUrl}
          robotsUrl={robotsUrl}
          llmsTxtUrl={llmsTxtUrl}
          hasAlternates={hasAlternates}
        />
      }
      actions={
        <Actions
          data={data}
          url={data.url}
          onRefresh={onRefresh}
          sectionActions={
            <DiscoverabilityActions
              sitemapUrl={sitemapUrl}
              robotsUrl={robotsTxtStatus === "found" ? robotsUrl : undefined}
              llmsTxtUrl={llmsTxtStatus === "found" ? llmsTxtUrl : undefined}
            />
          }
        />
      }
    />
  );
}

interface DiscoverabilityDetailProps {
  data: DiggerResult;
  hasRobots: boolean;
  robotsTxtStatus: ResourceStatus | undefined;
  hasCanonical: boolean;
  sitemapStatus: ResourceStatus | undefined;
  isLoading: boolean;
  llmsTxtStatus: ResourceStatus | undefined;
  hasContentSignals: boolean;
  hasPaymentSignals: boolean;
  sitemapUrl: string | undefined;
  robotsUrl: string | undefined;
  llmsTxtUrl: string | undefined;
  hasAlternates: boolean;
}

function DiscoverabilityDetail({
  data,
  hasRobots,
  robotsTxtStatus,
  hasCanonical,
  sitemapStatus,
  isLoading,
  llmsTxtStatus,
  hasContentSignals,
  hasPaymentSignals,
  sitemapUrl,
  robotsUrl,
  llmsTxtUrl,
  hasAlternates,
}: DiscoverabilityDetailProps) {
  const { discoverability } = data;

  // "Not found" is a claim. Only make it when the server actually answered.
  const resourceRow = (title: string, status: ResourceStatus | undefined, href: string | undefined) => {
    if (status === "found" && href) {
      return <List.Item.Detail.Metadata.Link title={title} target={href} text="✔︎ Found" />;
    }
    // A status is undefined until Promise.allSettled resolves. Saying "Not found"
    // there restates the very assertion this row exists to avoid — the request
    // has not come back yet, so nothing about the file has been established.
    if (status === undefined && isLoading) {
      return <List.Item.Detail.Metadata.Label title={title} text="Checking…" icon={Icon.Clock} />;
    }
    if (status === "unavailable") {
      return (
        <List.Item.Detail.Metadata.Label
          title={title}
          text="Couldn't check"
          icon={{ source: Icon.QuestionMarkCircle, tintColor: Color.Orange }}
        />
      );
    }
    return (
      <List.Item.Detail.Metadata.Label
        title={title}
        text="Not found"
        icon={{ source: Icon.Xmark, tintColor: Color.Red }}
      />
    );
  };

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="SEO & Crawling" />
          {hasCanonical ? (
            <List.Item.Detail.Metadata.Link
              title="Canonical URL"
              target={discoverability!.canonical!}
              text={truncateText(discoverability!.canonical!, 50)}
            />
          ) : (
            <List.Item.Detail.Metadata.Label
              title="Canonical URL"
              text="Not specified"
              icon={{ source: Icon.Xmark, tintColor: Color.Red }}
            />
          )}
          <List.Item.Detail.Metadata.Label
            title="Robots Meta Tag"
            text={discoverability?.robots || "Not specified"}
            icon={
              hasRobots ? { source: Icon.Check, tintColor: Color.Green } : { source: Icon.Xmark, tintColor: Color.Red }
            }
          />
          {resourceRow("Sitemap", sitemapStatus, sitemapUrl)}
          {resourceRow("robots.txt", robotsTxtStatus, robotsUrl)}
          {resourceRow("LLMs.txt", llmsTxtStatus, llmsTxtUrl)}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Content Signals"
            icon={
              hasContentSignals
                ? { source: Icon.Check, tintColor: Color.Green }
                : { source: Icon.Xmark, tintColor: Color.Red }
            }
          />
          {hasContentSignals ? (
            <>
              {discoverability!.contentSignals!.search !== undefined && (
                <List.Item.Detail.Metadata.Label
                  title="search"
                  text={discoverability!.contentSignals!.search}
                  icon={
                    discoverability!.contentSignals!.search === "yes"
                      ? { source: Icon.Check, tintColor: Color.Green }
                      : { source: Icon.Xmark, tintColor: Color.Red }
                  }
                />
              )}
              {discoverability!.contentSignals!.aiInput !== undefined && (
                <List.Item.Detail.Metadata.Label
                  title="ai-input"
                  text={discoverability!.contentSignals!.aiInput}
                  icon={
                    discoverability!.contentSignals!.aiInput === "yes"
                      ? { source: Icon.Check, tintColor: Color.Green }
                      : { source: Icon.Xmark, tintColor: Color.Red }
                  }
                />
              )}
              {discoverability!.contentSignals!.aiTrain !== undefined && (
                <List.Item.Detail.Metadata.Label
                  title="ai-train"
                  text={discoverability!.contentSignals!.aiTrain}
                  icon={
                    discoverability!.contentSignals!.aiTrain === "yes"
                      ? { source: Icon.Check, tintColor: Color.Green }
                      : { source: Icon.Xmark, tintColor: Color.Red }
                  }
                />
              )}
            </>
          ) : (
            <List.Item.Detail.Metadata.Label title="" text="No content signals found" />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Payment Required"
            icon={
              hasPaymentSignals
                ? { source: Icon.CreditCard, tintColor: Color.Yellow }
                : { source: Icon.Xmark, tintColor: Color.SecondaryText }
            }
          />
          {hasPaymentSignals ? (
            <>
              {discoverability!.paymentSignals!.statusCode402 && (
                <List.Item.Detail.Metadata.Label
                  title="HTTP Status"
                  text="402 Payment Required"
                  icon={{ source: Icon.ExclamationMark, tintColor: Color.Yellow }}
                />
              )}
              {discoverability!.paymentSignals!.paymentRequired && (
                <List.Item.Detail.Metadata.Label
                  title="PAYMENT-REQUIRED"
                  text={truncateText(discoverability!.paymentSignals!.paymentRequiredRaw ?? "Present", 50)}
                  icon={{ source: Icon.Check, tintColor: Color.Green }}
                />
              )}
              {discoverability!.paymentSignals!.paymentResponse && (
                <List.Item.Detail.Metadata.Label
                  title="PAYMENT-RESPONSE"
                  text={truncateText(discoverability!.paymentSignals!.paymentResponseRaw ?? "Present", 50)}
                  icon={{ source: Icon.Check, tintColor: Color.Green }}
                />
              )}
            </>
          ) : (
            <List.Item.Detail.Metadata.Label title="" text="No payment signals detected" />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Language Alternates"
            icon={
              hasAlternates
                ? { source: Icon.Check, tintColor: Color.Green }
                : { source: Icon.Xmark, tintColor: Color.Red }
            }
          />
          {hasAlternates &&
            discoverability!
              .alternates!.slice(0, 5)
              .map((alt, index) => (
                <List.Item.Detail.Metadata.Link
                  key={index}
                  title={alt.hreflang || "Alternate"}
                  target={alt.href}
                  text={truncateText(alt.href, 50)}
                />
              ))}
          {hasAlternates && discoverability!.alternates!.length > 5 && (
            <List.Item.Detail.Metadata.Label title="" text={`...and ${discoverability!.alternates!.length - 5} more`} />
          )}
          {!hasAlternates && <List.Item.Detail.Metadata.Label title="" text="No language alternates found" />}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
