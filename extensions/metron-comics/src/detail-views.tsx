import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  fetchIssueDetail,
  fetchSeriesDetail,
  fetchSeriesIssues,
  formatDate,
  issueTitle,
  MetronIssue,
  MetronIssueDetail,
  MetronSeries,
  MetronVariant,
} from "./api";

// ─── Series Detail View ────────────────────────────────────────────────────────

export function SeriesDetailView({ seriesId, seriesName }: { seriesId: number; seriesName: string }) {
  const [series, setSeries] = useState<MetronSeries | null>(null);
  const [issues, setIssues] = useState<MetronIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchSeriesDetail(seriesId), fetchSeriesIssues(seriesId)])
      .then(([s, i]) => {
        if (!cancelled) {
          setSeries(s);
          setIssues(i);
        }
      })
      .catch(async (err) => {
        if (!cancelled) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to load series",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [seriesId]);

  const yearRange = series
    ? series.year_end
      ? `${series.year_began}–${series.year_end}`
      : `${series.year_began}–present`
    : "";

  return (
    <List isLoading={isLoading} navigationTitle={seriesName}>
      <List.Section
        title={series?.name ?? seriesName}
        subtitle={[
          issues.length ? `${issues.length} issue${issues.length !== 1 ? "s" : ""}` : null,
          yearRange,
          series?.publisher?.name,
        ]
          .filter(Boolean)
          .join("  •  ")}
      >
        {issues.map((issue) => (
          <IssueListItemInner key={issue.id} issue={issue} />
        ))}
      </List.Section>
    </List>
  );
}

// ─── Issue Detail View ─────────────────────────────────────────────────────────

export function IssueDetailView({ issue }: { issue: MetronIssue }) {
  const [detail, setDetail] = useState<MetronIssueDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<MetronVariant | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchIssueDetail(issue.id)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(async (err) => {
        if (!cancelled) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to load details",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [issue.id]);

  const activeImage = selectedVariant?.image ?? issue.image;
  const title = issueTitle(issue);
  const coverMd = activeImage ? `<img src="${activeImage}" width="200" />\n\n` : "";
  const descMd = detail?.desc ? `${detail.desc}\n\n` : "";
  const markdown = `${coverMd}${descMd}`;
  const publisherName = detail?.publisher?.name ?? issue.publisher?.name ?? "";

  // Series ID comes from the detail response (not available on list items)
  const seriesId = detail?.series?.id;

  const variantActions =
    detail?.variants && detail.variants.length > 0
      ? detail.variants.map((v, i) => (
          <Action
            key={i}
            title={v.name || `Variant ${i + 1}`}
            icon={selectedVariant === v ? Icon.CheckCircle : Icon.Image}
            onAction={() => setSelectedVariant(selectedVariant === v ? null : v)}
          />
        ))
      : null;

  return (
    <List isLoading={isLoading} navigationTitle={title} isShowingDetail searchBarPlaceholder="">
      <List.Item
        title={title}
        detail={
          <List.Item.Detail
            isLoading={isLoading}
            markdown={markdown}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Series" text={issue.series?.name ?? ""} />
                <List.Item.Detail.Metadata.Label title="Issue" text={`#${issue.number}`} />
                {issue.issue_name ? <List.Item.Detail.Metadata.Label title="Title" text={issue.issue_name} /> : null}
                {publisherName ? <List.Item.Detail.Metadata.Label title="Publisher" text={publisherName} /> : null}
                <List.Item.Detail.Metadata.Label
                  title="Store Date"
                  text={formatDate(issue.store_date ?? issue.cover_date)}
                  icon={Icon.Calendar}
                />
                {detail?.price ? (
                  <List.Item.Detail.Metadata.Label title="Cover Price" text={`$${detail.price}`} />
                ) : null}
                {detail?.page_count ? (
                  <List.Item.Detail.Metadata.Label title="Pages" text={String(detail.page_count)} />
                ) : null}
                {detail?.variants && detail.variants.length > 0 ? (
                  <>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="Variants">
                      {detail.variants.map((v, i) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={i}
                          text={v.name || `Variant ${i + 1}`}
                          color={selectedVariant === v ? Color.Blue : Color.SecondaryText}
                        />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  </>
                ) : null}
                {detail?.credits && detail.credits.length > 0 ? (
                  <>
                    <List.Item.Detail.Metadata.Separator />
                    {detail.credits.map((c) => (
                      <List.Item.Detail.Metadata.Label
                        key={c.id}
                        title={c.role.map((r) => r.name).join(", ")}
                        text={c.creator}
                      />
                    ))}
                  </>
                ) : null}
                {detail?.arcs && detail.arcs.length > 0 ? (
                  <>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="Story Arcs">
                      {detail.arcs.map((arc) => (
                        <List.Item.Detail.Metadata.TagList.Item key={arc.id} text={arc.name} color={Color.Purple} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  </>
                ) : null}
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Link
                  title="View on Metron"
                  target={`https://metron.cloud/issue/${issue.id}/`}
                  text="Open in Browser"
                />
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.OpenInBrowser
                title="Open on Metron"
                icon={Icon.Globe}
                url={`https://metron.cloud/issue/${issue.id}/`}
              />
              {seriesId ? (
                <Action.Push
                  title="View Series"
                  icon={Icon.List}
                  target={<SeriesDetailView seriesId={seriesId} seriesName={issue.series?.name ?? "Series"} />}
                />
              ) : null}
              <Action.CopyToClipboard title="Copy Title" content={title} shortcut={{ modifiers: ["cmd"], key: "c" }} />
              <Action.CopyToClipboard
                title="Copy Metron URL"
                content={`https://metron.cloud/issue/${issue.id}/`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel.Section>
            {variantActions ? (
              <ActionPanel.Section title="Switch Cover">
                {variantActions}
                {selectedVariant ? (
                  <Action
                    title="Reset to Main Cover"
                    icon={Icon.RotateAntiClockwise}
                    onAction={() => setSelectedVariant(null)}
                  />
                ) : null}
              </ActionPanel.Section>
            ) : null}
          </ActionPanel>
        }
      />
    </List>
  );
}

// ─── Inner list item (used inside SeriesDetailView, no circular imports) ───────

export function IssueListItemInner({ issue }: { issue: MetronIssue }) {
  const title = issueTitle(issue);
  const storeDate = formatDate(issue.store_date ?? issue.cover_date);
  return (
    <List.Item
      title={title}
      subtitle={issue.issue_name ?? ""}
      icon={issue.image ? { source: issue.image, fallback: Icon.Book } : Icon.Book}
      accessories={[{ text: storeDate, icon: Icon.Calendar }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="View Details & Variants"
              icon={Icon.Sidebar}
              target={<IssueDetailView issue={issue} />}
            />
            <Action.OpenInBrowser
              title="Open on Metron"
              icon={Icon.Globe}
              url={`https://metron.cloud/issue/${issue.id}/`}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Title" content={title} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
