import { Action, ActionPanel, Icon, LaunchType, List, Toast, launchCommand, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AIGatewayError,
  fetchLeaderboard,
  fetchModelCatalog,
  formatDate,
  formatShare,
  getModelPageUrl,
  getProviderIcon,
  type AIGatewayModel,
  type DailyShareLeaderboard,
  type LeaderboardDataset,
  type LeaderboardExport,
  type LeaderboardMetric,
  type LeaderboardModality,
  type LeaderboardProviderRanking,
  type ProviderLeaderboard,
  type RankedProviderRow,
} from "./ai-gateway";

type DailyDataset = "models" | "labs";
type Lookback = "2w" | "1m" | "2m";

interface RankedShare {
  name: string;
  rank: number;
  sharePercent: number;
  previousDate?: string;
  previousRank?: number;
  previousSharePercent?: number;
}

const LEADERBOARD_PAGES: Record<LeaderboardDataset, string> = {
  models: "https://vercel.com/ai-gateway/leaderboards/models",
  labs: "https://vercel.com/ai-gateway/leaderboards/labs",
  providers: "https://vercel.com/ai-gateway/leaderboards/providers",
};

const LOOKBACK_DAYS: Record<Lookback, number> = {
  "2w": 14,
  "1m": 30,
  "2m": 60,
};

const LOOKBACK_LABELS: Record<Lookback, string> = {
  "2w": "2 Weeks",
  "1m": "1 Month",
  "2m": "2 Months",
};

const MODALITY_LABELS: Record<LeaderboardModality, string> = {
  all: "All",
  text: "Text",
  image: "Image",
  video: "Video",
};

const METRIC_LABELS: Record<LeaderboardMetric, string> = {
  tokens: "Token Volume",
  requests: "Requests",
  spend: "Spend",
  imageCount: "Images",
  videoCount: "Videos",
};

const PROVIDER_RANKINGS: LeaderboardProviderRanking[] = ["Token Volume", "Spend"];
const MODALITIES: LeaderboardModality[] = ["all", "text", "image", "video"];
const LOOKBACKS: Lookback[] = ["2w", "1m", "2m"];

function metricsForModality(modality: LeaderboardModality): LeaderboardMetric[] {
  switch (modality) {
    case "all":
    case "text":
      return ["tokens", "requests", "spend"];
    case "image":
      return ["imageCount", "requests", "spend"];
    case "video":
      return ["videoCount", "requests", "spend"];
    default: {
      const exhaustiveCheck: never = modality;
      return exhaustiveCheck;
    }
  }
}

function defaultMetric(modality: LeaderboardModality): LeaderboardMetric {
  switch (modality) {
    case "all":
    case "text":
      return "tokens";
    case "image":
      return "imageCount";
    case "video":
      return "videoCount";
    default: {
      const exhaustiveCheck: never = modality;
      return exhaustiveCheck;
    }
  }
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof AIGatewayError || error instanceof Error) {
    return error.message;
  }
  return fallback;
}

function ToggleDetailsAction({ isShowingDetail, onToggle }: { isShowingDetail: boolean; onToggle: () => void }) {
  return (
    <Action
      title={isShowingDetail ? "Hide Details" : "Show Details"}
      icon={isShowingDetail ? Icon.EyeDisabled : Icon.Eye}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "d" },
        Windows: { modifiers: ["ctrl", "shift"], key: "d" },
      }}
      onAction={onToggle}
    />
  );
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase().replaceAll(/\s+/g, " ");
}

function subtractDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

function signedShareChange(change: number): string {
  if (change === 0) return "No change";
  return `${change > 0 ? "+" : "−"}${formatShare(Math.abs(change))} pts`;
}

function rankMovement(currentRank: number, previousRank: number): string {
  const movement = previousRank - currentRank;
  if (movement === 0) return "No change";
  return `${movement > 0 ? "↑" : "↓"} ${Math.abs(movement)}`;
}

