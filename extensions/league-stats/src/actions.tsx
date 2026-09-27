import { Action, ActionPanel, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { saveFavorite } from "./favoriteStore";
import { SlimMatch, SlimParticipant, canOpenPlayer, displayName, riotId } from "./match";
import { PlayerView } from "./player-view";
import { profileLinks } from "./ui";

/** Opens another player's own page, on the platform this match was played on. Bots and hidden accounts have none. */
export function viewPlayerAction(match: SlimMatch, p: SlimParticipant, shortcut?: Keyboard.Shortcut) {
  if (!canOpenPlayer(p)) return null;
  return (
    <Action.Push
      title="View Player Page"
      icon={Icon.Person}
      shortcut={shortcut}
      target={
        <PlayerView target={{ puuid: p.puuid, gameName: p.gameName, tagLine: p.tagLine, platform: match.platform }} />
      }
    />
  );
}

/** Saves someone from a match. Their icon and level are unknown here; they are filled in when their page loads. */
async function addToFavorites(match: SlimMatch, p: SlimParticipant) {
  const isNew = await saveFavorite({
    puuid: p.puuid,
    gameName: displayName(p),
    tagLine: p.tagLine,
    platform: match.platform,
  });
  await showToast({
    style: Toast.Style.Success,
    title: isNew ? "Added to Favorites" : "Already in Favorites",
    message: riotId(p) ?? displayName(p),
  });
}

export function linkActions(match: SlimMatch, p: SlimParticipant) {
  const id = riotId(p);
  const links = match.platform && id ? profileLinks(p.gameName, p.tagLine, match.platform) : undefined;
  return (
    <ActionPanel.Section>
      {canOpenPlayer(p) && (
        <Action
          title="Add to Favorites"
          icon={Icon.Star}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          onAction={() => addToFavorites(match, p)}
        />
      )}
      {id && <Action.CopyToClipboard title="Copy Riot ID" content={id} />}
      {links && <Action.OpenInBrowser title="Open on OP.GG" url={links.opgg} />}
      {links && <Action.OpenInBrowser title="Open on U.GG" url={links.ugg} />}
      <Action.CopyToClipboard title="Copy Match ID" content={match.id} />
    </ActionPanel.Section>
  );
}
