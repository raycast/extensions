import { Action, ActionPanel, Color, Icon, List, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ReactNode, useEffect, useState } from "react";
import type { Assets } from "./assets";
import {
  formatDateTime,
  formatDuration,
  formatKda,
  formatShortDateTime,
  percent,
  queueName,
  roleName,
  tierLabel,
  timeAgo,
} from "./format";
import { deleteFavorite, quicklinkFor, saveFavorite, syncFavorite } from "./favoriteStore";
import { favoriteFrom } from "./favorites";
import { GAME_TYPES } from "./gametypes";
import { rememberPlayer } from "./history";
import { defaultGameType, defaultPageSize, useApi, useAssets, useMatches, useProfile } from "./hooks";
import { MAX_MATCHES, SlimMatch, SlimParticipant, ordinal, participantOf, resultOf, summarize } from "./match";
import { MatchView } from "./match-view";
import { ParticipantView } from "./participant-view";
import { PlayerTarget, Profile, RANKED_QUEUES } from "./profile";
import { REGIONS } from "./regions";
import { LeagueEntryDto } from "./riot";
import { SummaryView } from "./summary-view";
import { RESULT_COLOR, RESULT_LABEL, describeError, profileLinks, winRateColor, winRateIcon } from "./ui";

/**
 * A player's page: ranked and recent win rates, then their last matches. Nothing splits the screen: every row that
 * has more to show opens it on a page of its own.
 *
 * `root` means this is the command's first screen (a full Riot ID or a favorite opened straight away). Raycast wants
 * the first screen to keep the command's own title, so only pages pushed on top of another one set a title.
 */