function rankDailyShares(
  leaderboard: DailyShareLeaderboard,
  metric: LeaderboardMetric,
  lookback: Lookback,
): { currentDate?: string; rows: RankedShare[] } {
  const metricRows = leaderboard.rows.filter((row) => row.metric === metric);
  const dates = Array.from(new Set(metricRows.map((row) => row.date))).sort();
  const currentDate = dates.at(-1);
  if (!currentDate) return { rows: [] };

  const boundary = subtractDays(currentDate, LOOKBACK_DAYS[lookback]);
  const previousDate = dates.filter((date) => date <= boundary).at(-1);
  const currentRows = metricRows
    .filter((row) => row.date === currentDate)
    .sort((left, right) => right.sharePercent - left.sharePercent || left.name.localeCompare(right.name));
  const previousRows = previousDate
    ? metricRows
        .filter((row) => row.date === previousDate)
        .sort((left, right) => right.sharePercent - left.sharePercent || left.name.localeCompare(right.name))
    : [];
  const previousByName = new Map(
    previousRows.map((row, index) => [row.name, { rank: index + 1, sharePercent: row.sharePercent }]),
  );

  return {
    currentDate,
    rows: currentRows.map((row, index) => {
      const previous = previousByName.get(row.name);
      return {
        name: row.name,
        rank: index + 1,
        sharePercent: row.sharePercent,
        previousDate: previous ? previousDate : undefined,
        previousRank: previous?.rank,
        previousSharePercent: previous?.sharePercent,
      };
    }),
  };
}

function uniqueCatalogMatches(models: AIGatewayModel[]): Map<string, AIGatewayModel> {
  const matches = new Map<string, AIGatewayModel[]>();
  for (const model of models) {
    const key = normalizeName(model.name);
    matches.set(key, [...(matches.get(key) ?? []), model]);
  }

  return new Map(
    Array.from(matches.entries())
      .filter((entry): entry is [string, [AIGatewayModel]] => entry[1].length === 1)
      .map(([name, match]) => [name, match[0]]),
  );
}

function isDailyLeaderboard(
  value: LeaderboardExport | undefined,
  dataset: DailyDataset,
): value is DailyShareLeaderboard {
  return value?.dataset === dataset;
}

function FilterSubmenus({
  view,
  metric,
  modality,
  lookback,
  rankedBy,
  onMetricChange,
  onModalityChange,
  onLookbackChange,
  onRankedByChange,
}: {
  view: LeaderboardDataset;
  metric: LeaderboardMetric;
  modality: LeaderboardModality;
  lookback: Lookback;
  rankedBy: LeaderboardProviderRanking;
  onMetricChange: (metric: LeaderboardMetric) => void;
  onModalityChange: (modality: LeaderboardModality) => void;
  onLookbackChange: (lookback: Lookback) => void;
  onRankedByChange: (rankedBy: LeaderboardProviderRanking) => void;
}) {
  if (view === "providers") {
    return (
      <ActionPanel.Submenu title={`Ranked by: ${rankedBy}`} icon={Icon.List}>
        {PROVIDER_RANKINGS.map((option) => (
          <Action
            key={option}
            title={option}
            icon={option === rankedBy ? Icon.CheckCircle : Icon.List}
            onAction={() => onRankedByChange(option)}
          />
        ))}
      </ActionPanel.Submenu>
    );
  }

  return (
    <>
      <ActionPanel.Submenu title={`Metric: ${METRIC_LABELS[metric]}`} icon={Icon.List}>
        {metricsForModality(modality).map((option) => (
          <Action
            key={option}
            title={METRIC_LABELS[option]}
            icon={option === metric ? Icon.CheckCircle : Icon.List}
            onAction={() => onMetricChange(option)}
          />
        ))}
      </ActionPanel.Submenu>
      <ActionPanel.Submenu title={`Modality: ${MODALITY_LABELS[modality]}`} icon={Icon.List}>
        {MODALITIES.map((option) => (
          <Action
            key={option}
            title={MODALITY_LABELS[option]}
            icon={option === modality ? Icon.CheckCircle : Icon.List}
            onAction={() => onModalityChange(option)}
          />
        ))}
      </ActionPanel.Submenu>
      <ActionPanel.Submenu title={`Lookback: ${LOOKBACK_LABELS[lookback]}`} icon={Icon.List}>
        {LOOKBACKS.map((option) => (
          <Action
            key={option}
            title={LOOKBACK_LABELS[option]}
            icon={option === lookback ? Icon.CheckCircle : Icon.List}
            onAction={() => onLookbackChange(option)}
          />
        ))}
      </ActionPanel.Submenu>
    </>
  );
}

