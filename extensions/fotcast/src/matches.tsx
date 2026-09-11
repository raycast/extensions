import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  LaunchType,
  List,
  launchCommand,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { MatchDetailView } from "./detail";
import {
  fetchMatches,
  leagueLogo,
  leagueUrl,
  matchUrl,
  teamCrest,
  teamUrl,
  type Match,
} from "./fotmob";
import {
  buildSections,
  dateKey,
  dayLabel,
  favoriteLeagueEntry,
  hasFavoriteTeam,
  leagueTitle,
  shiftDay,
  sortLeagues,
  statusOf,
  type Mode,
  type SectionMatch,
} from "./schedule";
import { toggleFavorite, useFavorites } from "./store";

// Footer: "Today · Thu, Sep 10"; a plain date label is already complete.
function footerTitle(date: Date): string {
  const label = dayLabel(date);
  const short = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return /^(Today|Tomorrow|Yesterday)$/.test(label)
    ? `${label} · ${short}`
    : label;
}

// Blank 32×32 PNG so the star column keeps its width on non-favorite rows.
const BLANK_ICON = {
  source:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAGklEQVR42u3BAQEAAACCIP+vbkhAAQAAAO8GECAAAcm1w7EAAAAASUVORK5CYII=",
};

function title(m: Match): string {
  return `${m.home.name} vs ${m.away.name}`;
}

// Finished-match badge colour: green win, red loss, grey draw. Judged from
// your club's side when exactly one favorite is playing, else the home side.
function resultColor(m: Match, isTeam: (id: number) => boolean): Color {
  const homeFav = isTeam(m.home.id);
  const awayFav = isTeam(m.away.id);
  const fromHome = homeFav === awayFav || homeFav;
  const margin = (m.home.score - m.away.score) * (fromHome ? 1 : -1);
  if (margin > 0) return Color.Green;
  if (margin < 0) return Color.Red;
  return Color.SecondaryText;
}

// Plain-text subtitle after the title: local kickoff time before the match,
// then the game clock or end state once it starts.
function subtitle(m: Match): string {
  switch (statusOf(m)) {
    case "live":
      return (m.status.liveTime?.short ?? "LIVE").replace(/\u200e/g, "");
    case "finished":
      return m.status.reason?.short ?? "FT";
    case "cancelled":
      return m.status.reason?.short ?? "PP";
    default:
      return new Date(m.status.utcTime).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
  }
}

// Mathematical monospace digits (U+1D7F6…) so every score badge is the same
// width; Raycast's tag font has proportional figures and no tnum switch.
const mono = (n: number) =>
  String(n).replace(/\d/g, (d) => String.fromCodePoint(0x1d7f6 + Number(d)));

// Score badge between the crests. Before kickoff a narrow dash holds the slot.
function scoreAccessory(
  m: Match,
  isTeam: (id: number) => boolean,
): List.Item.Accessory {
  const { aggregatedStr, reason } = m.status;
  const tooltip = aggregatedStr
    ? `Agg. ${aggregatedStr.replace(" - ", " – ")}`
    : null;
  const score = `${mono(m.home.score)} – ${mono(m.away.score)}`;
  switch (statusOf(m)) {
    case "live":
      return { tag: { value: score, color: Color.SecondaryText }, tooltip };
    case "finished":
      return { tag: { value: score, color: resultColor(m, isTeam) }, tooltip };
    case "cancelled":
      return {
        tag: { value: reason?.short ?? "PP", color: Color.SecondaryText },
      };
    default:
      return { tag: { value: "–", color: Color.SecondaryText } };
  }
}

type DayProps = { date: Date; setDate: (d: Date) => void };
function DayActions({ date, setDate }: DayProps) {
  return (
    <ActionPanel.Section title="Day">
      <Action
        title="Next Day"
        icon={Icon.ChevronRight}
        shortcut={shortcut("]")}
        onAction={() => setDate(shiftDay(date, 1))}
      />
      <Action
        title="Previous Day"
        icon={Icon.ChevronLeft}
        shortcut={shortcut("[")}
        onAction={() => setDate(shiftDay(date, -1))}
      />
      <Action
        title="Today"
        icon={Icon.Calendar}
        shortcut={shortcut("t")}
        onAction={() => setDate(new Date())}
      />
      <Action.PickDate
        title="Pick Date"
        type={Action.PickDate.Type.Date}
        shortcut={shortcut("d", true)}
        onChange={(d) => d && setDate(d)}
      />
    </ActionPanel.Section>
  );
}

// Raycast lints ambiguous shortcuts on Windows-capable extensions; cmd -> ctrl.
function shortcut(
  key: Keyboard.KeyEquivalent,
  shift = false,
): Keyboard.Shortcut {
  return {
    macOS: { modifiers: shift ? ["shift", "cmd"] : ["cmd"], key },
    Windows: { modifiers: shift ? ["shift", "ctrl"] : ["ctrl"], key },
  };
}

type RowProps = {
  item: SectionMatch;
  showStar: boolean;
  favs: ReturnType<typeof useFavorites>;
  date: Date;
  setDate: (d: Date) => void;
  revalidate: () => void;
};

