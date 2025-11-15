import { Action, ActionPanel, Detail, Icon, Toast, showToast } from "@raycast/api";
import { Fragment, useCallback, useEffect, useState } from "react";
import {
  buildPackageUrl,
  getCategoryDetailByUrl,
  getGridDetailByUrl,
  getPackageDetailWithCache,
} from "./data";
import { PackageDetail } from "./types";

interface PackageDetailViewProps {
  slug: string;
  fallbackDescription?: string;
}

interface TagValue {
  text: string;
  url?: string;
}

export function PackageDetailView({ slug, fallbackDescription }: PackageDetailViewProps) {
  const [packageDetail, setPackageDetail] = useState<PackageDetail>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [categoryTag, setCategoryTag] = useState<TagValue>();
  const [gridTags, setGridTags] = useState<TagValue[]>([]);

  const loadDetail = useCallback(
    async (forceRefresh = false): Promise<boolean> => {
      setIsLoading(true);
      setError(undefined);
      try {
        const detail = await getPackageDetailWithCache(slug, forceRefresh);
        setPackageDetail(detail);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to fetch details";
        setError(message);
        await showToast({ style: Toast.Style.Failure, title: "Failed to load package", message });
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [slug],
  );

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    let ignore = false;

    async function hydrateLinkedMetadata() {
      if (!packageDetail) {
        setCategoryTag(undefined);
        setGridTags([]);
        return;
      }

      const [resolvedCategory, resolvedGrids] = await Promise.all([
        resolveCategoryTag(packageDetail.category),
        resolveGridTags(packageDetail.grids),
      ]);

      if (!ignore) {
        setCategoryTag(resolvedCategory);
        setGridTags(resolvedGrids);
      }
    }

    hydrateLinkedMetadata().catch((err) => console.error("Failed to resolve linked metadata", err));

    return () => {
      ignore = true;
    };
  }, [packageDetail]);

  const markdown = buildMarkdown(
    packageDetail,
    slug,
    fallbackDescription,
    error,
    categoryTag,
    gridTags,
  );
  const packageUrl = packageDetail?.slug ? buildPackageUrl(packageDetail.slug) : undefined;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={packageDetail?.title ?? slug}
      metadata={packageDetail ? <PackageMetadata detail={packageDetail} slug={slug} /> : undefined}
      actions={
        <ActionPanel>
          {packageDetail?.documentation_url && (
            <Action.OpenInBrowser
              title="Open Documentation"
              url={packageDetail.documentation_url}
              icon={Icon.Book}
            />
          )}
          {packageDetail?.pypi_url && (
            <Action.OpenInBrowser title="Open PyPI" url={packageDetail.pypi_url} icon={Icon.Box} />
          )}
          {packageDetail?.repo_url && (
            <Action.OpenInBrowser
              title="Open Repository"
              url={packageDetail.repo_url}
              icon={Icon.Terminal}
            />
          )}
          {packageUrl && (
            <Action.OpenInBrowser
              title="Open DjangoPackages Page"
              url={packageUrl}
              icon={Icon.Globe}
            />
          )}
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Package URL"
              content={packageUrl ?? `https://djangopackages.org/packages/p/${slug}/`}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={async () => {
                const success = await loadDetail(true);
                if (success) {
                  await showToast({ style: Toast.Style.Success, title: "Package refreshed" });
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function buildMarkdown(
  detail: PackageDetail | undefined,
  slug: string,
  fallbackDescription?: string,
  error?: string,
  categoryTag?: TagValue,
  gridTags: TagValue[] = [],
): string {
  if (error) {
    return `# ${slug}\n\n${error}`;
  }

  if (!detail) {
    return `# ${slug}\n\n${fallbackDescription ?? "Loading package metadata..."}`;
  }

  const description =
    detail.repo_description ??
    detail.description ??
    fallbackDescription ??
    "No description provided.";

  const highlights: string[] = [];
  if (categoryTag) {
    highlights.push(formatBadgeLine("Category", [categoryTag]));
  }
  if (gridTags.length > 0) {
    const label = gridTags.length === 1 ? "Grid" : "Grids";
    highlights.push(formatBadgeLine(label, gridTags));
  }
  if (typeof detail.usage === "number") {
    highlights.push(formatBadgeLine("Usage Count", [{ text: detail.usage.toLocaleString() }]));
  }

  const quickLinks: string[] = [];
  const packageUrl = detail.slug ? buildPackageUrl(detail.slug) : undefined;
  if (packageUrl) {
    quickLinks.push(`[DjangoPackages Page](${packageUrl})`);
  }
  if (detail.repo_url) {
    quickLinks.push(`[Repository](${detail.repo_url})`);
  }
  if (detail.documentation_url) {
    quickLinks.push(`[Documentation](${detail.documentation_url})`);
  }
  if (detail.pypi_url) {
    quickLinks.push(`[PyPI Project](${detail.pypi_url})`);
  }

  const highlightsMarkdown =
    highlights.length > 0
      ? `\n\n## Highlights\n\n${highlights.map((line) => `- ${line}`).join("\n")}`
      : "";
  const linksMarkdown =
    quickLinks.length > 0
      ? `\n\n## Quick Links\n\n${quickLinks.map((link) => `- ${link}`).join("\n")}`
      : "";

  return `# ${detail.title}\n\n${description}${highlightsMarkdown}${linksMarkdown}`;
}

function formatBadgeLine(label: string, values: TagValue[]): string {
  const badges = values
    .map((value) => {
      const badge = `${value.text}`;
      return value.url ? `[${badge}](${value.url})` : badge;
    })
    .join(" ");
  return `${label}: ${badges}`;
}

async function resolveCategoryTag(
  category: PackageDetail["category"],
): Promise<TagValue | undefined> {
  if (!category) {
    return undefined;
  }

  if (typeof category === "string") {
    if (category.startsWith("http")) {
      try {
        const detail = await getCategoryDetailByUrl(category);
        return {
          text: detail.title,
          url: detail.slug ? buildCategoryPageUrl(detail.slug) : undefined,
        };
      } catch (error) {
        console.error("Unable to load category", error);
        return undefined;
      }
    }
    return { text: category };
  }

  return {
    text: category.title,
    url: category.slug ? buildCategoryPageUrl(category.slug) : undefined,
  };
}

async function resolveGridTags(gridRefs?: string[]): Promise<TagValue[]> {
  if (!gridRefs || gridRefs.length === 0) {
    return [];
  }

  const tags = await Promise.all(
    gridRefs.map(async (gridRef) => {
      if (gridRef.startsWith("http")) {
        try {
          const grid = await getGridDetailByUrl(gridRef);
          return {
            text: grid.title,
            url: grid.slug ? buildGridPageUrl(grid.slug) : undefined,
          };
        } catch (error) {
          console.error("Unable to load grid", error);
          return undefined;
        }
      }
      return { text: gridRef };
    }),
  );

  return tags.filter((tag): tag is TagValue => Boolean(tag));
}

function buildCategoryPageUrl(slug: string): string {
  return `https://djangopackages.org/categories/${slug}/`;
}

function buildGridPageUrl(slug: string): string {
  return `https://djangopackages.org/grids/g/${slug}/`;
}

function PackageMetadata({ detail, slug }: { detail: PackageDetail; slug: string }) {
  const packageUrl = buildPackageUrl(slug);
  const overviewItems = [
    detail.pypi_version ? (
      <Detail.Metadata.Label title="PyPI Version" text={detail.pypi_version} key="pypi" />
    ) : null,
    typeof detail.usage === "number" ? (
      <Detail.Metadata.Label title="Usage" text={detail.usage.toLocaleString()} key="usage" />
    ) : null,
  ].filter(Boolean);

  const activityItems = [
    detail.last_released ? (
      <Detail.Metadata.Label
        title="Last Release"
        text={formatDate(detail.last_released)}
        key="release"
      />
    ) : null,
    detail.last_committed ? (
      <Detail.Metadata.Label
        title="Last Commit"
        text={formatDate(detail.last_committed)}
        key="commit"
      />
    ) : null,
    detail.last_updated ? (
      <Detail.Metadata.Label
        title="Last Updated"
        text={formatDate(detail.last_updated)}
        key="updated"
      />
    ) : null,
    detail.last_fetched ? (
      <Detail.Metadata.Label
        title="Last Fetched"
        text={formatDate(detail.last_fetched)}
        key="fetched"
      />
    ) : null,
  ].filter(Boolean);

  const repoItems = [
    detail.repo_url ? (
      <Detail.Metadata.Link
        title="Repository"
        target={detail.repo_url}
        text={detail.repo_url}
        key="repo"
      />
    ) : null,
    typeof detail.repo_watchers === "number" ? (
      <Detail.Metadata.Label
        title="Watchers"
        text={detail.repo_watchers.toLocaleString()}
        key="watchers"
      />
    ) : null,
    typeof detail.repo_forks === "number" ? (
      <Detail.Metadata.Label title="Forks" text={detail.repo_forks.toLocaleString()} key="forks" />
    ) : null,
  ].filter(Boolean);

  const linkItems = [
    <Detail.Metadata.Link
      title="Package Page"
      target={packageUrl}
      text="DjangoPackages"
      key="pkg"
    />,
    detail.documentation_url ? (
      <Detail.Metadata.Link
        title="Documentation"
        target={detail.documentation_url}
        text={detail.documentation_url}
        key="docs"
      />
    ) : null,
    detail.pypi_url ? (
      <Detail.Metadata.Link
        title="PyPI"
        target={detail.pypi_url}
        text={detail.pypi_url}
        key="pypi-link"
      />
    ) : null,
  ].filter(Boolean);

  const sections = [overviewItems, activityItems, repoItems, linkItems].filter(
    (items) => items.length > 0,
  );

  return (
    <Detail.Metadata>
      {sections.map((items, index) => (
        <Fragment key={`section-${index}`}>
          {index > 0 && <Detail.Metadata.Separator />}
          {items}
        </Fragment>
      ))}
    </Detail.Metadata>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