function Attribution({ license, licenseUrl }: { license: string; licenseUrl: string }) {
  return (
    <List.Item.Detail.Metadata.Link
      title="Attribution"
      target={licenseUrl}
      text={`Vercel AI Gateway leaderboard data · ${license}`}
    />
  );
}

function DailyDetail({
  row,
  dataset,
  currentDate,
  metric,
  modality,
  license,
  licenseUrl,
}: {
  row: RankedShare;
  dataset: DailyDataset;
  currentDate: string;
  metric: LeaderboardMetric;
  modality: LeaderboardModality;
  license: string;
  licenseUrl: string;
}) {
  const shareChange = row.previousSharePercent === undefined ? undefined : row.sharePercent - row.previousSharePercent;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title={dataset === "models" ? "Model" : "Creator"} text={row.name} />
          <List.Item.Detail.Metadata.Label title="Rank" text={`#${row.rank}`} />
          <List.Item.Detail.Metadata.Label title="Current Share" text={formatShare(row.sharePercent)} />
          {row.previousSharePercent !== undefined && (
            <List.Item.Detail.Metadata.Label title="Previous Share" text={formatShare(row.previousSharePercent)} />
          )}
          {shareChange !== undefined && (
            <List.Item.Detail.Metadata.Label title="Share Change" text={signedShareChange(shareChange)} />
          )}
          {row.previousRank !== undefined && (
            <List.Item.Detail.Metadata.Label title="Rank Movement" text={rankMovement(row.rank, row.previousRank)} />
          )}
          <List.Item.Detail.Metadata.Label
            title="Date Range"
            text={
              row.previousDate
                ? `${formatDate(row.previousDate)} – ${formatDate(currentDate)}`
                : formatDate(currentDate)
            }
          />
          <List.Item.Detail.Metadata.Label title="Metric" text={METRIC_LABELS[metric]} />
          <List.Item.Detail.Metadata.Label title="Modality" text={MODALITY_LABELS[modality]} />
          <List.Item.Detail.Metadata.Separator />
          <Attribution license={license} licenseUrl={licenseUrl} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function ProviderDetail({
  provider,
  license,
  licenseUrl,
}: {
  provider: RankedProviderRow;
  license: string;
  licenseUrl: string;
}) {
  return (
    <List.Item.Detail
      markdown={provider.description}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Provider" text={provider.name} />
          <List.Item.Detail.Metadata.Label title="Rank" text={`#${provider.rank}`} />
          <List.Item.Detail.Metadata.Label title="Ranked By" text={provider.rankedBy} />
          {provider.url && <List.Item.Detail.Metadata.Link title="Website" target={provider.url} text={provider.url} />}
          <List.Item.Detail.Metadata.Separator />
          <Attribution license={license} licenseUrl={licenseUrl} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function ViewDropdown({
  value,
  onChange,
}: {
  value: LeaderboardDataset;
  onChange: (view: LeaderboardDataset) => void;
}) {
  return (
    <List.Dropdown value={value} tooltip="Leaderboard View" onChange={(next) => onChange(next as LeaderboardDataset)}>
      <List.Dropdown.Item title="Models" value="models" />
      <List.Dropdown.Item title="Labs (Creators)" value="labs" />
      <List.Dropdown.Item title="Providers" value="providers" />
    </List.Dropdown>
  );
}

export default function Command() {
  const [view, setView] = useState<LeaderboardDataset>("models");
  const [metric, setMetric] = useState<LeaderboardMetric>("tokens");
  const [modality, setModality] = useState<LeaderboardModality>("all");
  const [lookback, setLookback] = useState<Lookback>("2w");
  const [rankedBy, setRankedBy] = useState<LeaderboardProviderRanking>("Token Volume");
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const previousDailyData = useRef<Record<DailyDataset, Partial<Record<LeaderboardModality, DailyShareLeaderboard>>>>({
    models: {},
    labs: {},
  });
  const previousProviderData = useRef<ProviderLeaderboard | undefined>(undefined);

  const {
    data: fetchedLeaderboard,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(fetchLeaderboard, [view, view === "providers" ? undefined : modality], {
    keepPreviousData: true,
  });
  const { data: catalog, error: catalogError } = useCachedPromise(fetchModelCatalog, [], { keepPreviousData: true });

  useEffect(() => {
    if (fetchedLeaderboard?.dataset === "providers") {
      previousProviderData.current = fetchedLeaderboard;
    } else if (fetchedLeaderboard) {
      previousDailyData.current[fetchedLeaderboard.dataset][fetchedLeaderboard.modality] = fetchedLeaderboard;
    }
  }, [fetchedLeaderboard]);

  useEffect(() => {
    if (error) {
      void showToast({
        style: Toast.Style.Failure,
        title: "Couldn’t Refresh Leaderboard",
        message: errorMessage(error, "The leaderboard request failed."),
      });
    }
  }, [error]);

  useEffect(() => {
    if (view === "models" && catalogError) {
      void showToast({
        style: Toast.Style.Failure,
        title: "Model Catalog Unavailable",
        message: errorMessage(catalogError, "Model actions and catalog search are unavailable."),
      });
    }
  }, [catalogError, view]);

  const matchingDailyLeaderboard =
    view !== "providers" && fetchedLeaderboard?.dataset === view && fetchedLeaderboard.modality === modality
      ? fetchedLeaderboard
      : undefined;
  const matchingProviderLeaderboard =
    view === "providers" && fetchedLeaderboard?.dataset === "providers" ? fetchedLeaderboard : undefined;
  const leaderboard =
    view === "providers"
      ? (matchingProviderLeaderboard ?? previousProviderData.current)
      : (matchingDailyLeaderboard ?? previousDailyData.current[view][modality]);
  const catalogMatches = useMemo(() => uniqueCatalogMatches(catalog?.data ?? []), [catalog]);

  const changeModality = (nextModality: LeaderboardModality) => {
    setModality(nextModality);
    if (!metricsForModality(nextModality).includes(metric)) {
      setMetric(defaultMetric(nextModality));
    }
  };

  const filterProps = {
    view,
    metric,
    modality,
    lookback,
    rankedBy,
    onMetricChange: setMetric,
    onModalityChange: changeModality,
    onLookbackChange: setLookback,
    onRankedByChange: setRankedBy,
  };

  const dailyLeaderboard =
    view === "models" || view === "labs"
      ? isDailyLeaderboard(leaderboard, view)
        ? leaderboard
        : undefined
      : undefined;
  const rankedShares = dailyLeaderboard ? rankDailyShares(dailyLeaderboard, metric, lookback) : { rows: [] };
  const currentDate = rankedShares.currentDate;
  const providers =
    view === "providers" && leaderboard?.dataset === "providers"
      ? leaderboard.rows.filter((provider) => provider.rankedBy === rankedBy).sort((a, b) => a.rank - b.rank)
      : [];
  const hasItems = view === "providers" ? providers.length > 0 : rankedShares.rows.length > 0;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder={`Search ${view === "labs" ? "creators" : view}...`}
      searchBarAccessory={<ViewDropdown value={view} onChange={setView} />}
    >
      {!hasItems && !isLoading && (
        <List.EmptyView
          icon={Icon.Globe}
          title={error ? "Couldn’t Load Leaderboard" : "No Leaderboard Entries"}
          description={
            error
              ? errorMessage(error, "The leaderboard request failed.")
              : "The public leaderboard returned no entries for these filters."
          }
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.Globe} onAction={revalidate} />
              <FilterSubmenus {...filterProps} />
              <ToggleDetailsAction
                isShowingDetail={isShowingDetail}
                onToggle={() => setIsShowingDetail((current) => !current)}
              />
            </ActionPanel>
          }
        />
      )}

      {view === "providers" &&
        leaderboard?.dataset === "providers" &&
        providers.map((provider) => (
          <List.Item
            key={`${provider.rankedBy}:${provider.rank}:${provider.name}`}
            icon={getProviderIcon(provider.name)}
            title={provider.name}
            subtitle={provider.description}
            keywords={[provider.name, provider.description ?? ""]}
            accessories={[{ text: `#${provider.rank}` }]}
            detail={
              <ProviderDetail provider={provider} license={leaderboard.license} licenseUrl={leaderboard.licenseUrl} />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Provider" content={provider.name} />
                {provider.url && <Action.OpenInBrowser title="Open Provider Website" url={provider.url} />}
                <Action.OpenInBrowser title="Open Provider Leaderboard" url={LEADERBOARD_PAGES.providers} />
                <ActionPanel.Section title="Filters">
                  <FilterSubmenus {...filterProps} />
                </ActionPanel.Section>
                <ToggleDetailsAction
                  isShowingDetail={isShowingDetail}
                  onToggle={() => setIsShowingDetail((current) => !current)}
                />
              </ActionPanel>
            }
          />
        ))}

      {(view === "models" || view === "labs") &&
        dailyLeaderboard &&
        currentDate &&
        rankedShares.rows.map((row) => {
          const catalogModel = view === "models" ? catalogMatches.get(normalizeName(row.name)) : undefined;
          const shareChange =
            row.previousSharePercent === undefined ? undefined : row.sharePercent - row.previousSharePercent;
          const movement = row.previousRank === undefined ? undefined : rankMovement(row.rank, row.previousRank);

          return (
            <List.Item
              key={`${dailyLeaderboard.modality}:${metric}:${row.rank}:${row.name}`}
              icon={
                view === "models"
                  ? catalogModel
                    ? getProviderIcon(catalogModel.ownedBy, Icon.Stars)
                    : Icon.Stars
                  : getProviderIcon(row.name)
              }
              title={row.name}
              subtitle={catalogModel?.id}
              keywords={catalogModel ? [row.name, catalogModel.id, catalogModel.ownedBy] : [row.name]}
              accessories={[
                { text: `#${row.rank}` },
                { text: formatShare(row.sharePercent) },
                ...(movement ? [{ text: movement }] : []),
              ]}
              detail={
                <DailyDetail
                  row={row}
                  dataset={view}
                  currentDate={currentDate}
                  metric={metric}
                  modality={dailyLeaderboard.modality}
                  license={dailyLeaderboard.license}
                  licenseUrl={dailyLeaderboard.licenseUrl}
                />
              }
              actions={
                <ActionPanel>
                  {view === "models" && catalogModel?.type?.toLocaleLowerCase() === "language" && (
                    <Action
                      icon={Icon.Play}
                      title="Use in AI Gateway Playground"
                      onAction={() =>
                        launchCommand({
                          name: "ai-gateway-playground",
                          type: LaunchType.UserInitiated,
                          context: { modelId: catalogModel.id },
                        })
                      }
                    />
                  )}
                  {view === "models" && catalogModel && (
                    <Action
                      icon={Icon.MagnifyingGlass}
                      title="Open in AI Gateway Model Search"
                      onAction={() =>
                        launchCommand({
                          name: "search-ai-gateway-models",
                          type: LaunchType.UserInitiated,
                          context: { modelId: catalogModel.id },
                        })
                      }
                    />
                  )}
                  {view === "models" && catalogModel && (
                    <Action.OpenInBrowser title="Open Model Page" url={getModelPageUrl(catalogModel.id)} />
                  )}
                  {view === "models" && catalogModel && (
                    <Action.CopyToClipboard title="Copy Model ID" content={catalogModel.id} />
                  )}
                  {view === "labs" && <Action.CopyToClipboard title="Copy Creator" content={row.name} />}
                  {view === "labs" && (
                    <Action.OpenInBrowser title="Open Labs Leaderboard" url={LEADERBOARD_PAGES.labs} />
                  )}
                  <ActionPanel.Section title="Filters">
                    <FilterSubmenus {...filterProps} />
                  </ActionPanel.Section>
                  {shareChange !== undefined && (
                    <Action.CopyToClipboard title="Copy Share Change" content={signedShareChange(shareChange)} />
                  )}
                  <ToggleDetailsAction
                    isShowingDetail={isShowingDetail}
                    onToggle={() => setIsShowingDetail((current) => !current)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
