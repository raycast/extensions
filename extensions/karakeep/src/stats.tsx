import { Action, ActionPanel, Detail, Icon, environment } from "@raycast/api";
import { useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import { logger } from "@chrismessina/raycast-logger";
import { fetchGetUserStats } from "./apis";
import { useTranslation } from "./hooks/useTranslation";
import { formatBytes } from "./utils/formatting";
import { horizontalBarChart } from "./utils/svgChart";

const log = logger.child("[Stats]");

const EXTENSION_AUTHOR = "luolei";
const EXTENSION_NAME = "karakeep";
const deepLink = (command: string) => `raycast://extensions/${EXTENSION_AUTHOR}/${EXTENSION_NAME}/${command}`;

const formatHour = (hour: number) => {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
};

export default function Stats() {
  const { t } = useTranslation();
  const {
    isLoading,
    data: stats,
    error,
    revalidate,
  } = useCachedPromise(async () => {
    log.log("Fetching user stats");
    const result = await fetchGetUserStats();
    log.info("User stats fetched");
    return result;
  });

  const appearance = environment.appearance;

  const bySource = stats?.bookmarksBySource || [];
  const byHour = stats?.bookmarkingActivity?.byHour || [];
  const byDay = stats?.bookmarkingActivity?.byDayOfWeek || [];

  const dayNames = useMemo(
    () => [
      t("stats.days.sun"),
      t("stats.days.mon"),
      t("stats.days.tue"),
      t("stats.days.wed"),
      t("stats.days.thu"),
      t("stats.days.fri"),
      t("stats.days.sat"),
    ],
    [t],
  );

  const sourcesChart = useMemo(
    () =>
      bySource.length > 0
        ? horizontalBarChart(
            bySource.map((s) => ({ label: s.source ?? t("stats.unknown"), value: s.count })),
            appearance,
          )
        : null,
    [bySource, appearance, t],
  );

  const hourChart = useMemo(
    () =>
      byHour.length > 0
        ? horizontalBarChart(
            byHour.map((h) => ({ label: formatHour(h.hour), value: h.count })),
            appearance,
          )
        : null,
    [byHour, appearance],
  );

  const dayChart = useMemo(
    () =>
      byDay.length > 0
        ? horizontalBarChart(
            byDay.map((d) => ({ label: dayNames[d.day] ?? String(d.day), value: d.count })),
            appearance,
          )
        : null,
    [byDay, dayNames, appearance],
  );

  const actions = (
    <ActionPanel>
      <Action
        title={t("stats.refresh")}
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    </ActionPanel>
  );

  if (isLoading) {
    return <Detail isLoading navigationTitle={t("stats.title")} markdown="" actions={actions} />;
  }

  if (error || !stats) {
    return (
      <Detail
        navigationTitle={t("stats.title")}
        markdown={`# ${t("stats.empty.title")}\n\n${t("stats.empty.description")}`}
        actions={actions}
      />
    );
  }

  const topDomains = (stats.topDomains || []).slice(0, 10);
  const topTags = (stats.tagUsage || []).slice(0, 10);

  const markdown = [
    `## ${t("stats.overview")}`,
    "",
    `| ${t("stats.bookmarks")} | **${stats.numBookmarks}** |`,
    `|---|---|`,
    `| ${t("stats.favorites")} | **${stats.numFavorites}** |`,
    `| ${t("stats.archived")} | **${stats.numArchived}** |`,
    `| ${t("stats.tags")} | **${stats.numTags}** |`,
    `| ${t("stats.lists")} | **${stats.numLists}** |`,
    `| ${t("stats.highlights")} | **${stats.numHighlights}** |`,
    "",
    `## ${t("stats.byType")}`,
    "",
    `| ${t("stats.links")} | **${stats.bookmarksByType?.link ?? 0}** |`,
    `|---|---|`,
    `| ${t("stats.notes")} | **${stats.bookmarksByType?.text ?? 0}** |`,
    `| ${t("stats.assets")} | **${stats.bookmarksByType?.asset ?? 0}** |`,
    "",
    `## ${t("stats.bookmarksSaved")}`,
    "",
    `| ${t("stats.thisWeek")} | **${stats.bookmarkingActivity?.thisWeek ?? 0}** |`,
    `|---|---|`,
    `| ${t("stats.thisMonth")} | **${stats.bookmarkingActivity?.thisMonth ?? 0}** |`,
    `| ${t("stats.thisYear")} | **${stats.bookmarkingActivity?.thisYear ?? 0}** |`,
    ...(topDomains.length > 0
      ? [
          "",
          `## ${t("stats.topDomains")}`,
          "",
          `| Domain | Count |`,
          `|---|---|`,
          ...topDomains.map((d) => `| ${d.domain.replace(/\|/g, "\\|")} | ${d.count} |`),
        ]
      : []),
    ...(topTags.length > 0
      ? [
          "",
          `## ${t("stats.topTags")}`,
          "",
          `| Tag | Count |`,
          `|---|---|`,
          ...topTags.map((tag) => `| ${tag.name.replace(/\|/g, "\\|")} | ${tag.count} |`),
        ]
      : []),
    ...(sourcesChart ? ["", `## ${t("stats.bookmarkSources")}`, "", `<img src="${sourcesChart}" />`] : []),
    ...(hourChart ? ["", `## ${t("stats.activityByHour")}`, "", `<img src="${hourChart}" />`] : []),
    ...(dayChart ? ["", `## ${t("stats.activityByDay")}`, "", `<img src="${dayChart}" />`] : []),
    ...(stats.totalAssetSize > 0
      ? [
          "",
          `## ${t("stats.storage")}`,
          "",
          `| ${t("stats.totalAssetSize")} | **${formatBytes(stats.totalAssetSize)}** |`,
          `|---|---|`,
          ...(stats.assetsByType || []).map(
            (a) => `| ${a.type.replace(/\|/g, "\\|")} | ${a.count} files · ${formatBytes(a.totalSize)} |`,
          ),
        ]
      : []),
  ].join("\n");

  return (
    <Detail
      navigationTitle={t("stats.title")}
      markdown={markdown}
      actions={actions}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link
            title={t("stats.bookmarks")}
            text={String(stats.numBookmarks)}
            target={deepLink("bookmarks")}
          />
          <Detail.Metadata.Label title={t("stats.favorites")} text={String(stats.numFavorites)} icon={Icon.Star} />
          <Detail.Metadata.Label title={t("stats.archived")} text={String(stats.numArchived)} icon={Icon.Tray} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title={t("stats.links")}
            text={String(stats.bookmarksByType?.link ?? 0)}
            target={deepLink("bookmarks")}
          />
          <Detail.Metadata.Link
            title={t("stats.notes")}
            text={String(stats.bookmarksByType?.text ?? 0)}
            target={deepLink("notes")}
          />
          <Detail.Metadata.Label
            title={t("stats.assets")}
            text={String(stats.bookmarksByType?.asset ?? 0)}
            icon={Icon.Image}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title={t("stats.tags")} text={String(stats.numTags)} target={deepLink("tags")} />
          <Detail.Metadata.Link title={t("stats.lists")} text={String(stats.numLists)} target={deepLink("lists")} />
          <Detail.Metadata.Link
            title={t("stats.highlights")}
            text={String(stats.numHighlights)}
            target={deepLink("highlights")}
          />
          {stats.totalAssetSize > 0 && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title={t("stats.totalAssetSize")}
                text={formatBytes(stats.totalAssetSize)}
                icon={Icon.HardDrive}
              />
            </>
          )}
        </Detail.Metadata>
      }
    />
  );
}