export function PlayerView({ target, root = false }: { target: PlayerTarget; root?: boolean }) {
  const api = useApi();
  const assets = useAssets();
  const gameType = defaultGameType();
  const typeInfo = GAME_TYPES[gameType];
  const profile = useProfile(api, target);
  // Starts at the "Games to Load" size every time the page opens; "Show More" raises it by that much.
  const pageSize = defaultPageSize();
  const [limit, setLimit] = useState(pageSize);
  const matches = useMatches(api, profile.data, gameType, limit);

  const me = profile.data;
  const navigationTitle = root ? undefined : me ? `${me.gameName}#${me.tagLine}` : "Player";
  const recent = matches.data?.matches ?? [];
  const summary = me ? summarize(recent, me.puuid) : undefined;
  const typeLabel = typeInfo.label ? `${typeInfo.label} ` : "";

  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!me) return;
    void rememberPlayer(me);
    // Also refreshes a favorite's saved name, icon, and level, and tells us whether this player is one.
    void syncFavorite(me).then(setIsFavorite);
  }, [me?.puuid]);

  const toggleFavorite = async () => {
    if (!me) return;
    const name = `${me.gameName}#${me.tagLine}`;
    if (isFavorite) {
      await deleteFavorite(me.puuid);
      setIsFavorite(false);
      await showToast({ style: Toast.Style.Success, title: "Removed from Favorites", message: name });
    } else {
      await saveFavorite(favoriteFrom(me));
      setIsFavorite(true);
      await showToast({ style: Toast.Style.Success, title: "Added to Favorites", message: name });
    }
  };

  const error = profile.error ?? matches.error;
  useEffect(() => {
    // A failed refresh must not hide data we already have.
    if (error && (me || matches.data)) void showFailureToast(error, { title: describeError(error).title });
  }, [error]);

  const reload = () => {
    profile.revalidate();
    matches.revalidate();
  };

  // Ignored while a load is running, so pressing Enter repeatedly cannot skip past what has not arrived yet.
  const nextLimit = Math.min(limit + pageSize, MAX_MATCHES);
  const showMore = () => {
    if (!matches.isLoading) setLimit(nextLimit);
  };

  if (profile.error && !me) {
    const info = describeError(profile.error);
    return (
      <List navigationTitle={navigationTitle}>
        <List.EmptyView
          icon={info.icon}
          title={info.title}
          description={info.description}
          actions={
            <ActionPanel>
              {info.isAuth && (
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              )}
              {info.isAuth && <Action.OpenInBrowser title="Get a Riot API Key" url="https://developer.riotgames.com" />}
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={profile.revalidate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const links = me ? profileLinks(me.gameName, me.tagLine, me.platform) : undefined;

  // Rows without a `primary` action of their own (profile, ranked) run the first action here on Enter, so it must be
  // a harmless one: Reload. Anything that copies, closes the window, or opens a browser goes after it.
  const actions = (primary?: ReactNode) => (
    <ActionPanel>
      {primary}
      <ActionPanel.Section>
        <Action
          title="Reload"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={reload}
        />
        {me && (
          <Action
            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            icon={isFavorite ? Icon.StarDisabled : Icon.Star}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            onAction={toggleFavorite}
          />
        )}
        <Action title="Change Game Type" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </ActionPanel.Section>
      {links && (
        <ActionPanel.Section>
          <Action.OpenInBrowser title="Open on OP.GG" url={links.opgg} />
          <Action.OpenInBrowser title="Open on U.GG" url={links.ugg} />
          {me && (
            <Action.CreateQuicklink
              title="Create Quicklink"
              icon={Icon.Link}
              quicklink={quicklinkFor(favoriteFrom(me))}
            />
          )}
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );

  // Enter opens the game's page (everyone in it, this player preselected); ⌘↵ opens just this player's stats.
  const matchItem = (match: SlimMatch, p: SlimParticipant, player: Profile) => {
    const result = resultOf(match, p);
    const queue = queueName(match.queueId, match.mode) + (p.placement ? ` · ${ordinal(p.placement)}` : "");

    return (
      <List.Item
        key={match.id}
        id={match.id}
        icon={assets.championIcon(p.championId)}
        title={assets.championName(p.championId, p.championName)}
        subtitle={`${p.kills}/${p.deaths}/${p.assists} · ${formatKda(p.kills, p.deaths, p.assists)} KDA`}
        keywords={[RESULT_LABEL[result], queue, roleName(p.role) ?? ""]}
        accessories={[
          { tag: { value: RESULT_LABEL[result], color: RESULT_COLOR[result] } },
          { text: queue },
          { icon: Icon.Clock, text: formatDuration(match.duration) },
          {
            text: formatShortDateTime(match.start),
            tooltip: `${formatDateTime(match.start)} (${timeAgo(match.start)})`,
          },
        ]}
        actions={actions(
          <ActionPanel.Section>
            <Action.Push
              title="View Match"
              icon={Icon.TwoPeople}
              target={<MatchView match={match} focusPuuid={player.puuid} />}
            />
            <Action.Push
              title="View Stats"
              icon={Icon.BarChart}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              target={<ParticipantView match={match} participant={p} />}
            />
            <Action.CopyToClipboard
              title="Copy Match ID"
              content={match.id}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>,
        )}
      />
    );
  };

  return (
    <List
      navigationTitle={navigationTitle}
      isLoading={profile.isLoading || matches.isLoading}
      searchBarPlaceholder="Filter matches by champion, queue, or result"
    >
      {me && (
        <List.Section title="Player">
          <List.Item
            id="profile"
            icon={assets.profileIcon(me.profileIconId)}
            title={me.gameName}
            subtitle={`#${me.tagLine}`}
            accessories={[
              ...(isFavorite
                ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "In your favorites" }]
                : []),
              { tag: `Level ${me.level}` },
              { text: REGIONS[me.platform].title },
            ]}
            actions={actions()}
          />
          {me.ranked.length > 0 ? (
            me.ranked.map((entry) => rankedItem(entry, assets, actions))
          ) : (
            <List.Item id="unranked" icon={Icon.Minus} title="Ranked" subtitle="Unranked" actions={actions()} />
          )}
          {summary && summary.games > 0 && (
            <List.Item
              id="summary"
              icon={winRateIcon(summary.winRate ?? 0)}
              title={`Last ${recent.length} ${typeLabel}Matches`}
              subtitle={`${summary.wins}W ${summary.losses}L`}
              accessories={[
                { tag: { value: `${percent(summary.winRate)} win rate`, color: winRateColor(summary.winRate ?? 0) } },
                { text: `${summary.kda.toFixed(2)} KDA` },
                { text: `${summary.csPerMin.toFixed(1)} CS/min` },
              ]}
              actions={actions(
                <Action.Push
                  title="View Recent Stats"
                  icon={Icon.BarChart}
                  target={<SummaryView profile={me} matches={recent} label={typeLabel} />}
                />,
              )}
            />
          )}
        </List.Section>
      )}

      <List.Section title="Recent Matches" subtitle={gameType === "all" ? undefined : typeInfo.title}>
        {me &&
          recent.map((match) => {
            const p = participantOf(match, me.puuid);
            return p ? matchItem(match, p, me) : null;
          })}
        {matches.data?.hasMore && (
          <List.Item
            id="show-more"
            icon={Icon.ArrowDown}
            title={`Show ${nextLimit - limit} More Games`}
            subtitle={matches.isLoading ? "Loading…" : `Showing ${recent.length}`}
            actions={actions(<Action title="Show More Games" icon={Icon.ArrowDown} onAction={showMore} />)}
          />
        )}
        {matches.data && matches.data.failed > 0 && (
          <List.Item
            id="partial"
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            title={`${matches.data.failed} ${matches.data.failed === 1 ? "match" : "matches"} couldn't be loaded`}
            subtitle={matches.data.reason}
            actions={actions()}
          />
        )}
        {matches.error && !matches.data && (
          <List.Item
            id="matches-error"
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            title={describeError(matches.error).title}
            subtitle={describeError(matches.error).description}
            actions={actions()}
          />
        )}
        {matches.data && matches.data.matches.length === 0 && matches.data.failed === 0 && (
          <List.Item
            id="no-matches"
            icon={Icon.Minus}
            title={gameType === "all" ? "No recent matches" : `No recent ${typeInfo.title} matches`}
            subtitle={gameType === "all" ? undefined : "Pick another Game Type in the extension preferences"}
            actions={actions()}
          />
        )}
      </List.Section>
    </List>
  );
}

function rankedItem(entry: LeagueEntryDto, assets: Assets, actions: () => ReactNode) {
  const games = entry.wins + entry.losses;
  const winRate = games ? entry.wins / games : 0;
  return (
    <List.Item
      key={entry.queueType}
      id={`ranked-${entry.queueType}`}
      icon={assets.tierEmblem(entry.tier)}
      title={RANKED_QUEUES[entry.queueType]}
      subtitle={`${tierLabel(entry.tier, entry.rank)} · ${entry.leaguePoints} LP`}
      accessories={[
        ...(entry.hotStreak ? [{ tag: { value: "Win streak", color: Color.Orange } }] : []),
        { text: `${entry.wins}W ${entry.losses}L` },
        { tag: { value: `${percent(winRate)} win rate`, color: winRateColor(winRate) } },
      ]}
      actions={actions()}
    />
  );
}
