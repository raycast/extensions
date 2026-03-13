import { Action, Icon } from "@raycast/api";
import { ResourceDetailView } from "../components/ResourceDetailView";
import { SitemapDetailView } from "../components/SitemapDetailView";
import { ResourcesListView } from "../components/ResourcesListView";
import { DiggerResult } from "../types";

/**
 * Props for the ResourceViewAction component
 */
interface ResourceViewActionProps {
  /** The title to display in the action and detail view */
  title: string;
  /** The URL of the resource to fetch and display */
  url: string;
  /** The resource filename for error messages (e.g., "robots.txt", "sitemap.xml") */
  resourceName: string;
  /** Optional icon to display in the action (defaults to Icon.Document) */
  icon?: Icon;
  /** Whether to render the content as markdown (true) or in a code block (false) */
  renderAsMarkdown?: boolean;
}

/**
 * Action component that pushes a Detail view showing the raw content of a resource
 * Useful for viewing text-based resources like sitemap.xml, robots.txt, etc.
 *
 * @example
 * ```tsx
 * <ResourceViewAction
 *   title="View Sitemap"
 *   url="https://example.com/sitemap.xml"
 *   icon={Icon.Map}
 * />
 * ```
 */
export function ResourceViewAction({
  title,
  url,
  resourceName,
  icon = Icon.Document,
  renderAsMarkdown = false,
}: ResourceViewActionProps) {
  return (
    <Action.Push
      title={title}
      icon={icon}
      target={
        <ResourceDetailView url={url} title={title} resourceName={resourceName} renderAsMarkdown={renderAsMarkdown} />
      }
    />
  );
}

/**
 * Props for the DiscoverabilityActions component
 */
interface DiscoverabilityActionsProps {
  /** URL of the sitemap.xml file (if available) */
  sitemapUrl?: string;
  /** URL of the robots.txt file (if available) */
  robotsUrl?: string;
  /** URL of the llms.txt file (if available) */
  llmsTxtUrl?: string;
}

/**
 * Section-specific actions for the Discoverability component
 * Provides actions to view sitemap.xml, robots.txt, and llms.txt in a Detail view
 *
 * @example
 * ```tsx
 * <DiscoverabilityActions
 *   sitemapUrl="https://example.com/sitemap.xml"
 *   robotsUrl="https://example.com/robots.txt"
 *   llmsTxtUrl="https://example.com/llms.txt"
 * />
 * ```
 */
export function DiscoverabilityActions({ sitemapUrl, robotsUrl, llmsTxtUrl }: DiscoverabilityActionsProps) {
  if (!sitemapUrl && !robotsUrl && !llmsTxtUrl) {
    return null;
  }

  return (
    <>
      {sitemapUrl && (
        <Action.Push title="View Sitemap" icon={Icon.Map} target={<SitemapDetailView url={sitemapUrl} />} />
      )}
      {robotsUrl && (
        <ResourceViewAction title="View Robots.txt" url={robotsUrl} resourceName="robots.txt" icon={Icon.Document} />
      )}
      {llmsTxtUrl && (
        <ResourceViewAction
          title="View LLMs.txt"
          url={llmsTxtUrl}
          resourceName="llms.txt"
          icon={Icon.Document}
          renderAsMarkdown
        />
      )}
    </>
  );
}

/**
 * Props for the ResourcesViewActions component
 */
interface ResourcesViewActionsProps {
  /** The digger result data containing resources */
  data: DiggerResult;
  /** Whether fonts are available */
  hasFonts?: boolean;
  /** Whether stylesheets are available */
  hasStylesheets?: boolean;
  /** Whether scripts are available */
  hasScripts?: boolean;
}

/**
 * Section-specific actions for the Resources & Assets component
 * Provides actions to view all fonts, stylesheets, or scripts in a filtered list view
 */
export function ResourcesViewActions({ data, hasFonts, hasStylesheets, hasScripts }: ResourcesViewActionsProps) {
  if (!hasFonts && !hasStylesheets && !hasScripts) {
    return null;
  }

  return (
    <>
      {hasFonts && (
        <Action.Push
          title="View All Fonts"
          icon={Icon.Text}
          target={<ResourcesListView data={data} initialFilter="fonts" />}
        />
      )}
      {hasStylesheets && (
        <Action.Push
          title="View All Stylesheets"
          icon={Icon.Brush}
          target={<ResourcesListView data={data} initialFilter="stylesheets" />}
        />
      )}
      {hasScripts && (
        <Action.Push
          title="View All Scripts"
          icon={Icon.Code}
          target={<ResourcesListView data={data} initialFilter="scripts" />}
        />
      )}
    </>
  );
}
