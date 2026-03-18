/**
 * index.tsx
 *
 * Main Raycast command for "Web Metrics".
 *
 * Architecture:
 *  - No business logic lives here — all data work is delegated to
 *    PageSpeedService, HistoryService, FavoritesService, ReportService,
 *    and Formatter.
 *  - Services are instantiated once at module level (simplest DI).
 *  - The home screen is a searchable List — typing a URL in the search
 *    bar surfaces "Analyze …" actions at the top, while Favourites and
 *    Recent sections stay below for one-click re-tests.
 *  - ResultsActions is defined OUTSIDE ResultsView so React never sees
 *    a new component type on every render (was a hidden perf bug).
 */

import {
  Action,
  ActionPanel,
  List,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Toast,
  Clipboard,
  Icon,
  Color,
} from "@raycast/api";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Metrics, type ReportSnapshot } from "./models/Metrics";
import { FavoritesService } from "./services/FavoritesService";
import { HistoryService, type HistoryEntry } from "./services/HistoryService";
import { PageSpeedService, type Strategy } from "./services/PageSpeedService";
import { ReportService, type ScoreDelta } from "./services/ReportService";
import { Formatter, type MetricName } from "./utils/Formatter";

// ── Preferences ───────────────────────────────────────────────────
interface Preferences {
  apiKey: string;
}

