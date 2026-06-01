import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Image,
  LaunchProps,
  LaunchType,
  List,
} from "@raycast/api";
import { createDeeplink, useFetch } from "@raycast/utils";
import { useState } from "react";
import type {
  EspnTeam,
  GamelogResponse,
  OverviewResponse,
  RosterApiResponse,
  RosterGroup,
  RosterPlayer,
  ScheduleEvent,
  ScheduleResponse,
  SearchApiResponse,
  SearchContent,
  StatsBlock,
} from "./types";

// ─── Deeplink / quicklink context ─────────────────────────────────────────────

// Serialized into a deeplink so a quicklink relaunches this command straight
// into the matching detail page.
type SearchLaunchContext =
  | {
      kind: "team";
      teamId: string;
      teamName: string;
      teamLogoUrl?: string;
      sport: string;
      league: string;
      espnUrl?: string;
    }
  | {
      kind: "player";
      playerId: string;
      playerName: string;
      headshot?: string;
      sport: string;
      league: string;
      teamName?: string;
      espnUrl?: string;
    };

function quicklinkFor(
  name: string,
  context: SearchLaunchContext,
): { name: string; link: string } {
  return {
    name,
    // userInitiated brings Raycast to the foreground on launch; without it the
    // quicklink can run without surfacing the window.
    link: createDeeplink({
      command: "search-teams",
      launchType: LaunchType.UserInitiated,
      context,
    }),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractEspnId(webUrl: string | undefined): string | undefined {
  if (!webUrl) return undefined;
  return webUrl.match(/\/_\/id\/(\d+)/)?.[1];
}

// Search results carry the numeric id in the uid (e.g. "s:40~l:46~t:13" for a
// team, "~a:1966" for an athlete). Team links don't include an /_/id/ segment,
// so the uid is the only reliable source for team ids.
function uidId(uid: string | undefined, key: "t" | "a"): string | undefined {
  return uid?.match(new RegExp(`~${key}:(\\d+)`))?.[1];
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return "-";
  }
}

function parseScore(
  score: string | { displayValue: string } | undefined,
): string {
  if (score === undefined || score === null) return "-";
  if (typeof score === "string") return score;
  return score.displayValue ?? "-";
}

// Resize ESPN CDN images (headshots, team logos) through the combiner so they
// don't render at their full multi-hundred-pixel source size in markdown.
function sizedEspnImage(
  url: string | undefined,
  w: number,
  h: number,
): string | undefined {
  if (!url) return undefined;
  const m = url.match(/^https:\/\/a\.espncdn\.com(\/i\/.+\.(?:png|jpg))$/i);
  if (m) return `https://a.espncdn.com/combiner/i?img=${m[1]}&w=${w}&h=${h}`;
  return url;
}

// Flatten the roster response — some sports group athletes by position unit,
// others return a plain flat array.
function extractRosterGroups(
  athletes: RosterApiResponse["athletes"],
): Array<{ section: string | undefined; players: RosterPlayer[] }> {
  if (!athletes?.length) return [];
  const first = athletes[0];
  if ("items" in first) {
    return (athletes as RosterGroup[]).map((g) => ({
      section: g.position,
      players: g.items ?? [],
    }));
  }
  return [{ section: undefined, players: athletes as RosterPlayer[] }];
}

// The team schedule endpoint nests game status under the competition, not the
// event — event.status is absent here. Read the competition first, fall back to
// the event-level status used by other endpoints.
function eventStatusName(event: ScheduleEvent): string {
  return (
    event.competitions?.[0]?.status?.type?.name ??
    event.status?.type?.name ??
    ""
  );
}

// Only genuinely scheduled future games — excludes postponed/cancelled
function isUpcoming(event: ScheduleEvent): boolean {
  return eventStatusName(event) === "STATUS_SCHEDULED";
}

function isCompleted(event: ScheduleEvent): boolean {
  return eventStatusName(event).startsWith("STATUS_FINAL");
}

function getFirstStatsBlock(
  statistics: OverviewResponse["statistics"],
): StatsBlock | undefined {
  if (!statistics) return undefined;
  return Array.isArray(statistics) ? statistics[0] : statistics;
}

// ─── Icon helpers ─────────────────────────────────────────────────────────────

function headshotIcon(headshot: { href: string } | undefined): Image.ImageLike {
  if (headshot?.href) return { source: headshot.href, mask: Image.Mask.Circle };
  return { source: Icon.Person, tintColor: Color.SecondaryText };
}

function searchIcon(item: SearchContent): Image.ImageLike {
  if (item.image?.default)
    return { source: item.image.default, mask: Image.Mask.Circle };
  if (item.type === "team") return { source: Icon.Dot, tintColor: Color.Blue };
  return { source: Icon.Person, tintColor: Color.SecondaryText };
}

// ─── Team markdown ────────────────────────────────────────────────────────────

interface TeamBio {
  name: string;
  logo?: string;
  record?: string;
  standing?: string;
  season?: string;
  espnUrl?: string;
}

function buildTeamMarkdown(
  teamId: string,
  bio: TeamBio,
  events: ScheduleEvent[],
): string {
  // Sort ascending by date — events may be merged from two endpoints (soccer)
  // and arrive out of order.
  const sorted = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const upcoming = sorted.filter(isUpcoming).slice(0, 8);
  const completed = sorted.filter(isCompleted).slice(-5).reverse();

  // Header: logo on the left, identity on the right (mirrors the player page) so
  // the top is balanced instead of a lone oversized logo, and the schedule
  // tables below get the full width with no sidebar.
  let md = "";
  const sizedLogo = sizedEspnImage(bio.logo, 110, 110);
  const bioLines = [
    `**${bio.name}**`,
    [bio.record, bio.standing].filter(Boolean).join(" · ") || undefined,
    bio.season,
    bio.espnUrl ? `[View on ESPN](${bio.espnUrl})` : undefined,
  ].filter(Boolean);

  if (sizedLogo) {
    md += `| ![Logo](${sizedLogo}) | ${bioLines.join("<br/>")} |\n`;
    md += `| :-- | :-- |\n\n`;
  } else if (bioLines.length) {
    md += `${bioLines.join(" · ")}\n\n`;
  }

  if (upcoming.length > 0) {
    md += "## Upcoming Games\n\n";
    md += "| Date | Time | Opponent | Venue |\n";
    md += "|------|------|----------|-------|\n";
    for (const ev of upcoming) {
      const comp = ev.competitions[0];
      const us = comp?.competitors.find((c) => c.team.id === teamId);
      const opp = comp?.competitors.find((c) => c.team.id !== teamId);
      if (!opp) continue;
      const date = formatDate(ev.date);
      const time = formatTime(ev.date);
      const isHome = us?.homeAway === "home";
      const oppLabel = isHome
        ? `vs ${opp.team.displayName}`
        : `@ ${opp.team.displayName}`;
      const venue = comp?.venue?.fullName ?? (isHome ? "Home" : "Away");
      md += `| ${date} | ${time} | ${oppLabel} | ${venue} |\n`;
    }
    md += "\n";
  }

  if (completed.length > 0) {
    md += "## Recent Results\n\n";
    md += "| Date | Opponent | Result | Score |\n";
    md += "|------|----------|--------|-------|\n";
    for (const ev of completed) {
      const comp = ev.competitions[0];
      const us = comp?.competitors.find((c) => c.team.id === teamId);
      const opp = comp?.competitors.find((c) => c.team.id !== teamId);
      if (!opp) continue;
      const date = formatDate(ev.date);
      const isHome = us?.homeAway === "home";
      const oppLabel = isHome
        ? `vs ${opp.team.abbreviation}`
        : `@ ${opp.team.abbreviation}`;
      const result =
        us?.winner === true ? "W" : us?.winner === false ? "L" : "-";
      const usScore = parseScore(us?.score);
      const oppScore = parseScore(opp?.score);
      const score =
        usScore !== "-" && oppScore !== "-" ? `${usScore}–${oppScore}` : "-";
      md += `| ${date} | ${oppLabel} | **${result}** | ${score} |\n`;
    }
    md += "\n";
  }

  if (upcoming.length === 0 && completed.length === 0) {
    md += "*No schedule data available.*\n";
  }

  return md;
}

// ─── Player markdown ──────────────────────────────────────────────────────────

interface PlayerBio {
  name: string;
  headshot?: string;
  teamName?: string;
  position?: string;
  jersey?: string;
  espnUrl?: string;
}

function buildPlayerMarkdown(
  bio: PlayerBio,
  overviewData: OverviewResponse | undefined,
  gamelogData: GamelogResponse | undefined,
): string {
  let md = "";

  // Header: headshot on the left, identity on the right, so the top of the page
  // fills the full width instead of a lone headshot. Detail.Metadata can't hold
  // an image, so this lives in the markdown (and lets the tables below use the
  // whole pane rather than being squished by a sidebar).
  const sized = sizedEspnImage(bio.headshot, 150, 110);
  const bioLines = [
    `**${bio.name}**`,
    bio.teamName,
    [bio.position, bio.jersey ? `#${bio.jersey}` : undefined]
      .filter(Boolean)
      .join(" · ") || undefined,
    bio.espnUrl ? `[View on ESPN](${bio.espnUrl})` : undefined,
  ].filter(Boolean);

  if (sized) {
    md += `| ![Headshot](${sized}) | ${bioLines.join("<br/>")} |\n`;
    md += `| :-- | :-- |\n\n`;
  } else if (bioLines.length) {
    md += `${bioLines.join(" · ")}\n\n`;
  }

  // Season stats as a compact 2-row table (headers + values)
  const statsBlock = getFirstStatsBlock(overviewData?.statistics);
  const seasonSplit =
    statsBlock?.splits?.find((s) =>
      s.displayName?.toLowerCase().includes("regular"),
    ) ?? statsBlock?.splits?.[0];

  if (statsBlock?.labels?.length && seasonSplit?.stats?.length) {
    md += `## ${statsBlock.displayName ?? "Season Stats"}\n\n`;
    md += `| ${statsBlock.labels.join(" | ")} |\n`;
    md += `| ${statsBlock.labels.map(() => "---").join(" | ")} |\n`;
    md += `| ${seasonSplit.stats.map((v) => String(v ?? "-")).join(" | ")} |\n\n`;
  }

  // Per-game log — use overview.gameLog when individual stats are available (e.g. MLB)
  const gameLogGroup = overviewData?.gameLog?.statistics?.[0];
  const hasPerGameStats =
    gameLogGroup?.labels?.length && gameLogGroup.events?.length;

  if (hasPerGameStats) {
    const labels = gameLogGroup!.labels!;
    const events = gameLogGroup!.events!;
    const title = gameLogGroup?.displayName ?? "Recent Games";

    const rows: Array<{
      date: string;
      opp: string;
      result: string;
      stats: string[];
    }> = [];

    for (const ev of events) {
      const meta = gamelogData?.events?.[ev.eventId];
      if (!meta?.gameDate) continue;
      rows.push({
        date: formatDate(meta.gameDate),
        opp:
          meta.atVs && meta.opponent
            ? `${meta.atVs} ${meta.opponent.abbreviation}`
            : "-",
        result: meta.gameResult ?? "-",
        stats: ev.stats,
      });
    }

    if (rows.length > 0) {
      md += `## ${title}\n\n`;
      md += `| Date | Opponent | | ${labels.join(" | ")} |\n`;
      md += `| --- | --- | --- | ${labels.map(() => "---").join(" | ")} |\n`;
      for (const row of rows) {
        md += `| ${row.date} | ${row.opp} | **${row.result}** | ${row.stats.join(" | ")} |\n`;
      }
    }
  } else if (gamelogData?.events) {
    // Fallback: game results only (no per-game stats available for this sport)
    const events = Object.values(gamelogData.events)
      .filter((e) => e.gameDate)
      .sort(
        (a, b) =>
          new Date(b.gameDate!).getTime() - new Date(a.gameDate!).getTime(),
      )
      .slice(0, 8);

    if (events.length > 0) {
      md += "## Recent Games\n\n";
      md += "| Date | Opponent | Result | Score |\n";
      md += "|------|----------|--------|-------|\n";
      for (const ev of events) {
        const date = formatDate(ev.gameDate!);
        const opp =
          ev.atVs && ev.opponent
            ? `${ev.atVs} ${ev.opponent.abbreviation}`
            : "-";
        const result = ev.gameResult ?? "-";
        const score = ev.score ?? "-";
        const note = ev.eventNote ? ` *(${ev.eventNote})*` : "";
        md += `| ${date} | ${opp}${note} | **${result}** | ${score} |\n`;
      }
    }
  }

  return md;
}

// ─── Player Detail ────────────────────────────────────────────────────────────

interface PlayerDetailProps {
  playerId: string;
  playerName: string;
  headshot?: string;
  sport: string;
  league: string;
  position?: string;
  jersey?: string;
  teamName?: string;
  espnUrl?: string;
}

function PlayerDetailView({
  playerId,
  playerName,
  headshot,
  sport,
  league,
  position,
  jersey,
  teamName,
  espnUrl,
}: PlayerDetailProps) {
  const base = `https://site.web.api.espn.com/apis/common/v3/sports/${sport}/${league}/athletes/${playerId}`;

  const { data: overviewData, isLoading: overviewLoading } =
    useFetch<OverviewResponse>(`${base}/overview`);

  const { data: gamelogData, isLoading: gamelogLoading } =
    useFetch<GamelogResponse>(`${base}/gamelog`);

  const markdown = buildPlayerMarkdown(
    { name: playerName, headshot, teamName, position, jersey, espnUrl },
    overviewData,
    gamelogData,
  );

  return (
    <Detail
      isLoading={overviewLoading || gamelogLoading}
      markdown={markdown}
      navigationTitle={playerName}
      actions={
        <ActionPanel>
          <Action.CreateQuicklink
            title="Create Quicklink"
            icon={Icon.Link}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            quicklink={quicklinkFor(playerName, {
              kind: "player",
              playerId,
              playerName,
              headshot,
              sport,
              league,
              teamName,
              espnUrl,
            })}
          />
          {espnUrl && (
            <Action.OpenInBrowser title="Open in ESPN" url={espnUrl} />
          )}
          {espnUrl && (
            <Action.CopyToClipboard
              title="Copy ESPN URL"
              content={espnUrl}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

// ─── Roster View ──────────────────────────────────────────────────────────────

function RosterView({
  team,
  sport,
  league,
}: {
  team: EspnTeam;
  sport: string;
  league: string;
}) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/teams/${team.id}/roster`;
  const { data, isLoading } = useFetch<RosterApiResponse>(url);
  const groups = extractRosterGroups(data?.athletes);

  function playerItem(player: RosterPlayer) {
    const link = player.links?.[0]?.href;
    return (
      <List.Item
        key={player.id}
        title={player.displayName}
        subtitle={player.position?.abbreviation}
        accessories={player.jersey ? [{ text: `#${player.jersey}` }] : []}
        icon={headshotIcon(player.headshot)}
        actions={
          <ActionPanel>
            <Action.Push
              title="View Player"
              icon={Icon.Person}
              target={
                <PlayerDetailView
                  playerId={player.id}
                  playerName={player.displayName}
                  headshot={player.headshot?.href}
                  sport={sport}
                  league={league}
                  position={player.position?.abbreviation}
                  jersey={player.jersey}
                  teamName={team.displayName}
                  espnUrl={link}
                />
              }
            />
            {link && <Action.OpenInBrowser title="Open in ESPN" url={link} />}
            {link && (
              <Action.CopyToClipboard
                title="Copy ESPN URL"
                content={link}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            )}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      navigationTitle={`${team.displayName} Roster`}
      isLoading={isLoading}
      searchBarPlaceholder="Filter players…"
    >
      {groups.map((group) =>
        group.section ? (
          <List.Section key={group.section} title={group.section}>
            {group.players.map(playerItem)}
          </List.Section>
        ) : (
          group.players.map(playerItem)
        ),
      )}
    </List>
  );
}

// ─── Team Detail ──────────────────────────────────────────────────────────────

interface TeamDetailProps {
  teamId: string;
  teamName: string;
  teamLogoUrl?: string;
  sport: string;
  league: string;
  espnUrl?: string;
}

function TeamDetailView({
  teamId,
  teamName,
  teamLogoUrl,
  sport,
  league,
  espnUrl,
}: TeamDetailProps) {
  const scheduleUrl = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/teams/${teamId}/schedule`;
  const { data, isLoading } = useFetch<ScheduleResponse>(scheduleUrl);

  // Soccer is split across competitions: a club's games live under its league
  // slug (e.g. eng.1) while national-team games are spread across many
  // competitions and only show up under the special "all" league — and the two
  // are mutually exclusive per team. Fetch both and merge so either case works.
  const isSoccer = sport === "soccer";
  const { data: allData, isLoading: allLoading } = useFetch<ScheduleResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/${teamId}/schedule`,
    { execute: isSoccer && league !== "all" },
  );

  const byId = new Map<string, ScheduleEvent>();
  for (const ev of [...(data?.events ?? []), ...(allData?.events ?? [])]) {
    byId.set(ev.id, ev);
  }
  const events = [...byId.values()];

  const markdown = buildTeamMarkdown(
    teamId,
    {
      name: teamName,
      logo: teamLogoUrl,
      record: data?.team?.recordSummary,
      standing: data?.team?.standingSummary,
      season: data?.season?.displayName,
      espnUrl,
    },
    events,
  );

  const rosterTeam: EspnTeam = {
    id: teamId,
    abbreviation: data?.team?.abbreviation ?? "",
    displayName: teamName,
    logos: teamLogoUrl ? [{ href: teamLogoUrl }] : undefined,
  };

  return (
    <Detail
      isLoading={isLoading || allLoading}
      markdown={markdown}
      navigationTitle={teamName}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Roster"
            icon={Icon.Person}
            target={
              <RosterView team={rosterTeam} sport={sport} league={league} />
            }
          />
          <Action.CreateQuicklink
            title="Create Quicklink"
            icon={Icon.Link}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            quicklink={quicklinkFor(teamName, {
              kind: "team",
              teamId,
              teamName,
              teamLogoUrl,
              sport,
              league,
              espnUrl,
            })}
          />
          {espnUrl && (
            <Action.OpenInBrowser title="Open Team in ESPN" url={espnUrl} />
          )}
          {espnUrl && (
            <Action.CopyToClipboard
              title="Copy ESPN URL"
              content={espnUrl}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

// ─── Main command ─────────────────────────────────────────────────────────────

function TeamSearchItem({ item }: { item: SearchContent }) {
  const numericId = uidId(item.uid, "t") ?? extractEspnId(item.link?.web);
  const sport = item.sport ?? "";
  const leagueSlug = item.defaultLeagueSlug ?? "";
  const canOpen = Boolean(numericId && sport && leagueSlug);

  const rosterTeam: EspnTeam = {
    id: numericId ?? "",
    abbreviation: "",
    displayName: item.displayName,
    logos: item.image?.default ? [{ href: item.image.default }] : undefined,
  };

  return (
    <List.Item
      title={item.displayName}
      subtitle={item.subtitle}
      icon={searchIcon(item)}
      actions={
        <ActionPanel>
          {canOpen && (
            <Action.Push
              title="View Team"
              icon={Icon.List}
              target={
                <TeamDetailView
                  teamId={numericId!}
                  teamName={item.displayName}
                  teamLogoUrl={item.image?.default}
                  sport={sport}
                  league={leagueSlug}
                  espnUrl={item.link?.web}
                />
              }
            />
          )}
          {canOpen && (
            <Action.Push
              title="View Roster"
              icon={Icon.Person}
              target={
                <RosterView
                  team={rosterTeam}
                  sport={sport}
                  league={leagueSlug}
                />
              }
            />
          )}
          {canOpen && (
            <Action.CreateQuicklink
              title="Create Quicklink"
              icon={Icon.Link}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              quicklink={quicklinkFor(item.displayName, {
                kind: "team",
                teamId: numericId!,
                teamName: item.displayName,
                teamLogoUrl: item.image?.default,
                sport,
                league: leagueSlug,
                espnUrl: item.link?.web,
              })}
            />
          )}
          {item.link?.web && (
            <Action.OpenInBrowser title="Open in ESPN" url={item.link.web} />
          )}
          {item.link?.web && (
            <Action.CopyToClipboard
              title="Copy ESPN URL"
              content={item.link.web}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function PlayerSearchItem({ item }: { item: SearchContent }) {
  const numericId = uidId(item.uid, "a") ?? extractEspnId(item.link?.web);
  const sport = item.sport ?? "";
  const leagueSlug = item.defaultLeagueSlug ?? "";
  const canOpen = Boolean(numericId && sport && leagueSlug);

  return (
    <List.Item
      title={item.displayName}
      subtitle={item.subtitle}
      icon={searchIcon(item)}
      actions={
        <ActionPanel>
          {canOpen && (
            <Action.Push
              title="View Player"
              icon={Icon.Person}
              target={
                <PlayerDetailView
                  playerId={numericId!}
                  playerName={item.displayName}
                  headshot={item.image?.default}
                  sport={sport}
                  league={leagueSlug}
                  teamName={item.subtitle}
                  espnUrl={item.link?.web}
                />
              }
            />
          )}
          {canOpen && (
            <Action.CreateQuicklink
              title="Create Quicklink"
              icon={Icon.Link}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              quicklink={quicklinkFor(item.displayName, {
                kind: "player",
                playerId: numericId!,
                playerName: item.displayName,
                headshot: item.image?.default,
                sport,
                league: leagueSlug,
                teamName: item.subtitle,
                espnUrl: item.link?.web,
              })}
            />
          )}
          {item.link?.web && (
            <Action.OpenInBrowser title="Open in ESPN" url={item.link.web} />
          )}
          {item.link?.web && (
            <Action.CopyToClipboard
              title="Copy ESPN URL"
              content={item.link.web}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

export default function SearchTeams(
  props: LaunchProps<{ launchContext?: SearchLaunchContext }>,
) {
  const context = props.launchContext;
  if (context?.kind === "team") {
    return (
      <TeamDetailView
        teamId={context.teamId}
        teamName={context.teamName}
        teamLogoUrl={context.teamLogoUrl}
        sport={context.sport}
        league={context.league}
        espnUrl={context.espnUrl}
      />
    );
  }
  if (context?.kind === "player") {
    return (
      <PlayerDetailView
        playerId={context.playerId}
        playerName={context.playerName}
        headshot={context.headshot}
        sport={context.sport}
        league={context.league}
        teamName={context.teamName}
        espnUrl={context.espnUrl}
      />
    );
  }

  return <SearchTeamsList />;
}

function SearchTeamsList() {
  const [searchText, setSearchText] = useState("");
  const isSearching = searchText.trim().length > 0;

  const searchUrl = `https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(searchText)}&limit=20`;

  const { data: searchData, isLoading } = useFetch<SearchApiResponse>(
    searchUrl,
    { execute: isSearching },
  );

  const searchTeams: SearchContent[] = [];
  const searchPlayers: SearchContent[] = [];
  for (const group of searchData?.results ?? []) {
    if (group.type === "team") searchTeams.push(...group.contents);
    else if (group.type === "player") searchPlayers.push(...group.contents);
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search teams and players across all sports…"
      onSearchTextChange={setSearchText}
      throttle
    >
      {!isSearching ? (
        <List.EmptyView
          title="Search ESPN"
          description="Type a team or player name to search across NFL, NBA, MLB, NHL, soccer, and more"
          icon={Icon.MagnifyingGlass}
        />
      ) : (
        <>
          {searchTeams.length > 0 && (
            <List.Section title="Teams" subtitle={String(searchTeams.length)}>
              {searchTeams.map((item) => (
                <TeamSearchItem key={item.id} item={item} />
              ))}
            </List.Section>
          )}

          {searchPlayers.length > 0 && (
            <List.Section
              title="Players"
              subtitle={String(searchPlayers.length)}
            >
              {searchPlayers.map((item) => (
                <PlayerSearchItem key={item.id} item={item} />
              ))}
            </List.Section>
          )}

          {!isLoading &&
            searchTeams.length === 0 &&
            searchPlayers.length === 0 && (
              <List.EmptyView
                title="No results"
                description={`Nothing found for "${searchText}"`}
                icon={Icon.MagnifyingGlass}
              />
            )}
        </>
      )}
    </List>
  );
}
