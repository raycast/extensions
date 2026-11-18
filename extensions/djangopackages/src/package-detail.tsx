import { Action, ActionPanel, Detail, Icon, Toast, showToast } from "@raycast/api";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  buildPackageUrl,
  getCategoryDetailByUrl,
  getGridDetailByUrl,
  getPackageDetailWithCache,
} from "./data";
import { MAX_VISIBLE_PARTICIPANTS } from "./constants";
import { PackageDetail } from "./types";
import { normalizeExternalUrl } from "./url";

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
  const categoryRef = packageDetail?.category;
  const rawGridRefs = packageDetail?.grids ?? [];
  const gridRefsKey = rawGridRefs.join("|");
  const gridRefs = useMemo(() => rawGridRefs, [gridRefsKey]);
  const hasDetail = Boolean(packageDetail);

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
      if (!hasDetail) {
        setCategoryTag(undefined);
        setGridTags([]);
        return;
      }

      const [resolvedCategory, resolvedGrids] = await Promise.all([
        resolveCategoryTag(categoryRef),
        resolveGridTags(gridRefs),
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
  }, [hasDetail, categoryRef, gridRefsKey, gridRefs]);

  const markdown = buildMarkdown(
    packageDetail,
    slug,
    fallbackDescription,
    error,
    categoryTag,
    gridTags,
  );
  const packageUrl = packageDetail?.slug ? buildPackageUrl(packageDetail.slug) : undefined;

  const documentationUrl = normalizeExternalUrl(packageDetail?.documentation_url);
  const pypiUrl = normalizeExternalUrl(packageDetail?.pypi_url);
  const repoUrl = normalizeExternalUrl(packageDetail?.repo_url);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={packageDetail?.title ?? slug}
      metadata={packageDetail ? <PackageMetadata detail={packageDetail} slug={slug} /> : undefined}
      actions={
        <ActionPanel>
          {documentationUrl && (
            <Action.OpenInBrowser
              title="Open Documentation"
              url={documentationUrl}
              icon={Icon.Book}
            />
          )}
          {pypiUrl && <Action.OpenInBrowser title="Open PyPI" url={pypiUrl} icon={Icon.Box} />}
          {repoUrl && (
            <Action.OpenInBrowser title="Open Repository" url={repoUrl} icon={Icon.Terminal} />
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
  const normalizedRepo = normalizeExternalUrl(detail.repo_url);
  const normalizedDocs = normalizeExternalUrl(detail.documentation_url);
  const normalizedPypi = normalizeExternalUrl(detail.pypi_url);
  if (normalizedRepo) {
    quickLinks.push(`[Repository](${normalizedRepo})`);
  }
  if (normalizedDocs) {
    quickLinks.push(`[Documentation](${normalizedDocs})`);
  }
  if (normalizedPypi) {
    quickLinks.push(`[PyPI Project](${normalizedPypi})`);
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
  category: PackageDetail["category"] | undefined,
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
      const trimmedRef = gridRef.trim();
      if (!trimmedRef) {
        return undefined;
      }

      if (trimmedRef.startsWith("http")) {
        try {
          const grid = await getGridDetailByUrl(trimmedRef);
          return {
            text: grid.title,
            url: grid.slug ? buildGridPageUrl(grid.slug) : undefined,
          };
        } catch (error) {
          console.error("Unable to load grid", error);
          return undefined;
        }
      }
      return { text: trimmedRef };
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
  const repoUrl = normalizeExternalUrl(detail.repo_url);
  const documentationUrl = normalizeExternalUrl(detail.documentation_url);
  const pypiUrl = normalizeExternalUrl(detail.pypi_url);
  const overviewItems = [
    detail.pypi_version ? (
      <Detail.Metadata.Label title="PyPI Version" text={detail.pypi_version} key="pypi" />
    ) : null,
    typeof detail.usage === "number" ? (
      <Detail.Metadata.Label title="Usage" text={detail.usage.toLocaleString()} key="usage" />
    ) : null,
  ].filter(Boolean);

  const activityEntries: Array<{ title: string; value?: string | null }> = [
    { title: "Last Release", value: detail.last_released },
    { title: "Last Commit", value: detail.last_committed },
    { title: "Last Updated", value: detail.last_updated },
    { title: "Last Fetched", value: detail.last_fetched },
  ];
  const activityItems = activityEntries
    .map(({ title, value }) =>
      value ? <Detail.Metadata.Label title={title} text={formatDate(value)} key={title} /> : null,
    )
    .filter(Boolean);

  const repoItems = [
    repoUrl ? (
      <Detail.Metadata.Link title="Repository" target={repoUrl} text={repoUrl} key="repo" />
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
    documentationUrl ? (
      <Detail.Metadata.Link
        title="Documentation"
        target={documentationUrl}
        text={documentationUrl}
        key="docs"
      />
    ) : null,
    pypiUrl ? (
      <Detail.Metadata.Link title="PyPI" target={pypiUrl} text={pypiUrl} key="pypi-link" />
    ) : null,
  ].filter(Boolean);

  const participantsItems =
    detail.participants && detail.participants.length > 0
      ? (() => {
          const visibleParticipants = detail.participants.slice(0, MAX_VISIBLE_PARTICIPANTS);
          const remainingCount = detail.participants.length - visibleParticipants.length;

          return [
            <Detail.Metadata.TagList title="Participants" key="participants">
              {visibleParticipants.map((participant, index) => (
                <Detail.Metadata.TagList.Item text={participant} key={`${participant}-${index}`} />
              ))}
              {remainingCount > 0 && (
                <Detail.Metadata.TagList.Item
                  text={`+${remainingCount} more`}
                  key="participants-more"
                />
              )}
            </Detail.Metadata.TagList>,
          ];
        })()
      : [];

  const sections = [overviewItems, activityItems, repoItems, linkItems, participantsItems].filter(
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

const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const absolute = date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const relative = formatRelativeToNow(date);
  return relative ? `${absolute} (${relative})` : absolute;
}

function formatRelativeToNow(date: Date): string | undefined {
  const seconds = (date.getTime() - Date.now()) / 1000;
  if (!Number.isFinite(seconds)) {
    return undefined;
  }

  const divisions: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
    { amount: 60, unit: "second" },
    { amount: 60, unit: "minute" },
    { amount: 24, unit: "hour" },
    { amount: 7, unit: "day" },
    { amount: 4.34524, unit: "week" },
    { amount: 12, unit: "month" },
    { amount: Number.POSITIVE_INFINITY, unit: "year" },
  ];

  let duration = seconds;
  for (const division of divisions) {
    if (Math.abs(duration) < division.amount) {
      const rounded = Math.round(duration);
      if (rounded === 0) {
        return "just now";
      }
      return RELATIVE_TIME_FORMATTER.format(rounded, division.unit);
    }
    duration /= division.amount;
  }

  return undefined;
}
