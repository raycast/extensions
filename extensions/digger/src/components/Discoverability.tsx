import { List, Icon, Color } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { DiggerResult } from "../types";
import { Actions, DiscoverabilityActions } from "../actions";
import { truncateText } from "../utils/formatters";
import { resolveUrl, getRootResourceUrl } from "../utils/urlUtils";

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
  const hasRobotsTxt = !!discoverability?.robotsTxt;
  const hasCanonical = !!discoverability?.canonical;
  const hasSitemap = !!discoverability?.sitemap;
  const hasLlmsTxt = !!discoverability?.llmsTxt;
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
          hasRobotsTxt={hasRobotsTxt}
          hasCanonical={hasCanonical}
          hasSitemap={hasSitemap}
          hasLlmsTxt={hasLlmsTxt}
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
              robotsUrl={hasRobotsTxt ? robotsUrl : undefined}
              llmsTxtUrl={hasLlmsTxt ? llmsTxtUrl : undefined}
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
  hasRobotsTxt: boolean;
  hasCanonical: boolean;
  hasSitemap: boolean;
  hasLlmsTxt: boolean;
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
  hasRobotsTxt,
  hasCanonical,
  hasSitemap,
  hasLlmsTxt,
  hasContentSignals,
  hasPaymentSignals,
  sitemapUrl,
  robotsUrl,
  llmsTxtUrl,
  hasAlternates,
}: DiscoverabilityDetailProps) {
  const { discoverability } = data;

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
          {hasSitemap && sitemapUrl ? (
            <List.Item.Detail.Metadata.Link title="Sitemap" target={sitemapUrl} text="✔︎ Found" />
          ) : (
            <List.Item.Detail.Metadata.Label
              title="Sitemap"
              text="Not found"
              icon={{ source: Icon.Xmark, tintColor: Color.Red }}
            />
          )}
          {hasRobotsTxt && robotsUrl ? (
            <List.Item.Detail.Metadata.Link title="robots.txt" target={robotsUrl} text="✔︎ Found" />
          ) : (
            <List.Item.Detail.Metadata.Label
              title="robots.txt"
              text="Not found"
              icon={{ source: Icon.Xmark, tintColor: Color.Red }}
            />
          )}
          {hasLlmsTxt && llmsTxtUrl ? (
            <List.Item.Detail.Metadata.Link title="LLMs.txt" target={llmsTxtUrl} text="✔︎ Found" />
          ) : (
            <List.Item.Detail.Metadata.Label
              title="LLMs.txt"
              text="Not found"
              icon={{ source: Icon.Xmark, tintColor: Color.Red }}
            />
          )}
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
