import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
} from "@raycast/api";
import { useMemo } from "react";
import { useExchangers } from "../hooks/useExchangers";
import {
  useFavoriteExchangers,
  useBlacklistExchangers,
} from "../hooks/useFavorites";
import { exchangerUrl } from "../utils/url";
import {
  mapTrustColor,
  trustStatusName,
  trustStatusIcon,
} from "../utils/trustStatus";
import {
  toggleFavoriteExchanger,
  toggleBlacklistExchanger,
} from "../utils/favorites";
import type { Exchanger } from "../api/types";

export default function Exchangers() {
  const { data: exchangers, isLoading, error, revalidate } = useExchangers();
  const { data: favExchangers, revalidate: revalidateFavs } =
    useFavoriteExchangers();
  const { data: blacklist, revalidate: revalidateBlacklist } =
    useBlacklistExchangers();

  const favs = favExchangers || [];
  const blocked = blacklist || [];

  // Split into active/inactive, filter blacklisted
  const { active, inactive } = useMemo(() => {
    if (!exchangers) return { active: [], inactive: [] };

    const filtered = exchangers.filter(
      (e) => !blocked.includes(e.internal_url),
    );
    const active: Exchanger[] = [];
    const inactive: Exchanger[] = [];

    for (const ex of filtered) {
      if (ex.status === "active") {
        active.push(ex);
      } else {
        inactive.push(ex);
      }
    }

    // Sort by trust_score_total descending
    active.sort(
      (a, b) => (b.trust_score_total ?? 0) - (a.trust_score_total ?? 0),
    );
    inactive.sort(
      (a, b) => (b.trust_score_total ?? 0) - (a.trust_score_total ?? 0),
    );

    return { active, inactive };
  }, [exchangers, blocked]);

  async function handleToggleFav(internalUrl: string) {
    const added = await toggleFavoriteExchanger(internalUrl);
    await showToast({
      style: Toast.Style.Success,
      title: added ? "Added to favorites" : "Removed from favorites",
    });
    revalidateFavs();
  }

  async function handleToggleBlacklist(internalUrl: string) {
    const added = await toggleBlacklistExchanger(internalUrl);
    await showToast({
      style: Toast.Style.Success,
      title: added ? "Added to blacklist" : "Removed from blacklist",
    });
    revalidateBlacklist();
  }

  function stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();
  }

  function renderExchanger(ex: Exchanger) {
    const isFav = favs.includes(ex.internal_url);
    const trustLabel =
      ex.trust_status_label || trustStatusName(ex.trust_status_css_class);
    const trustColor = mapTrustColor(ex.trust_status_css_class);
    const trustIcon = trustStatusIcon(ex.trust_status_css_class);
    const explanationClean = ex.trust_status_explanation
      ? stripHtml(ex.trust_status_explanation)
      : "";

    return (
      <List.Item
        key={ex.internal_url}
        icon={trustIcon || { source: Icon.Circle, tintColor: trustColor }}
        title={ex.name}
        subtitle={`★ ${ex.average_rating?.toFixed(1) ?? "—"} · ${ex.pairs_count} pairs`}
        keywords={[ex.name, ex.internal_url]}
        accessories={[
          ...(trustLabel
            ? [
                {
                  tag: { value: trustLabel, color: trustColor },
                  icon: trustIcon,
                  tooltip: explanationClean || `Trust Status: ${trustLabel}`,
                },
              ]
            : []),
          {
            text: `${ex.review_count} reviews`,
            tooltip: `${ex.review_count} reviews, ${ex.problem_count} problems`,
          },
          ...(ex.monitoring_reviews_count && ex.monitoring_reviews_count > 0
            ? [
                {
                  icon: Icon.Eye,
                  tooltip: `Review Monitoring: ${ex.monitoring_reviews_count}`,
                },
              ]
            : []),
          ...(isFav
            ? [
                {
                  icon: { source: Icon.Heart, tintColor: Color.Red },
                  tooltip: "Favorite",
                },
              ]
            : []),
        ]}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="Rating"
                  text={`★ ${ex.average_rating?.toFixed(1) ?? "—"}`}
                />
                <List.Item.Detail.Metadata.Label
                  title="Trust Score"
                  text={
                    ex.trust_score_total != null
                      ? String(ex.trust_score_total)
                      : "—"
                  }
                />
                {trustLabel ? (
                  <List.Item.Detail.Metadata.TagList title="Trust Status">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={trustLabel}
                      icon={trustIcon}
                      color={trustColor}
                    />
                  </List.Item.Detail.Metadata.TagList>
                ) : null}
                {explanationClean ? (
                  <List.Item.Detail.Metadata.Label
                    title=""
                    text={explanationClean}
                  />
                ) : null}
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Currency Pairs"
                  text={String(ex.pairs_count)}
                />
                <List.Item.Detail.Metadata.Label
                  title="Reviews"
                  text={String(ex.review_count)}
                />
                <List.Item.Detail.Metadata.Label
                  title="Problems"
                  text={String(ex.problem_count)}
                />
                {ex.monitoring_reviews_count &&
                ex.monitoring_reviews_count > 0 ? (
                  <List.Item.Detail.Metadata.Label
                    title="Review Monitoring"
                    text={String(ex.monitoring_reviews_count)}
                  />
                ) : null}
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.TagList title="Status">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={ex.status === "active" ? "Active" : "Inactive"}
                    color={
                      ex.status === "active" ? Color.Green : Color.SecondaryText
                    }
                  />
                </List.Item.Detail.Metadata.TagList>
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open in Browser"
              url={exchangerUrl(ex.internal_url)}
            />
            <Action.CopyToClipboard title="Copy Name" content={ex.name} />
            <Action
              title={isFav ? "Remove from Favorites" : "Add to Favorites"}
              icon={isFav ? Icon.HeartDisabled : Icon.Heart}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={() => handleToggleFav(ex.internal_url)}
            />
            <Action
              title="Toggle Blacklist"
              icon={Icon.EyeDisabled}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
              onAction={() => handleToggleBlacklist(ex.internal_url)}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search exchangers..."
    >
      {error && !isLoading ? (
        <List.EmptyView
          title="Could not load exchangers"
          description={
            error instanceof Error
              ? error.message
              : "Please try refreshing the command."
          }
          icon={Icon.XMarkCircle}
        />
      ) : null}
      <List.Section title="Active" subtitle={`${active.length}`}>
        {active.map(renderExchanger)}
      </List.Section>
      {inactive.length > 0 && (
        <List.Section title="Inactive" subtitle={`${inactive.length}`}>
          {inactive.map(renderExchanger)}
        </List.Section>
      )}
    </List>
  );
}
