import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";
import {
  BASE_URL,
  CommandCenterGame,
  CommandCenterResponse,
  GameHit,
  OddsEvent,
  SearchResponse,
  dedupeGames,
  formatAmerican,
  getApiKey,
  normalizeTeam,
} from "./api";

export default function SearchOddsCommand() {
  const [searchText, setSearchText] = useState("");
  const query = searchText.trim();

  const { isLoading, data } = useFetch<SearchResponse>(
    `${BASE_URL}/live/api/search?q=${encodeURIComponent(query)}&limit=25`,
    {
      execute: query.length >= 2,
      keepPreviousData: true,
    },
  );

  // Only render results while the query is one we actually search for.
  // `keepPreviousData` is here to stop the list flashing empty between
  // keystrokes, but it also retains the last response when `execute` goes
  // false -- and once it is false no fetch will ever reconcile it, so
  // clearing the search bar left the previous matchups on screen and still
  // actionable. Gating on the same condition as `execute` keeps the
  // anti-flicker behaviour while tying what is shown to what was asked.
  const games = useMemo(() => (query.length >= 2 ? dedupeGames(data?.results ?? []) : []), [data, query]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search a team or matchup, e.g. Yankees"
      onSearchTextChange={setSearchText}
      throttle
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={query.length >= 2 ? "No matchups found" : "Search live odds"}
        description={
          query.length >= 2
            ? "Try another team name or league"
            : "Type a team name to find upcoming games and the best available lines"
        }
      />
      {games.map((game) => (
        <List.Item
          key={`${game.sportKey}-${game.homeTeam}-${game.awayTeam}`}
          icon={Icon.LineChart}
          title={`${game.awayTeam} @ ${game.homeTeam}`}
          subtitle={game.sportTitle}
          accessories={game.commenceTime ? [{ date: game.commenceTime, tooltip: "Start time" }] : []}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.BullsEye} title="Show Best Lines" target={<GameLines game={game} />} />
              <Action.OpenInBrowser title="Open Live Dashboard" url={`${BASE_URL}/live`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function GameLines({ game }: { game: GameHit }) {
  const apiKey = getApiKey();
  return apiKey ? <FullOddsBoard game={game} apiKey={apiKey} /> : <ConsensusBestLines game={game} />;
}

/** Keyless view: best available moneyline per side from the public live command center. */
function ConsensusBestLines({ game }: { game: GameHit }) {
  const { isLoading, data } = useFetch<CommandCenterResponse>(
    `${BASE_URL}/live/api/command_center?sport=${encodeURIComponent(game.sportKey)}&limit=100`,
  );

  const match = useMemo(() => findGame(data?.games ?? [], game), [data, game]);

  const markdown = useMemo(() => {
    if (!data) return "";
    if (!match) {
      return [
        `# ${game.awayTeam} @ ${game.homeTeam}`,
        "",
        "This matchup is not in the live consensus feed right now. The keyless feed tracks games close to start time.",
        "",
        "Add a free ParlayAPI key in the extension preferences to pull the full pre-game odds board for any listed game (moneyline, spreads, and totals from every tracked book).",
      ].join("\n");
    }
    return consensusMarkdown(match);
  }, [data, match, game]);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${game.awayTeam} @ ${game.homeTeam}`}
      markdown={markdown}
      metadata={
        match ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title={`${match.home_team} (home)`}
              text={`${formatAmerican(match.best_home.price)} at ${match.best_home.bookmaker}`}
            />
            <Detail.Metadata.Label
              title={`${match.away_team} (away)`}
              text={`${formatAmerican(match.best_away.price)} at ${match.best_away.bookmaker}`}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Books tracked" text={`${match.book_count}`} />
            <Detail.Metadata.Label title="Best vs worst gap" text={`${match.max_gap_cents} cents`} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {match && (
            <Action.OpenInBrowser
              title="Open Live Game Page"
              url={`${BASE_URL}/live/game/${encodeURIComponent(match.event_id)}`}
            />
          )}
          {match && (
            <Action.CopyToClipboard
              title="Copy Best Lines"
              content={`${match.away_team} @ ${match.home_team}: home ${formatAmerican(match.best_home.price)} (${match.best_home.bookmaker}), away ${formatAmerican(match.best_away.price)} (${match.best_away.bookmaker})`}
            />
          )}
          <Action.OpenInBrowser title="Get a Free API Key" url={`${BASE_URL}/signup`} icon={Icon.Key} />
        </ActionPanel>
      }
    />
  );
}

function findGame(games: CommandCenterGame[], target: GameHit): CommandCenterGame | undefined {
  const home = normalizeTeam(target.homeTeam);
  const away = normalizeTeam(target.awayTeam);
  return games.find((g) => {
    const gh = normalizeTeam(g.home_team);
    const ga = normalizeTeam(g.away_team);
    return (gh.includes(home) || home.includes(gh)) && (ga.includes(away) || away.includes(ga));
  });
}

function consensusMarkdown(g: CommandCenterGame): string {
  const lines: string[] = [];
  lines.push(`# ${g.away_team} @ ${g.home_team}`);
  const start = new Date(g.commence_time);
  const when = Number.isNaN(start.getTime()) ? "" : ` · Starts ${start.toLocaleString()}`;
  lines.push(`${g.sport_title}${when}`);
  lines.push("");
  lines.push("## Best available moneyline");
  lines.push("");
  lines.push("| Side | Price | Book |");
  lines.push("| --- | --- | --- |");
  lines.push(`| ${g.home_team} | **${formatAmerican(g.best_home.price)}** | ${g.best_home.bookmaker} |`);
  lines.push(`| ${g.away_team} | **${formatAmerican(g.best_away.price)}** | ${g.best_away.bookmaker} |`);
  lines.push("");
  lines.push("## Moneyline by book");
  lines.push("");
  lines.push(`| Book | ${g.home_team} | ${g.away_team} |`);
  lines.push("| --- | --- | --- |");
  const homeByBook = new Map(g.best_home.alternatives.map((a) => [a.bookmaker, a.price]));
  const awayByBook = new Map(g.best_away.alternatives.map((a) => [a.bookmaker, a.price]));
  const books = Array.from(new Set([...homeByBook.keys(), ...awayByBook.keys()]));
  for (const book of books) {
    const h = homeByBook.get(book);
    const a = awayByBook.get(book);
    lines.push(
      `| ${book} | ${h === undefined ? "" : formatAmerican(h)} | ${a === undefined ? "" : formatAmerican(a)} |`,
    );
  }
  lines.push("");
  lines.push("Live consensus feed, freshest quotes only. Stale and outlier quotes are filtered out.");
  return lines.join("\n");
}

/** Keyed view: full pre-game odds board (h2h, spreads, totals) from /v1/sports/{sport}/odds. */
function FullOddsBoard({ game, apiKey }: { game: GameHit; apiKey: string }) {
  const { isLoading, data } = useFetch<OddsEvent[]>(
    `${BASE_URL}/v1/sports/${encodeURIComponent(game.sportKey)}/odds?markets=h2h,spreads,totals&oddsFormat=american&dateFormat=iso`,
    { headers: { "X-API-Key": apiKey } },
  );

  const event = useMemo(() => {
    if (!Array.isArray(data)) return undefined;
    const home = normalizeTeam(game.homeTeam);
    const away = normalizeTeam(game.awayTeam);
    return data.find((e) => {
      const eh = normalizeTeam(e.home_team ?? "");
      const ea = normalizeTeam(e.away_team ?? "");
      return (eh.includes(home) || home.includes(eh)) && (ea.includes(away) || away.includes(ea));
    });
  }, [data, game]);

  const markdown = useMemo(() => {
    if (!data) return "";
    if (!event) {
      return [
        `# ${game.awayTeam} @ ${game.homeTeam}`,
        "",
        "No pre-game odds board found for this matchup right now. It may have already started or been settled.",
      ].join("\n");
    }
    return fullBoardMarkdown(event);
  }, [data, event, game]);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${game.awayTeam} @ ${game.homeTeam}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Documentation" url={`${BASE_URL}/docs`} />
          {event && <Action.CopyToClipboard title="Copy Event ID" content={event.id} />}
        </ActionPanel>
      }
    />
  );
}

function fullBoardMarkdown(e: OddsEvent): string {
  const lines: string[] = [];
  lines.push(`# ${e.away_team} @ ${e.home_team}`);
  const start = new Date(e.commence_time);
  if (!Number.isNaN(start.getTime())) lines.push(`Starts ${start.toLocaleString()}`);

  const sections: { key: string; title: string }[] = [
    { key: "h2h", title: "Moneyline" },
    { key: "spreads", title: "Spread" },
    { key: "totals", title: "Total" },
  ];

  for (const section of sections) {
    const rows: string[] = [];
    let headerCols: string[] | undefined;
    for (const book of e.bookmakers ?? []) {
      const market = (book.markets ?? []).find((m) => m.key === section.key);
      if (!market || market.outcomes.length === 0) continue;
      if (!headerCols) headerCols = market.outcomes.map((o) => o.name);
      const cells = headerCols.map((name) => {
        const o = market.outcomes.find((x) => x.name === name) ?? market.outcomes[0];
        const point = o.point !== undefined ? `${o.point > 0 && section.key === "spreads" ? "+" : ""}${o.point} ` : "";
        return `${point}${formatAmerican(o.price)}`;
      });
      rows.push(`| ${book.title} | ${cells.join(" | ")} |`);
    }
    if (rows.length > 0 && headerCols) {
      lines.push("");
      lines.push(`## ${section.title}`);
      lines.push("");
      lines.push(`| Book | ${headerCols.join(" | ")} |`);
      lines.push(`| --- | ${headerCols.map(() => "---").join(" | ")} |`);
      lines.push(...rows);
    }
  }

  return lines.join("\n");
}
