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
import { getLocale, t } from "../utils/locale";
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
  const locale = getLocale();
  const { data: exchangers, isLoading, revalidate } = useExchangers(locale);
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
        subtitle={`★ ${ex.average_rating?.toFixed(1) ?? "—"} · ${ex.pairs_count} ${t("pairs", locale)}`}
        keywords={[ex.name, ex.internal_url]}
        accessories={[
          ...(trustLabel
            ? [
                {
                  tag: { value: trustLabel, color: trustColor },
                  icon: trustIcon,
                  tooltip:
                    explanationClean ||
                    `${t("trustStatus", locale)}: ${trustLabel}`,
                },
              ]
            : []),
          {
            text: `${ex.review_count} ${t("reviews", locale)}`,
            tooltip: `${ex.review_count} ${t("reviews", locale)}, ${ex.problem_count} ${t("problems", locale)}`,
          },
          ...(ex.monitoring_reviews_count && ex.monitoring_reviews_count > 0
            ? [
                {
                  icon: Icon.Eye,
                  tooltip: `${t("monitoring", locale)}: ${ex.monitoring_reviews_count}`,
                },
              ]
            : []),
          ...(isFav
            ? [
                {
                  icon: { source: Icon.Heart, tintColor: Color.Red },
                  tooltip: t("favorites", locale),
                },
              ]
            : []),
        ]}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title={t("rating", locale)}
                  text={`★ ${ex.average_rating?.toFixed(1) ?? "—"}`}
                />
                <List.Item.Detail.Metadata.Label
                  title={t("trustScore", locale)}
                  text={
                    ex.trust_score_total != null
                      ? String(ex.trust_score_total)
                      : "—"
                  }
                />
                {trustLabel ? (
                  <List.Item.Detail.Metadata.TagList
                    title={t("trustStatus", locale)}
                  >
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
                  title={t("currencyPairs", locale)}
                  text={String(ex.pairs_count)}
                />
                <List.Item.Detail.Metadata.Label
                  title={t("reviews", locale)}
                  text={String(ex.review_count)}
                />
                <List.Item.Detail.Metadata.Label
                  title={t("problems", locale)}
                  text={String(ex.problem_count)}
                />
                {ex.monitoring_reviews_count &&
                ex.monitoring_reviews_count > 0 ? (
                  <List.Item.Detail.Metadata.Label
                    title={t("monitoring", locale)}
                    text={String(ex.monitoring_reviews_count)}
                  />
                ) : null}
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.TagList title={t("status", locale)}>
                  <List.Item.Detail.Metadata.TagList.Item
                    text={
                      ex.status === "active"
                        ? t("active", locale)
                        : t("inactive", locale)
                    }
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
              title={t("openInBrowser", locale)}
              url={exchangerUrl(ex.internal_url, locale)}
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
      searchBarPlaceholder={t("searchExchangers", locale)}
    >
      <List.Section title={t("active", locale)} subtitle={`${active.length}`}>
        {active.map(renderExchanger)}
      </List.Section>
      {inactive.length > 0 && (
        <List.Section
          title={t("inactive", locale)}
          subtitle={`${inactive.length}`}
        >
          {inactive.map(renderExchanger)}
        </List.Section>
      )}
    </List>
  );
}