function MatchRow({
  item,
  showStar,
  favs,
  date,
  setDate,
  revalidate,
}: RowProps) {
  const { match, league } = item;
  const { favorites, isTeam, toggleTeam, toggleLeague } = favs;

  const teamAction = (team: Match["home"]) => {
    const on = isTeam(team.id);
    return (
      <Action
        title={`${on ? "Unfavorite" : "Favorite"} ${team.name}`}
        icon={on ? Icon.StarDisabled : Icon.Star}
        onAction={() =>
          toggleFavorite(on, team.name, () =>
            toggleTeam({
              id: team.id,
              name: team.name,
              leagueName: league.name,
            }),
          )
        }
      />
    );
  };

  // Match buildSections' favorite check (primaryId or parentLeagueId) so a
  // league favorited by parent ID doesn't show "Favorite" here and create a
  // duplicate entry keyed by primaryId when toggled.
  const favLeagueEntry = favoriteLeagueEntry(league, favorites);
  const leagueFav = favLeagueEntry != null;

  return (
    <List.Item
      title={title(match)}
      subtitle={subtitle(match)}
      keywords={[league.name, league.ccode]}
      accessories={[
        { icon: teamCrest(match.home.id) },
        scoreAccessory(match, isTeam),
        { icon: teamCrest(match.away.id) },
        { icon: showStar ? Icon.Star : BLANK_ICON },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Details"
            icon={Icon.SoccerBall}
            target={<MatchDetailView match={match} league={league} />}
          />
          <Action.OpenInBrowser
            title="Open in FotMob"
            url={matchUrl(match.id)}
          />

          <ActionPanel.Section title="Favorites">
            {teamAction(match.home)}
            {teamAction(match.away)}
            <Action
              title={`${leagueFav ? "Unfavorite" : "Favorite"} ${league.name}`}
              icon={leagueFav ? Icon.StarDisabled : Icon.Star}
              onAction={() =>
                toggleFavorite(leagueFav, league.name, () =>
                  toggleLeague({
                    id: favLeagueEntry?.id ?? league.primaryId,
                    name: league.name,
                    ccode: league.ccode,
                  }),
                )
              }
            />
          </ActionPanel.Section>

          <DayActions date={date} setDate={setDate} />

          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />

          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open League in FotMob"
              url={leagueUrl(league.primaryId)}
            />
            <Action.OpenInBrowser
              title={`Open ${match.home.name} in FotMob`}
              url={teamUrl(match.home.id)}
            />
            <Action.OpenInBrowser
              title={`Open ${match.away.name} in FotMob`}
              url={teamUrl(match.away.id)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [date, setDate] = useState(new Date());
  const [filter, setFilter] = useState<string>("all");
  const favs = useFavorites();

  const { data, isLoading, revalidate } = useCachedPromise(
    fetchMatches,
    [dateKey(date)],
    {
      keepPreviousData: true,
      onError: (error) => {
        showFailureToast(error, { title: "Could not load matches" });
      },
    },
  );

  const leagues = data ?? [];
  const live = leagues.some((l) =>
    l.matches.some((m) => statusOf(m) === "live"),
  );

  useEffect(() => {
    if (!live) return;
    const timer = setInterval(revalidate, 60_000);
    return () => clearInterval(timer);
  }, [live, revalidate]);

  const dropdownLeagues = sortLeagues([
    ...new Map(leagues.map((l) => [l.primaryId, l])).values(),
  ]);

  const leagueMatch = filter.startsWith("league:")
    ? Number(filter.slice("league:".length))
    : null;
  const filteredLeagues = leagues.filter((l) => l.primaryId === leagueMatch);
  // A stored league that isn't playing today falls back to "all" instead of
  // rendering an empty list.
  const mode: Mode = leagueMatch !== null ? "all" : (filter as Mode);
  const sections = buildSections(
    filteredLeagues.length > 0 ? filteredLeagues : leagues,
    favs.favorites,
    mode,
  );
  const noFavorites =
    favs.favorites.teams.length === 0 && favs.favorites.leagues.length === 0;

  return (
    <List
      isLoading={isLoading || favs.isLoading}
      navigationTitle={footerTitle(date)}
      searchBarPlaceholder="Search teams or leagues…"
      searchBarAccessory={
        <List.Dropdown tooltip="Leagues" storeValue onChange={setFilter}>
          <List.Dropdown.Item title="All Leagues" value="all" />
          <List.Dropdown.Item title="Favorites" value="favorites" />
          <List.Dropdown.Section title="Leagues">
            {dropdownLeagues.map((l) => (
              <List.Dropdown.Item
                key={l.primaryId}
                title={leagueTitle(l)}
                value={`league:${l.primaryId}`}
                icon={leagueLogo(l.primaryId)}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filter === "favorites" && noFavorites ? (
        <List.EmptyView
          icon={Icon.Star}
          title="No favorites yet"
          actions={
            <ActionPanel>
              <Action
                title="Manage Favorites"
                icon={Icon.Star}
                onAction={() =>
                  launchCommand({
                    name: "favorites",
                    type: LaunchType.UserInitiated,
                  })
                }
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.SoccerBall}
          title="No matches"
          actions={
            <ActionPanel>
              <Action.PickDate
                title="Pick Date"
                type={Action.PickDate.Type.Date}
                onChange={(d) => d && setDate(d)}
              />
              <DayActions date={date} setDate={setDate} />
            </ActionPanel>
          }
        />
      )}
      {sections.map((section) => (
        <List.Section key={section.key} title={section.title}>
          {section.matches.map((item) => (
            <MatchRow
              key={`${section.key}:${item.match.id}`}
              item={item}
              showStar={
                section.key !== "teams" &&
                hasFavoriteTeam(item.match, favs.favorites)
              }
              favs={favs}
              date={date}
              setDate={setDate}
              revalidate={revalidate}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
