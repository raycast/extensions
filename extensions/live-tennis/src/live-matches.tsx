import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import { BASE_URL, Match, Tour, getAuthHeaders, parseListResponse } from "./api";
import { TOUR_TITLES, capitalize, isBreakPoint, matchTitle, scoreSummary } from "./format";

const TOURS = Object.keys(TOUR_TITLES) as Tour[];

export default function LiveMatches() {
  const { refreshInterval } = getPreferenceValues<{ refreshInterval: string }>();
  const [tourFilter, setTourFilter] = useState<string>("all");
  const [showingDetail, setShowingDetail] = useState(false);

  const { isLoading, data, error, revalidate } = useFetch(`${BASE_URL}/matches?status=live&limit=200`, {
    headers: getAuthHeaders(),
    parseResponse: (response) => parseListResponse<Match>(response),
    keepPreviousData: true,
    failureToastOptions: { title: "Could not load live matches" },
  });

  // Honest auto-refresh: one request per tick, off by preference. The free tier
  // allows 100 requests/day, so the default is a full minute between refreshes.
  useEffect(() => {
    const seconds = Number(refreshInterval);
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return;
    }
    const timer = setInterval(() => revalidate(), seconds * 1000);
    return () => clearInterval(timer);
  }, [refreshInterval, revalidate]);

  // Match.tour uses the same vocabulary as the ?tour= filter, so filtering the
  // already-fetched page client-side avoids spending quota on every dropdown change.
  const matches = (data?.data ?? []).filter((match) => tourFilter === "all" || match.tour === tourFilter);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail && matches.length > 0}
      searchBarPlaceholder="Filter by player or tournament"
      searchBarAccessory={
        <List.Dropdown tooltip="Tour" storeValue onChange={setTourFilter}>
          <List.Dropdown.Item title="All Tours" value="all" />
          {TOURS.map((tour) => (
            <List.Dropdown.Item key={tour} title={TOUR_TITLES[tour]} value={tour} />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could Not Load Live Matches"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.EmptyView
            icon={Icon.Clock}
            title="No Matches in Play"
            description="Nobody is on court right now — check Upcoming Matches for what's next."
          />
          {matches.map((match) => (
            <MatchItem
              key={match.id}
              match={match}
              showingDetail={showingDetail}
              onToggleDetail={() => setShowingDetail((current) => !current)}
              onRefresh={revalidate}
            />
          ))}
        </>
      )}
    </List>
  );
}

function MatchItem(props: { match: Match; showingDetail: boolean; onToggleDetail: () => void; onRefresh: () => void }) {
  const { match, showingDetail, onToggleDetail, onRefresh } = props;
  const breakPoint = isBreakPoint(match.score);
  const summary = scoreSummary(match.score);

  const accessories: List.Item.Accessory[] = [];
  if (breakPoint) {
    accessories.push({ tag: { value: "BP", color: Color.Red }, tooltip: "Break point" });
  }
  if (!showingDetail) {
    if (summary) {
      accessories.push({ text: summary, tooltip: "Current score" });
    }
    if (match.tour) {
      accessories.push({ tag: TOUR_TITLES[match.tour] });
    }
  }

  return (
    <List.Item
      title={matchTitle(match)}
      subtitle={showingDetail ? undefined : [match.tournament, match.round].filter(Boolean).join(" · ")}
      icon={{ source: Icon.CircleFilled, tintColor: breakPoint ? Color.Red : Color.Green }}
      keywords={[match.tournament, match.players.p1.name, match.players.p2.name].filter(Boolean)}
      accessories={accessories}
      detail={<MatchDetail match={match} />}
      actions={
        <ActionPanel>
          <Action
            title={showingDetail ? "Hide Details" : "Show Details"}
            icon={Icon.Sidebar}
            onAction={onToggleDetail}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
          <Action.CopyToClipboard
            title="Copy Score"
            content={`${matchTitle(match)} — ${summary || "no score yet"}`}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function MatchDetail(props: { match: Match }) {
  const { match } = props;
  const { p1, p2 } = match.players;
  const score = match.score;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title={p1.name}
            text={playerLine(p1.ranking, score?.server === 1)}
            icon={score?.server === 1 ? { source: Icon.CircleFilled, tintColor: Color.Yellow } : undefined}
          />
          <List.Item.Detail.Metadata.Label
            title={p2.name}
            text={playerLine(p2.ranking, score?.server === 2)}
            icon={score?.server === 2 ? { source: Icon.CircleFilled, tintColor: Color.Yellow } : undefined}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Score" text={scoreSummary(score) || "Not started"} />
          {isBreakPoint(score) && (
            <List.Item.Detail.Metadata.TagList title="Alert">
              <List.Item.Detail.Metadata.TagList.Item text="Break Point" color={Color.Red} />
            </List.Item.Detail.Metadata.TagList>
          )}
          {score?.is_tiebreak && <List.Item.Detail.Metadata.Label title="Tiebreak" text="In progress" />}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Tournament" text={match.tournament} />
          {match.round && <List.Item.Detail.Metadata.Label title="Round" text={match.round} />}
          {match.tour && <List.Item.Detail.Metadata.Label title="Tour" text={TOUR_TITLES[match.tour]} />}
          {match.surface && (
            <List.Item.Detail.Metadata.Label
              title="Surface"
              text={`${capitalize(match.surface)}${match.indoor ? " (indoor)" : ""}`}
            />
          )}
          {match.format && (
            <List.Item.Detail.Metadata.Label title="Format" text={`Best of ${match.format === "BO5" ? 5 : 3}`} />
          )}
          {match.is_doubles && <List.Item.Detail.Metadata.Label title="Draw" text="Doubles" />}
          {match.event_status && <List.Item.Detail.Metadata.Label title="Status" text={match.event_status} />}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function playerLine(ranking: number | null, serving: boolean): string {
  const parts: string[] = [];
  if (ranking != null) {
    parts.push(`#${ranking}`);
  }
  if (serving) {
    parts.push("serving");
  }
  return parts.join(" · ") || "—";
}