// ── Service singletons ────────────────────────────────────────────
const prefs = getPreferenceValues<Preferences>();
const pageSpeedService = new PageSpeedService(prefs.apiKey);
const historyService = new HistoryService();
const favoritesService = new FavoritesService();
const reportService = new ReportService();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── Entry point ───────────────────────────────────────────────────
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function Command() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [testedUrl, setTestedUrl] = useState<string>("");
  const [strategy, setStrategy] = useState<Strategy>("mobile");
  const [delta, setDelta] = useState<ScoreDelta | null>(null);

  const resetToHome = useCallback(() => {
    setMetrics(null);
    setTestedUrl("");
    setDelta(null);
  }, []);

  if (metrics) {
    return (
      <ResultsView
        metrics={metrics}
        url={testedUrl}
        strategy={strategy}
        delta={delta}
        onBack={resetToHome}
        onSwitchStrategy={async (newStrategy) => {
          const result = await runAnalysis(testedUrl, newStrategy, setDelta);
          if (result) {
            setStrategy(newStrategy);
            setMetrics(result);
          }
        }}
      />
    );
  }

  return (
    <HomeScreen
      onAnalyze={async (url, strat) => {
        const result = await runAnalysis(url, strat, setDelta);
        if (result) {
          setTestedUrl(url);
          setStrategy(strat);
          setMetrics(result);
        }
      }}
    />
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── Home Screen ───────────────────────────────────────────────────
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface HomeScreenProps {
  onAnalyze: (url: string, strategy: Strategy) => Promise<void>;
}

function HomeScreen({ onAnalyze }: HomeScreenProps) {
  const [searchText, setSearchText] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [snapshots, setSnapshots] = useState<ReportSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      historyService.getAll(),
      favoritesService.getAll(),
      reportService.getAll(),
    ]).then(([h, f, s]) => {
      setHistory(h);
      setFavorites(f);
      setSnapshots(s);
    });
  }, []);

  /** Returns the last stored performance score for a URL + strategy, or null. */
  const getLastScore = useCallback(
    (url: string, strategy: Strategy): number | null =>
      snapshots.find((s) => s.url === url && s.strategy === strategy)?.scores
        .performance ?? null,
    [snapshots],
  );

  const handleAnalyze = useCallback(
    async (url: string, strat: Strategy) => {
      setIsLoading(true);
      try {
        await onAnalyze(url, strat);
      } finally {
        setIsLoading(false);
      }
    },
    [onAnalyze],
  );

  const handleRemoveHistory = useCallback(async (url: string) => {
    await historyService.remove(url);
    setHistory((prev) => prev.filter((e) => e.url !== url));
    await showToast({
      style: Toast.Style.Success,
      title: "Removed from history",
    });
  }, []);

  const handleClearHistory = useCallback(async () => {
    await historyService.clear();
    setHistory([]);
    await showToast({ style: Toast.Style.Success, title: "History cleared" });
  }, []);

  const handleToggleFavorite = useCallback(async (url: string) => {
    const added = await favoritesService.toggle(url);
    const updated = await favoritesService.getAll();
    setFavorites(updated);
    await showToast({
      style: Toast.Style.Success,
      title: added ? "Added to Favourites" : "Removed from Favourites",
    });
  }, []);

  const candidateUrl = useMemo(
    () =>
      searchText.trim() && Formatter.isValidUrl(searchText)
        ? Formatter.normalizeUrl(searchText)
        : null,
    [searchText],
  );
  const candidateHost = candidateUrl
    ? Formatter.extractHostname(candidateUrl)
    : null;
  const isFav = useCallback(
    (url: string) => favorites.includes(url),
    [favorites],
  );

  return (
    <List
      searchBarPlaceholder="Enter a URL to analyze… (e.g. example.com)"
      onSearchTextChange={setSearchText}
      filtering={false}
      isLoading={isLoading}
      throttle
    >
      {/* ── New URL candidate ── */}
      {candidateUrl && candidateHost && (
        <List.Section title={`Analyze ${candidateHost}`}>
          <List.Item
            key={`analyze-mobile-${candidateUrl}`}
            title={candidateHost}
            subtitle="Mobile"
            icon={Icon.Mobile}
            actions={
              <ActionPanel>
                <Action
                  title="Analyze (mobile)"
                  icon={Icon.Mobile}
                  onAction={() => handleAnalyze(candidateUrl, "mobile")}
                />
                <Action
                  title="Analyze (desktop)"
                  icon={Icon.Monitor}
                  onAction={() => handleAnalyze(candidateUrl, "desktop")}
                />
                <Action
                  title={
                    isFav(candidateUrl)
                      ? "Remove from Favourites"
                      : "Add to Favourites"
                  }
                  icon={isFav(candidateUrl) ? Icon.StarDisabled : Icon.Star}
                  onAction={() => handleToggleFavorite(candidateUrl)}
                />
                <Action
                  title="Change Api Key"
                  icon={Icon.Key}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                  onAction={openExtensionPreferences}
                />
              </ActionPanel>
            }
          />
          <List.Item
            key={`analyze-desktop-${candidateUrl}`}
            title={candidateHost}
            subtitle="Desktop"
            icon={Icon.Monitor}
            actions={
              <ActionPanel>
                <Action
                  title="Analyze (desktop)"
                  icon={Icon.Monitor}
                  onAction={() => handleAnalyze(candidateUrl, "desktop")}
                />
                <Action
                  title="Analyze (mobile)"
                  icon={Icon.Mobile}
                  onAction={() => handleAnalyze(candidateUrl, "mobile")}
                />
                <Action
                  title={
                    isFav(candidateUrl)
                      ? "Remove from Favourites"
                      : "Add to Favourites"
                  }
                  icon={isFav(candidateUrl) ? Icon.StarDisabled : Icon.Star}
                  onAction={() => handleToggleFavorite(candidateUrl)}
                />
                <Action
                  title="Change Api Key"
                  icon={Icon.Key}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                  onAction={openExtensionPreferences}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* ── Favourites ── */}
      {favorites.length > 0 && (
        <List.Section title="Favourites">
          {favorites.map((url) => {
            const host = Formatter.extractHostname(url);
            const lastEntry = history.find((e) => e.url === url);
            const lastStrat: Strategy = lastEntry?.strategy ?? "mobile";
            const otherStrat: Strategy =
              lastStrat === "mobile" ? "desktop" : "mobile";
            const lastScore = getLastScore(url, lastStrat);
            return (
              <List.Item
                key={`fav-${url}`}
                title={host}
                subtitle={url !== `https://${host}` ? url : undefined}
                icon={{ source: Icon.Star, tintColor: Color.Yellow }}
                accessories={[
                  {
                    icon: lastStrat === "mobile" ? Icon.Mobile : Icon.Monitor,
                    tooltip: `Last tested: ${lastStrat}`,
                  },
                  ...(lastScore !== null
                    ? [
                        {
                          tag: {
                            value: `${lastScore}`,
                            color: Formatter.toScoreColor(lastScore),
                          },
                          tooltip: `Performance: ${lastScore}/100`,
                        },
                      ]
                    : []),
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title={`Analyze (${lastStrat === "mobile" ? "Mobile" : "Desktop"})`}
                      icon={lastStrat === "mobile" ? Icon.Mobile : Icon.Monitor}
                      onAction={() => handleAnalyze(url, lastStrat)}
                    />
                    <Action
                      title={`Analyze (${otherStrat === "mobile" ? "Mobile" : "Desktop"})`}
                      icon={
                        otherStrat === "mobile" ? Icon.Mobile : Icon.Monitor
                      }
                      onAction={() => handleAnalyze(url, otherStrat)}
                    />
                    <Action
                      title="Remove from Favourites"
                      icon={Icon.StarDisabled}
                      onAction={() => handleToggleFavorite(url)}
                    />
                    <Action
                      title="Remove from History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleRemoveHistory(url)}
                    />
                    <Action
                      title="Change Api Key"
                      icon={Icon.Key}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                      onAction={openExtensionPreferences}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {/* ── Recent ── */}
      {history.length > 0 && (
        <List.Section title="Recent">
          {history.map((entry) => {
            const host = Formatter.extractHostname(entry.url);
            const timeAgo = formatTimeAgo(entry.timestamp);
            const otherStrat: Strategy =
              entry.strategy === "mobile" ? "desktop" : "mobile";
            const lastScore = getLastScore(entry.url, entry.strategy);
            return (
              <List.Item
                key={`history-${entry.url}`}
                title={host}
                subtitle={
                  entry.url !== `https://${host}` ? entry.url : undefined
                }
                icon={Icon.Clock}
                accessories={[
                  {
                    icon:
                      entry.strategy === "mobile" ? Icon.Mobile : Icon.Monitor,
                    tooltip: entry.strategy,
                  },
                  { text: timeAgo },
                  ...(lastScore !== null
                    ? [
                        {
                          tag: {
                            value: `${lastScore}`,
                            color: Formatter.toScoreColor(lastScore),
                          },
                          tooltip: `Performance: ${lastScore}/100`,
                        },
                      ]
                    : []),
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title={`Analyze (${entry.strategy === "mobile" ? "Mobile" : "Desktop"})`}
                      icon={
                        entry.strategy === "mobile" ? Icon.Mobile : Icon.Monitor
                      }
                      onAction={() => handleAnalyze(entry.url, entry.strategy)}
                    />
                    <Action
                      title={`Analyze (${otherStrat === "mobile" ? "Mobile" : "Desktop"})`}
                      icon={
                        otherStrat === "mobile" ? Icon.Mobile : Icon.Monitor
                      }
                      onAction={() => handleAnalyze(entry.url, otherStrat)}
                    />
                    <Action
                      title={
                        isFav(entry.url)
                          ? "Remove from Favourites"
                          : "Add to Favourites"
                      }
                      icon={isFav(entry.url) ? Icon.StarDisabled : Icon.Star}
                      onAction={() => handleToggleFavorite(entry.url)}
                    />
                    <Action
                      title="Remove from History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleRemoveHistory(entry.url)}
                    />
                    <Action
                      title="Clear All History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                      onAction={handleClearHistory}
                    />
                    <Action
                      title="Change Api Key"
                      icon={Icon.Key}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                      onAction={openExtensionPreferences}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {!candidateUrl && favorites.length === 0 && history.length === 0 && (
        <List.EmptyView
          icon={Icon.Globe}
          title="Type a URL to get started"
          description="Enter any website address above to analyze its performance, accessibility, and SEO scores."
        />
      )}
    </List>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── Results Actions (lifted OUTSIDE ResultsView) ─────────────────
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ResultsActionsProps {
  metrics: Metrics;
  url: string;
  strategy: Strategy;
  onBack: () => void;
  onSwitchStrategy: (s: Strategy) => void;
}

function ResultsActions({
  metrics,
  url,
  strategy,
  onBack,
  onSwitchStrategy,
}: ResultsActionsProps) {
  const otherStrategy: Strategy = strategy === "mobile" ? "desktop" : "mobile";
  const strategyLabel = strategy === "mobile" ? "Mobile" : "Desktop";
  const fullReportUrl = `https://pagespeed.web.dev/report?url=${encodeURIComponent(url)}&form_factor=${strategy}`;

  return (
    <ActionPanel>
      <Action
        title="Test Another URL"
        icon={Icon.ArrowLeft}
        onAction={onBack}
      />

      <Action
        title={`Switch to ${otherStrategy === "mobile" ? "Mobile" : "Desktop"}`}
        icon={otherStrategy === "mobile" ? Icon.Mobile : Icon.Monitor}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        onAction={() => onSwitchStrategy(otherStrategy)}
      />

      <Action.OpenInBrowser
        title="Open Full Report in Browser"
        url={fullReportUrl}
        icon={Icon.Globe}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />

      <Action
        title="Copy Full Report as Markdown"
        icon={Icon.Document}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        onAction={async () => {
          const md = Formatter.toMarkdownReport(metrics, url, strategy);
          await Clipboard.copy(md);
          await showToast({
            style: Toast.Style.Success,
            title: "Markdown report copied",
          });
        }}
      />

      <Action
        title="Copy Score Summary"
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
        onAction={async () => {
          const now = new Date().toLocaleString();
          const summary = [
            `Web Metrics — ${url} (${strategyLabel}) — ${now}`,
            `Performance  : ${metrics.performanceScore}/100  (${Formatter.toScoreLabel(metrics.performanceScore)})`,
            `Accessibility: ${metrics.accessibilityScore}/100  (${Formatter.toScoreLabel(metrics.accessibilityScore)})`,
            `Best Practices: ${metrics.bestPracticesScore}/100  (${Formatter.toScoreLabel(metrics.bestPracticesScore)})`,
            `SEO          : ${metrics.seoScore}/100  (${Formatter.toScoreLabel(metrics.seoScore)})`,
            `FCP: ${Formatter.toReadableTime(metrics.fcp)}  LCP: ${Formatter.toReadableTime(metrics.lcp)}  CLS: ${Formatter.toReadableCls(metrics.cls)}`,
            `TTFB: ${Formatter.toReadableTime(metrics.ttfb)}  TBT: ${Formatter.toReadableTime(metrics.tbt)}  TTI: ${Formatter.toReadableTime(metrics.tti)}`,
          ].join("\n");
          await Clipboard.copy(summary);
          await showToast({
            style: Toast.Style.Success,
            title: "Score summary copied",
          });
        }}
      />

      <Action
        title="Change Api Key"
        icon={Icon.Key}
        shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        onAction={openExtensionPreferences}
      />
    </ActionPanel>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── Results View ──────────────────────────────────────────────────
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ResultsViewProps {
  metrics: Metrics;
  url: string;
  strategy: Strategy;
  delta: ScoreDelta | null;
  onBack: () => void;
  onSwitchStrategy: (s: Strategy) => void;
}

function ResultsView({
  metrics,
  url,
  strategy,
  delta,
  onBack,
  onSwitchStrategy,
}: ResultsViewProps) {
  const strategyLabel = strategy === "mobile" ? "Mobile" : "Desktop";
  const strategyIcon = strategy === "mobile" ? Icon.Mobile : Icon.Monitor;
  const hostname = Formatter.extractHostname(url);

  const actions = (
    <ResultsActions
      metrics={metrics}
      url={url}
      strategy={strategy}
      onBack={onBack}
      onSwitchStrategy={onSwitchStrategy}
    />
  );

  // ── Sidebar ─────────────────────────────────────────────────────
  // Shared detail panel shown on the right for every list item.
  // Sections: header → Lighthouse scores → Core Web Vitals → page weight.
  const Sidebar = useMemo(() => {
    // Rows for the scores section
    const scoreRows: [string, number, number | undefined][] = [
      ["Performance", metrics.performanceScore, delta?.performance],
      ["Accessibility", metrics.accessibilityScore, delta?.accessibility],
      ["Best Practices", metrics.bestPracticesScore, delta?.bestPractices],
      ["SEO", metrics.seoScore, delta?.seo],
    ];

    // Rows for the Core Web Vitals section
    const vitalRows: [string, number, MetricName][] = [
      ["First Contentful Paint", metrics.fcp, "fcp"],
      ["Largest Contentful Paint", metrics.lcp, "lcp"],
      ["Cumulative Layout Shift", metrics.cls, "cls"],
      ["Time to First Byte", metrics.ttfb, "ttfb"],
      ["Time to Interactive", metrics.tti, "tti"],
      ["Total Blocking Time", metrics.tbt, "tbt"],
      ["Speed Index", metrics.speedIndex, "speedIndex"],
      ...(metrics.inp > 0
        ? ([["Interaction to Next Paint", metrics.inp, "inp"]] as [
            string,
            number,
            MetricName,
          ][])
        : []),
    ];

    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            {/* ── Header ── */}
            <List.Item.Detail.Metadata.Label
              title="Domain"
              text={hostname}
              icon={Icon.Globe}
            />
            <List.Item.Detail.Metadata.Label
              title="Strategy"
              text={strategyLabel}
              icon={strategyIcon}
            />

            <List.Item.Detail.Metadata.Separator />

            {/* ── Lighthouse Scores ── */}
            {scoreRows.map(([label, score, d]) => (
              <List.Item.Detail.Metadata.TagList
                key={`score-${label}`}
                title={label}
              >
                <List.Item.Detail.Metadata.TagList.Item
                  text={`${score}/100`}
                  color={Formatter.toScoreColor(score)}
                />
                <List.Item.Detail.Metadata.TagList.Item
                  text={Formatter.toScoreLabel(score)}
                  color={Formatter.toScoreColor(score)}
                />
                {d !== undefined && d !== 0 && (
                  <List.Item.Detail.Metadata.TagList.Item
                    text={Formatter.toDeltaLabel(d)}
                    color={Formatter.toDeltaColor(d)}
                  />
                )}
                {d === 0 && (
                  <List.Item.Detail.Metadata.TagList.Item
                    text="—"
                    color={Color.SecondaryText}
                  />
                )}
              </List.Item.Detail.Metadata.TagList>
            ))}

            <List.Item.Detail.Metadata.Separator />

            {/* ── Core Web Vitals ── */}
            {vitalRows.map(([label, value, metric]) => (
              <List.Item.Detail.Metadata.TagList
                key={`vital-${metric}`}
                title={label}
              >
                <List.Item.Detail.Metadata.TagList.Item
                  text={
                    metric === "cls"
                      ? Formatter.toReadableCls(value)
                      : Formatter.toReadableTime(value)
                  }
                  color={Formatter.toMetricColor(metric, value)}
                />
                <List.Item.Detail.Metadata.TagList.Item
                  text={Formatter.toMetricRating(metric, value)}
                  color={Formatter.toMetricColor(metric, value)}
                />
              </List.Item.Detail.Metadata.TagList>
            ))}

            <List.Item.Detail.Metadata.Separator />

            {/* ── Page Weight ── */}
            <List.Item.Detail.Metadata.Label
              title="Total Requests"
              text={Formatter.toFormattedNumber(metrics.totalRequests)}
              icon={Icon.Download}
            />
            <List.Item.Detail.Metadata.Label
              title="Transfer Size"
              text={Formatter.toReadableSize(metrics.totalSizeBytes)}
              icon={Icon.HardDrive}
            />
            <List.Item.Detail.Metadata.Label
              title="DOM Elements"
              text={Formatter.toFormattedNumber(metrics.domSize)}
              icon={Icon.CodeBlock}
            />

            {metrics.renderBlockingCount > 0 && (
              <List.Item.Detail.Metadata.TagList title="Render Blocking">
                <List.Item.Detail.Metadata.TagList.Item
                  text={`${metrics.renderBlockingCount} resource${metrics.renderBlockingCount > 1 ? "s" : ""}`}
                  color={Color.Red}
                />
              </List.Item.Detail.Metadata.TagList>
            )}
          </List.Item.Detail.Metadata>
        }
      />
    );
  }, [metrics, hostname, strategyLabel, strategyIcon, delta]);

  // ── Score rows for the list ──────────────────────────────────────
  const scoreListRows: [string, number, number | undefined][] = [
    ["Performance", metrics.performanceScore, delta?.performance],
    ["Accessibility", metrics.accessibilityScore, delta?.accessibility],
    ["Best Practices", metrics.bestPracticesScore, delta?.bestPractices],
    ["SEO", metrics.seoScore, delta?.seo],
  ];

  // ── Vital rows for the list ──────────────────────────────────────
  const vitalListRows: [string, string, number, MetricName][] = [
    ["First Contentful Paint", "FCP", metrics.fcp, "fcp"],
    ["Largest Contentful Paint", "LCP", metrics.lcp, "lcp"],
    ["Cumulative Layout Shift", "CLS", metrics.cls, "cls"],
    ["Time to First Byte", "TTFB", metrics.ttfb, "ttfb"],
    ["Time to Interactive", "TTI", metrics.tti, "tti"],
    ["Total Blocking Time", "TBT", metrics.tbt, "tbt"],
    ["Speed Index", "SI", metrics.speedIndex, "speedIndex"],
    ...(metrics.inp > 0
      ? ([["Interaction to Next Paint", "INP", metrics.inp, "inp"]] as [
          string,
          string,
          number,
          MetricName,
        ][])
      : []),
  ];

  return (
    <List isShowingDetail navigationTitle={`${hostname} — ${strategyLabel}`}>
      {/* ━━━━ Lighthouse Scores ━━━━ */}
      <List.Section title="Lighthouse Scores">
        {scoreListRows.map(([label, score, d]) => (
          <List.Item
            key={`score-${label}`}
            title={label}
            icon={Formatter.toScoreIcon(score)}
            subtitle={`${score}/100`}
            accessories={[
              {
                tag: {
                  value: Formatter.toScoreLabel(score),
                  color: Formatter.toScoreColor(score),
                },
              },
              ...(d !== undefined && d !== 0
                ? [
                    {
                      tag: {
                        value: Formatter.toDeltaLabel(d),
                        color: Formatter.toDeltaColor(d),
                      },
                      tooltip: `Change from last run: ${Formatter.toDeltaLabel(d)}`,
                    },
                  ]
                : []),
            ]}
            detail={Sidebar}
            actions={actions}
          />
        ))}
      </List.Section>

      {/* ━━━━ Core Web Vitals ━━━━ */}
      <List.Section title="Core Web Vitals">
        {vitalListRows.map(([title, abbr, value, metric]) => (
          <List.Item
            key={`vital-${metric}`}
            title={title}
            icon={Formatter.toMetricIcon(metric, value)}
            subtitle={
              metric === "cls"
                ? Formatter.toReadableCls(value)
                : Formatter.toReadableTime(value)
            }
            accessories={[
              {
                tag: {
                  value: abbr,
                  color: Color.SecondaryText,
                },
              },
              {
                tag: {
                  value: Formatter.toMetricRating(metric, value),
                  color: Formatter.toMetricColor(metric, value),
                },
              },
            ]}
            detail={Sidebar}
            actions={actions}
          />
        ))}
      </List.Section>

      {/* ━━━━ Resource Breakdown ━━━━ */}
      {metrics.resourceBreakdown.length > 0 && (
        <List.Section title="Resource Breakdown">
          {metrics.resourceBreakdown.map((r) => (
            <List.Item
              key={`res-${r.resourceType}`}
              title={r.resourceType}
              icon={{ source: Icon.Box, tintColor: Color.PrimaryText }}
              subtitle={Formatter.toReadableSize(r.transferSize)}
              accessories={[
                {
                  tag: {
                    value: `${r.requestCount} req`,
                    color: Color.SecondaryText,
                  },
                },
              ]}
              detail={Sidebar}
              actions={actions}
            />
          ))}
        </List.Section>
      )}

      {/* ━━━━ Opportunities ━━━━ */}
      {metrics.opportunities.length > 0 && (
        <List.Section title="Opportunities">
          {metrics.opportunities.map((o) => (
            <List.Item
              key={`opp-${o.title}`}
              title={o.title}
              icon={{ source: Icon.LightBulb, tintColor: Color.Yellow }}
              subtitle={o.displayValue || undefined}
              accessories={
                o.score !== null
                  ? [
                      {
                        tag: {
                          value:
                            o.score === 0
                              ? "High Impact"
                              : o.score < 0.5
                                ? "Medium"
                                : "Low",
                          color:
                            o.score === 0
                              ? Color.Red
                              : o.score < 0.5
                                ? Color.Yellow
                                : Color.SecondaryText,
                        },
                      },
                    ]
                  : []
              }
              detail={Sidebar}
              actions={actions}
            />
          ))}
        </List.Section>
      )}

      {/* ━━━━ Diagnostics ━━━━ */}
      {metrics.diagnostics.length > 0 && (
        <List.Section title="Diagnostics">
          {metrics.diagnostics.map((d) => (
            <List.Item
              key={`diag-${d.title}`}
              title={d.title}
              icon={{ source: Icon.Info, tintColor: Color.Blue }}
              subtitle={d.displayValue || undefined}
              accessories={
                d.score !== null && d.score < 1
                  ? [
                      {
                        tag: {
                          value: d.score === 0 ? "Fail" : "Warn",
                          color: d.score === 0 ? Color.Red : Color.Yellow,
                        },
                      },
                    ]
                  : []
              }
              detail={Sidebar}
              actions={actions}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── Orchestration helper ──────────────────────────────────────────
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function runAnalysis(
  url: string,
  strategy: Strategy,
  setDelta: (d: ScoreDelta | null) => void,
): Promise<Metrics | null> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Analyzing…",
    message: url,
  });

  try {
    // Fetch previous snapshot BEFORE running so we can diff afterwards
    const previous = await reportService.getLast(url, strategy);

    const metrics = await pageSpeedService.fetchMetrics(url, strategy);
    const snapshot = metrics.toSnapshot(url, strategy);

    if (previous) {
      setDelta(ReportService.computeDelta(snapshot, previous));
    } else {
      setDelta(null);
    }

    // Persist snapshot + history (fire-and-forget — non-critical)
    reportService.save(snapshot).catch(() => undefined);
    historyService.save(url, strategy).catch(() => undefined);

    toast.style = Toast.Style.Success;
    toast.title = "Analysis Complete";
    toast.message = `Performance: ${metrics.performanceScore}/100`;

    return metrics;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    toast.style = Toast.Style.Failure;
    toast.title = "Analysis Failed";
    toast.message = message;
    return null;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── Utilities ─────────────────────────────────────────────────────
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHrs < 24) return `${diffHrs} hr${diffHrs !== 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
}
